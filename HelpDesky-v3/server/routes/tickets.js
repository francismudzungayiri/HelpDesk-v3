const express = require('express');
const { z } = require('zod');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const staffTicketCreateSchema = z.object({
  caller_name: z.string().min(1, 'Caller name is required'),
  department: z.string().min(1, 'Department is required'),
  phone: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH'])
});

const endUserTicketCreateSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  phone: z.string().optional()
});

const ticketUpdateSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']).optional(),
  assignee_id: z.number().nullable().optional(),
  resolution_note: z.string().optional()
});

const noteSchema = z.object({
  note: z.string().min(1, 'Note content is required')
});

const canAccessTicket = (user, ticket) => {
  if (user.role !== 'END_USER') return true;
  return ticket.created_by === user.id;
};

const getTicketAccessRow = async (ticketId) => {
  const result = await pool.query('SELECT id, created_by FROM tickets WHERE id = $1', [ticketId]);
  return result.rows[0] || null;
};

// GET /api/tickets - List all tickets (with filters)
router.get('/', authenticateToken, async (req, res) => {
  const { status, sort, assignee_id } = req.query;

  let sql = `
    SELECT t.*, u.name as assignee_name, u.username as assignee_username
    FROM tickets t
    LEFT JOIN users u ON t.assignee_id = u.id
    WHERE 1=1
  `;

  const params = [];
  let paramCount = 1;

  if (status) {
    sql += ` AND t.status = $${paramCount}`;
    params.push(status);
    paramCount++;
  }

  if (assignee_id) {
    sql += ` AND t.assignee_id = $${paramCount}`;
    params.push(assignee_id);
    paramCount++;
  }

  if (req.user.role === 'END_USER') {
    sql += ` AND t.created_by = $${paramCount}`;
    params.push(req.user.id);
    paramCount++;
  }

  if (sort === 'priority') {
    sql += ` ORDER BY CASE t.priority
      WHEN 'HIGH' THEN 1
      WHEN 'MEDIUM' THEN 2
      WHEN 'LOW' THEN 3
      ELSE 4 END`;
  } else if (sort === 'date_asc') {
    sql += ' ORDER BY t.created_at ASC';
  } else {
    sql += ' ORDER BY t.created_at DESC';
  }

  try {
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List tickets failed:', err);
    res.status(500).json({ message: 'Failed to fetch tickets' });
  }
});

// GET /api/tickets/:id - Get single ticket details
router.get('/:id', authenticateToken, async (req, res) => {
  const sql = `
    SELECT t.*, u.name as assignee_name, u.username as assignee_username
    FROM tickets t
    LEFT JOIN users u ON t.assignee_id = u.id
    WHERE t.id = $1
  `;

  try {
    const result = await pool.query(sql, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const ticket = result.rows[0];

    if (!canAccessTicket(req.user, ticket)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(ticket);
  } catch (err) {
    console.error('Get ticket failed:', err);
    res.status(500).json({ message: 'Failed to fetch ticket' });
  }
});

// POST /api/tickets - Create new ticket
router.post('/', authenticateToken, async (req, res) => {
  try {
    let ticketData;

    if (req.user.role === 'END_USER') {
      const payload = endUserTicketCreateSchema.parse(req.body);
      const userResult = await pool.query('SELECT name, department, phone FROM users WHERE id = $1', [req.user.id]);
      const userProfile = userResult.rows[0];

      if (!userProfile) {
        return res.status(404).json({ message: 'User profile not found' });
      }

      if (!userProfile.department) {
        return res.status(400).json({ message: 'Your profile is missing a department. Contact support.' });
      }

      ticketData = {
        caller_name: userProfile.name,
        department: userProfile.department,
        phone: userProfile.phone || payload.phone,
        description: payload.description,
        priority: payload.priority
      };
    } else {
      ticketData = staffTicketCreateSchema.parse(req.body);
    }

    const sql = `
      INSERT INTO tickets (caller_name, department, phone, description, priority, status, created_by)
      VALUES ($1, $2, $3, $4, $5, 'OPEN', $6)
      RETURNING id
    `;

    const result = await pool.query(sql, [
      ticketData.caller_name,
      ticketData.department,
      ticketData.phone,
      ticketData.description,
      ticketData.priority,
      req.user.id
    ]);

    res.status(201).json({
      id: result.rows[0].id,
      message: 'Ticket created',
      status: 'OPEN'
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: err.errors.map((e) => e.message) });
    }

    console.error('Create ticket failed:', err);
    res.status(500).json({ message: 'Failed to create ticket' });
  }
});

// PATCH /api/tickets/:id - Update ticket (staff only)
router.patch('/:id', authenticateToken, async (req, res) => {
  if (req.user.role === 'END_USER') {
    return res.status(403).json({ message: 'Only staff can update tickets' });
  }

  try {
    const { status, assignee_id, resolution_note } = ticketUpdateSchema.parse(req.body);
    const ticketId = req.params.id;

    const currentRes = await pool.query('SELECT status, assignee_id FROM tickets WHERE id = $1', [ticketId]);
    if (currentRes.rowCount === 0) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const currentTicket = currentRes.rows[0];
    const fields = [];
    const params = [];
    let paramCount = 1;
    const historyLogs = [];

    if (status && status !== currentTicket.status) {
      fields.push(`status = $${paramCount}`);
      params.push(status);
      paramCount++;

      if (status === 'RESOLVED') {
        fields.push('closed_at = CURRENT_TIMESTAMP');
      } else if (currentTicket.status === 'RESOLVED') {
        fields.push('closed_at = NULL');
      }

      historyLogs.push({ action: 'STATUS_CHANGE', old_value: currentTicket.status, new_value: status });
    }

    if (assignee_id !== undefined && assignee_id !== currentTicket.assignee_id) {
      if (assignee_id !== null) {
        const assigneeRes = await pool.query(
          "SELECT id FROM users WHERE id = $1 AND role IN ('ADMIN', 'AGENT')",
          [assignee_id]
        );
        if (assigneeRes.rowCount === 0) {
          return res.status(400).json({ message: 'Assignee must be an existing staff user' });
        }
      }

      fields.push(`assignee_id = $${paramCount}`);
      params.push(assignee_id);
      paramCount++;

      historyLogs.push({
        action: 'ASSIGNEE_CHANGE',
        old_value: currentTicket.assignee_id,
        new_value: assignee_id
      });
    }

    if (resolution_note !== undefined) {
      fields.push(`resolution_note = $${paramCount}`);
      params.push(resolution_note);
      paramCount++;
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');

    params.push(ticketId);
    const sql = `UPDATE tickets SET ${fields.join(', ')} WHERE id = $${paramCount}`;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql, params);

      for (const log of historyLogs) {
        await client.query(
          'INSERT INTO ticket_history (ticket_id, user_id, action, old_value, new_value) VALUES ($1, $2, $3, $4, $5)',
          [ticketId, req.user.id, log.action, String(log.old_value), String(log.new_value)]
        );
      }

      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    res.json({ message: 'Ticket updated' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: err.errors.map((e) => e.message) });
    }

    console.error('Update ticket failed:', err);
    res.status(500).json({ message: 'Failed to update ticket' });
  }
});

// GET /api/tickets/:id/history - Get history for a ticket
router.get('/:id/history', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const ticket = await getTicketAccessRow(id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (!canAccessTicket(req.user, ticket)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const result = await pool.query(
      `
      SELECT
        h.*,
        u.name as user_name,
        CASE
          WHEN h.action = 'ASSIGNEE_CHANGE' AND h.old_value IS NOT NULL AND h.old_value != 'null' AND h.old_value ~ '^[0-9]+$'
          THEN (SELECT name FROM users WHERE id = CAST(h.old_value AS INTEGER))
          ELSE h.old_value
        END as old_name,
        CASE
          WHEN h.action = 'ASSIGNEE_CHANGE' AND h.new_value IS NOT NULL AND h.new_value != 'null' AND h.new_value ~ '^[0-9]+$'
          THEN (SELECT name FROM users WHERE id = CAST(h.new_value AS INTEGER))
          ELSE h.new_value
        END as new_name
      FROM ticket_history h
      LEFT JOIN users u ON h.user_id = u.id
      WHERE h.ticket_id = $1
      ORDER BY h.created_at DESC
    `,
      [id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Get ticket history failed:', err);
    res.status(500).json({ message: 'Failed to fetch ticket history' });
  }
});

// GET /api/tickets/:id/notes - Get notes for a ticket
router.get('/:id/notes', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const ticket = await getTicketAccessRow(id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (!canAccessTicket(req.user, ticket)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const result = await pool.query(
      `
      SELECT n.*, u.name as user_name, u.username as user_username
      FROM ticket_notes n
      LEFT JOIN users u ON n.user_id = u.id
      WHERE n.ticket_id = $1
      ORDER BY n.created_at DESC
    `,
      [id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Get ticket notes failed:', err);
    res.status(500).json({ message: 'Failed to fetch ticket notes' });
  }
});

// POST /api/tickets/:id/notes - Add an internal note (staff only)
router.post('/:id/notes', authenticateToken, async (req, res) => {
  if (req.user.role === 'END_USER') {
    return res.status(403).json({ message: 'End users cannot add internal notes' });
  }

  try {
    const { id } = req.params;
    const { note } = noteSchema.parse(req.body);

    const ticket = await getTicketAccessRow(id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const result = await pool.query(
      'INSERT INTO ticket_notes (ticket_id, user_id, note) VALUES ($1, $2, $3) RETURNING *',
      [id, req.user.id, note]
    );

    const noteWithUser = {
      ...result.rows[0],
      user_name: req.user.name || req.user.username,
      user_username: req.user.username
    };

    res.status(201).json(noteWithUser);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: err.errors.map((e) => e.message) });
    }

    console.error('Add ticket note failed:', err);
    res.status(500).json({ message: 'Failed to add note' });
  }
});

module.exports = router;
