const express = require('express');
const pool = require('../db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const router = express.Router();

// GET /api/stats - Admin Dashboard Stats
router.get('/', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
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
    const reportData = {};

    // 1. Status Distribution
    const statusRes = await pool.query("SELECT status, COUNT(*) as count FROM tickets GROUP BY status");
    reportData.status_distribution = statusRes.rows;

    // 2. Priority Distribution
    const priorityRes = await pool.query("SELECT priority, COUNT(*) as count FROM tickets GROUP BY priority");
    reportData.priority_distribution = priorityRes.rows;

    // 3. Tickets Over Time (Last 30 Days)
    const timeRes = await pool.query(`
      SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date, COUNT(*) as count 
      FROM tickets 
      WHERE created_at > NOW() - INTERVAL '30 days' 
      GROUP BY date 
      ORDER BY date
    `);
    reportData.tickets_over_time = timeRes.rows;

    // 4. Assignee Performance (Resolved Count) - Filter to Staff roles
    const assigneeRes = await pool.query(`
      SELECT u.name, COUNT(t.id) as resolved_count
      FROM users u
      JOIN tickets t ON u.id = t.assignee_id
      WHERE t.status = 'RESOLVED' AND u.role IN ('ADMIN', 'AGENT')
      GROUP BY u.name
    `);
    reportData.assignee_performance = assigneeRes.rows;

    res.json(reportData);
  } catch (err) {
    console.error('Load reports failed:', err);
    res.status(500).json({ message: 'Failed to load reports' });
  }
});

module.exports = router;
