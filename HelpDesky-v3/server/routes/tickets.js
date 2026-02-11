const express = require('express');
const { z } = require('zod');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Validation Schemas
const ticketCreateSchema = z.object({
  caller_name: z.string().min(1, "Caller name is required"),
  department: z.string().min(1, "Department is required"),
  phone: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH'])
});

const ticketUpdateSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']).optional(),
  assignee_id: z.number().nullable().optional(),
  resolution_note: z.string().optional()
});

const noteSchema = z.object({
  note: z.string().min(1, "Note content is required")
});

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
    sql += ` ORDER BY t.created_at ASC`;
  } else {
    sql += ` ORDER BY t.created_at DESC`;
  }

  try {
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    if (result.rows.length === 0) return res.status(404).json({ message: 'Ticket not found' });
    
    const ticket = result.rows[0];
    
    if (req.user.role === 'END_USER' && ticket.created_by !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tickets - Create new ticket
router.post('/', authenticateToken, async (req, res) => {
  try {
    let ticketData = ticketCreateSchema.parse(req.body);
    
    if (req.user.role === 'END_USER') {
      const userResult = await pool.query(
        "SELECT name, department, phone FROM users WHERE id = $1",
        [req.user.id]
      );
      const userProfile = userResult.rows[0];
      ticketData.caller_name = userProfile.name;
      ticketData.department = userProfile.department;
      ticketData.phone = userProfile.phone || ticketData.phone;
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
      return res.status(400).json({ errors: err.errors.map(e => e.message) });
    }
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tickets/:id - Update ticket
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { status, assignee_id, resolution_note } = ticketUpdateSchema.parse(req.body);
    const ticketId = req.params.id;

    // Get current state for history logging
    const currentRes = await pool.query("SELECT status, assignee_id FROM tickets WHERE id = $1", [ticketId]);
    if (currentRes.rowCount === 0) return res.status(404).json({ message: 'Ticket not found' });
    const currentTicket = currentRes.rows[0];

    let fields = [];
    let params = [];
    let paramCount = 1;
    let historyLogs = [];

    if (status && status !== currentTicket.status) {
      fields.push(`status = $${paramCount}`);
      params.push(status);
      paramCount++;
      if (status === 'RESOLVED') {
         fields.push("closed_at = CURRENT_TIMESTAMP");
      }
      historyLogs.push({ action: 'STATUS_CHANGE', old_value: currentTicket.status, new_value: status });
    }
    
    if (assignee_id !== undefined && assignee_id !== currentTicket.assignee_id) {
      fields.push(`assignee_id = $${paramCount}`);
      params.push(assignee_id);
      paramCount++;
      historyLogs.push({ action: 'ASSIGNEE_CHANGE', old_value: currentTicket.assignee_id, new_value: assignee_id });
    }

    if (resolution_note) {
      fields.push(`resolution_note = $${paramCount}`);
      params.push(resolution_note);
      paramCount++;
    }

    fields.push("updated_at = CURRENT_TIMESTAMP");

    if (fields.length === 1) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    params.push(ticketId);
    const sql = `UPDATE tickets SET ${fields.join(', ')} WHERE id = $${paramCount}`;

    await pool.query(sql, params);

    // Write history logs
    for (const log of historyLogs) {
      await pool.query(
        "INSERT INTO ticket_history (ticket_id, user_id, action, old_value, new_value) VALUES ($1, $2, $3, $4, $5)",
        [ticketId, req.user.id, log.action, String(log.old_value), String(log.new_value)]
      );
    }

    res.json({ message: 'Ticket updated' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: err.errors.map(e => e.message) });
    }
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tickets/:id/history - Get history for a ticket
router.get('/:id/history', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
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
    `, [id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tickets/:id/notes - Get notes for a ticket
router.get('/:id/notes', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT n.*, u.name as user_name, u.username as user_username
      FROM ticket_notes n
      LEFT JOIN users u ON n.user_id = u.id
      WHERE n.ticket_id = $1
      ORDER BY n.created_at DESC
    `, [id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tickets/:id/notes - Add a note to a ticket
router.post('/:id/notes', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = noteSchema.parse(req.body);
    const userId = req.user.id;

    const result = await pool.query(
      "INSERT INTO ticket_notes (ticket_id, user_id, note) VALUES ($1, $2, $3) RETURNING *",
      [id, userId, note]
    );
    
    const noteWithUser = {
      ...result.rows[0],
      user_name: req.user.name || req.user.username,
      user_username: req.user.username
    };

    res.status(201).json(noteWithUser);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: err.errors.map(e => e.message) });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
