const express = require('express');
const pool = require('../db');
const { authenticateToken, authorizeRole, authorizeAnyRole } = require('../middleware/auth');
const router = express.Router();
const ALLOWED_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED'];
const ALLOWED_PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'];
const SLA_TARGET_HOURS = {
  HIGH: 4,
  MEDIUM: 8,
  LOW: 24
};

const parseDateInput = (value) => {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const trimmed = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const date = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  if (date.toISOString().slice(0, 10) !== trimmed) return null;
  return trimmed;
};

const parsePositiveInteger = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
};

const parseCount = (value) => Number.parseInt(value, 10) || 0;
const parseNullableNumber = (value) => (value === null || value === undefined ? null : Number(value));

// GET /api/stats - Dashboard Stats (admin and agent)
router.get('/', authenticateToken, authorizeAnyRole('ADMIN', 'AGENT'), async (req, res) => {
  const stats = {};

  try {
    // 1. Total Open Tickets
    const openTicketsRes = await pool.query("SELECT COUNT(*) as count FROM tickets WHERE status = 'OPEN'");
    stats.total_open = parseInt(openTicketsRes.rows[0].count, 10);

    // 2. Total Users
    const usersRes = await pool.query("SELECT COUNT(*) as count FROM users");
    stats.total_users = parseInt(usersRes.rows[0].count, 10);

    // 3. Total Tickets (Queries)
    const totalTicketsRes = await pool.query("SELECT COUNT(*) as count FROM tickets");
    stats.total_tickets = parseInt(totalTicketsRes.rows[0].count, 10);

    // 4. Today's Tickets (Queries)
    const todayTicketsRes = await pool.query("SELECT COUNT(*) as count FROM tickets WHERE created_at >= CURRENT_DATE");
    stats.today_tickets = parseInt(todayTicketsRes.rows[0].count, 10);

    // 5. Staff Workload
    const sql = `
      SELECT u.name, 
             SUM(CASE WHEN t.status IN ('OPEN', 'IN_PROGRESS') THEN 1 ELSE 0 END) as active_tickets,
             SUM(CASE WHEN t.status = 'RESOLVED' THEN 1 ELSE 0 END) as resolved_tickets
      FROM users u
      LEFT JOIN tickets t ON u.id = t.assignee_id
      WHERE u.role IN ('ADMIN', 'AGENT')
      GROUP BY u.id, u.name
    `;
    
    const staffStatsRes = await pool.query(sql);
    stats.staff_stats = staffStatsRes.rows.map(row => ({
      name: row.name,
      active_tickets: parseInt(row.active_tickets || 0, 10),
      resolved_tickets: parseInt(row.resolved_tickets || 0, 10)
    }));
    
    res.json(stats);
  } catch (err) {
    console.error('Load dashboard stats failed:', err);
    res.status(500).json({ message: 'Failed to load stats' });
  }
});

// GET /api/stats/reports - Detailed Reports Data
router.get('/reports', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
  try {
    const {
      start_date: startDateRaw,
      end_date: endDateRaw,
      status: statusRaw,
      priority: priorityRaw,
      assignee_id: assigneeIdRaw,
      category_id: categoryIdRaw
    } = req.query;

    const status = statusRaw ? String(statusRaw).trim().toUpperCase() : null;
    if (status && !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid status filter' });
    }

    const priority = priorityRaw ? String(priorityRaw).trim().toUpperCase() : null;
    if (priority && !ALLOWED_PRIORITIES.includes(priority)) {
      return res.status(400).json({ message: 'Invalid priority filter' });
    }

    const startDate = parseDateInput(startDateRaw);
    if (startDateRaw && !startDate) {
      return res.status(400).json({ message: 'start_date must be in YYYY-MM-DD format' });
    }

    const endDate = parseDateInput(endDateRaw);
    if (endDateRaw && !endDate) {
      return res.status(400).json({ message: 'end_date must be in YYYY-MM-DD format' });
    }

    if (startDate && endDate && startDate > endDate) {
      return res.status(400).json({ message: 'start_date cannot be later than end_date' });
    }

    let assigneeFilter = null;
    if (assigneeIdRaw !== undefined && assigneeIdRaw !== null && String(assigneeIdRaw).trim() !== '') {
      if (String(assigneeIdRaw).trim().toLowerCase() === 'unassigned') {
        assigneeFilter = 'unassigned';
      } else {
        const parsedAssigneeId = parsePositiveInteger(assigneeIdRaw);
        if (!parsedAssigneeId) {
          return res.status(400).json({ message: 'assignee_id must be a positive integer or "unassigned"' });
        }
        assigneeFilter = parsedAssigneeId;
      }
    }

    const categoryId = categoryIdRaw ? parsePositiveInteger(categoryIdRaw) : null;
    if (categoryIdRaw && !categoryId) {
      return res.status(400).json({ message: 'category_id must be a positive integer' });
    }

    const whereClauses = [];
    const params = [];

    if (startDate) {
      params.push(startDate);
      whereClauses.push(`t.created_at >= $${params.length}::date`);
    }

    if (endDate) {
      params.push(endDate);
      whereClauses.push(`t.created_at < ($${params.length}::date + INTERVAL '1 day')`);
    }

    if (status) {
      params.push(status);
      whereClauses.push(`t.status = $${params.length}`);
    }

    if (priority) {
      params.push(priority);
      whereClauses.push(`t.priority = $${params.length}`);
    }

    if (assigneeFilter === 'unassigned') {
      whereClauses.push('t.assignee_id IS NULL');
    } else if (assigneeFilter) {
      params.push(assigneeFilter);
      whereClauses.push(`t.assignee_id = $${params.length}`);
    }

    if (categoryId) {
      params.push(categoryId);
      whereClauses.push(`t.category_id = $${params.length}`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [
      summaryRes,
      statusRes,
      priorityRes,
      timeRes,
      categoryRes,
      kpiRes,
      assigneeOptionsRes,
      categoryOptionsRes
    ] = await Promise.all([
      pool.query(
        `
          SELECT
            COUNT(*)::int AS total_tickets,
            COUNT(*) FILTER (WHERE t.status = 'OPEN')::int AS open_tickets,
            COUNT(*) FILTER (WHERE t.status = 'IN_PROGRESS')::int AS in_progress_tickets,
            COUNT(*) FILTER (WHERE t.status = 'RESOLVED')::int AS resolved_tickets
          FROM tickets t
          ${whereSql}
        `,
        params
      ),
      pool.query(
        `
          SELECT t.status, COUNT(*)::int AS count
          FROM tickets t
          ${whereSql}
          GROUP BY t.status
          ORDER BY CASE t.status
            WHEN 'OPEN' THEN 1
            WHEN 'IN_PROGRESS' THEN 2
            WHEN 'RESOLVED' THEN 3
            ELSE 4
          END
        `,
        params
      ),
      pool.query(
        `
          SELECT t.priority, COUNT(*)::int AS count
          FROM tickets t
          ${whereSql}
          GROUP BY t.priority
          ORDER BY CASE t.priority
            WHEN 'HIGH' THEN 1
            WHEN 'MEDIUM' THEN 2
            WHEN 'LOW' THEN 3
            ELSE 4
          END
        `,
        params
      ),
      pool.query(
        `
          SELECT TO_CHAR(DATE(t.created_at), 'YYYY-MM-DD') AS date, COUNT(*)::int AS count
          FROM tickets t
          ${whereSql}
          GROUP BY DATE(t.created_at)
          ORDER BY DATE(t.created_at)
        `,
        params
      ),
      pool.query(
        `
          SELECT COALESCE(c.name, 'Uncategorized') AS category, COUNT(*)::int AS count
          FROM tickets t
          LEFT JOIN ticket_categories c ON c.id = t.category_id
          ${whereSql}
          GROUP BY COALESCE(c.name, 'Uncategorized')
          ORDER BY COUNT(*) DESC, category
        `,
        params
      ),
      pool.query(
        `
          WITH filtered_tickets AS (
            SELECT
              t.id,
              t.status,
              t.priority,
              t.created_at,
              t.closed_at
            FROM tickets t
            ${whereSql}
          ),
          first_response AS (
            SELECT
              t.id AS ticket_id,
              MIN(h.created_at) AS first_response_at
            FROM filtered_tickets t
            LEFT JOIN ticket_history h
              ON h.ticket_id = t.id
             AND h.action IN ('STATUS_CHANGE', 'ASSIGNEE_CHANGE')
            GROUP BY t.id
          ),
          resolved_events AS (
            SELECT
              t.id AS ticket_id,
              COALESCE(t.closed_at, MIN(h.created_at)) AS resolved_at
            FROM filtered_tickets t
            LEFT JOIN ticket_history h
              ON h.ticket_id = t.id
             AND h.action = 'STATUS_CHANGE'
             AND h.new_value = 'RESOLVED'
            GROUP BY t.id, t.closed_at
          ),
          ticket_flags AS (
            SELECT
              t.id AS ticket_id,
              (
                t.status = 'RESOLVED'
                OR EXISTS (
                  SELECT 1
                  FROM ticket_history h_resolved
                  WHERE h_resolved.ticket_id = t.id
                    AND h_resolved.action = 'STATUS_CHANGE'
                    AND h_resolved.new_value = 'RESOLVED'
                )
              ) AS has_ever_resolved,
              EXISTS (
                SELECT 1
                FROM ticket_history h_reopen
                WHERE h_reopen.ticket_id = t.id
                  AND h_reopen.action = 'STATUS_CHANGE'
                  AND h_reopen.old_value = 'RESOLVED'
                  AND h_reopen.new_value IN ('OPEN', 'IN_PROGRESS')
              ) AS reopened
            FROM filtered_tickets t
          )
          SELECT
            ROUND(
              AVG(
                CASE
                  WHEN fr.first_response_at IS NOT NULL AND fr.first_response_at >= t.created_at
                  THEN EXTRACT(EPOCH FROM (fr.first_response_at - t.created_at)) / 3600.0
                  ELSE NULL
                END
              )::numeric,
              2
            ) AS first_response_hours_avg,
            ROUND(
              AVG(
                CASE
                  WHEN re.resolved_at IS NOT NULL AND re.resolved_at >= t.created_at
                  THEN EXTRACT(EPOCH FROM (re.resolved_at - t.created_at)) / 3600.0
                  ELSE NULL
                END
              )::numeric,
              2
            ) AS resolution_hours_avg,
            ROUND(
              AVG(
                CASE
                  WHEN t.status IN ('OPEN', 'IN_PROGRESS')
                  THEN EXTRACT(EPOCH FROM (NOW() - t.created_at)) / 3600.0
                  ELSE NULL
                END
              )::numeric,
              2
            ) AS backlog_age_hours_avg,
            COUNT(*) FILTER (WHERE tf.reopened)::int AS reopened_tickets,
            COUNT(*) FILTER (WHERE tf.has_ever_resolved)::int AS ever_resolved_tickets,
            COUNT(*) FILTER (
              WHERE CASE t.priority
                WHEN 'HIGH' THEN ${SLA_TARGET_HOURS.HIGH}
                WHEN 'MEDIUM' THEN ${SLA_TARGET_HOURS.MEDIUM}
                WHEN 'LOW' THEN ${SLA_TARGET_HOURS.LOW}
                ELSE NULL
              END IS NOT NULL
            )::int AS sla_eligible_tickets,
            COUNT(*) FILTER (
              WHERE (
                CASE
                  WHEN re.resolved_at IS NOT NULL
                  THEN EXTRACT(EPOCH FROM (re.resolved_at - t.created_at)) / 3600.0
                  ELSE EXTRACT(EPOCH FROM (NOW() - t.created_at)) / 3600.0
                END
              ) > (
                CASE t.priority
                  WHEN 'HIGH' THEN ${SLA_TARGET_HOURS.HIGH}
                  WHEN 'MEDIUM' THEN ${SLA_TARGET_HOURS.MEDIUM}
                  WHEN 'LOW' THEN ${SLA_TARGET_HOURS.LOW}
                  ELSE NULL
                END
              )
            )::int AS sla_breached_tickets
          FROM filtered_tickets t
          LEFT JOIN first_response fr ON fr.ticket_id = t.id
          LEFT JOIN resolved_events re ON re.ticket_id = t.id
          LEFT JOIN ticket_flags tf ON tf.ticket_id = t.id
        `,
        params
      ),
      pool.query(
        `
          SELECT id, name
          FROM users
          WHERE role IN ('ADMIN', 'AGENT')
          ORDER BY name
        `
      ),
      pool.query(
        `
          SELECT id, name
          FROM ticket_categories
          WHERE is_active = true
          ORDER BY sort_order, name
        `
      )
    ]);

    const summaryRow = summaryRes.rows[0] || {};
    const kpiRow = kpiRes.rows[0] || {};
    const reopenedTickets = parseCount(kpiRow.reopened_tickets);
    const everResolvedTickets = parseCount(kpiRow.ever_resolved_tickets);
    const slaEligibleTickets = parseCount(kpiRow.sla_eligible_tickets);
    const slaBreachedTickets = parseCount(kpiRow.sla_breached_tickets);

    res.json({
      filters_applied: {
        start_date: startDate,
        end_date: endDate,
        status,
        priority,
        assignee_id: assigneeFilter,
        category_id: categoryId
      },
      filter_options: {
        statuses: ALLOWED_STATUSES,
        priorities: ALLOWED_PRIORITIES,
        assignees: assigneeOptionsRes.rows,
        categories: categoryOptionsRes.rows
      },
      summary: {
        total_tickets: parseCount(summaryRow.total_tickets),
        open_tickets: parseCount(summaryRow.open_tickets),
        in_progress_tickets: parseCount(summaryRow.in_progress_tickets),
        resolved_tickets: parseCount(summaryRow.resolved_tickets)
      },
      status_distribution: statusRes.rows.map((row) => ({
        status: row.status,
        count: parseCount(row.count)
      })),
      priority_distribution: priorityRes.rows.map((row) => ({
        priority: row.priority,
        count: parseCount(row.count)
      })),
      category_distribution: categoryRes.rows.map((row) => ({
        category: row.category,
        count: parseCount(row.count)
      })),
      tickets_over_time: timeRes.rows.map((row) => ({
        date: row.date,
        count: parseCount(row.count)
      })),
      sla_threshold_hours: SLA_TARGET_HOURS,
      operational_metrics: {
        first_response_hours_avg: parseNullableNumber(kpiRow.first_response_hours_avg),
        resolution_hours_avg: parseNullableNumber(kpiRow.resolution_hours_avg),
        backlog_age_hours_avg: parseNullableNumber(kpiRow.backlog_age_hours_avg),
        reopened_tickets: reopenedTickets,
        ever_resolved_tickets: everResolvedTickets,
        reopened_rate_pct: everResolvedTickets > 0 ? Number(((reopenedTickets / everResolvedTickets) * 100).toFixed(2)) : 0,
        sla_eligible_tickets: slaEligibleTickets,
        sla_breached_tickets: slaBreachedTickets,
        sla_breach_rate_pct: slaEligibleTickets > 0 ? Number(((slaBreachedTickets / slaEligibleTickets) * 100).toFixed(2)) : 0
      }
    });
  } catch (err) {
    console.error('Load reports failed:', err);
    res.status(500).json({ message: 'Failed to load reports' });
  }
});

module.exports = router;
