const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

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

  // Sorting
  if (sort === 'priority') {
    sql += ` ORDER BY CASE t.priority 
      WHEN 'HIGH' THEN 1 
      WHEN 'MEDIUM' THEN 2 
      WHEN 'LOW' THEN 3 
      ELSE 4 END`;
  } else if (sort === 'date_asc') {
    sql += ` ORDER BY t.created_at ASC`;
  } else {
    // Default new first
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
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tickets - Create new ticket
router.post('/', authenticateToken, async (req, res) => {
  const { caller_name, department, phone, description, priority } = req.body;
  
  // Validation
  if (!caller_name || !department || !description || !priority) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const sql = `
    INSERT INTO tickets (caller_name, department, phone, description, priority, status) 
    VALUES ($1, $2, $3, $4, $5, 'OPEN') 
    RETURNING id
  `;
  
  try {
    const result = await pool.query(sql, [caller_name, department, phone, description, priority]);
    res.status(201).json({ 
      id: result.rows[0].id, 
      message: 'Ticket created',
      status: 'OPEN'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tickets/:id - Update ticket
router.patch('/:id', authenticateToken, async (req, res) => {
  const { status, assignee_id, resolution_note } = req.body;
  const ticketId = req.params.id;

  // Build dynamic update query
  let fields = [];
  let params = [];
  let paramCount = 1;

  if (status) {
    fields.push(`status = $${paramCount}`);
    params.push(status);
    paramCount++;
    if (status === 'RESOLVED') {
       fields.push("closed_at = CURRENT_TIMESTAMP");
    }
  }
  if (assignee_id !== undefined) { // allow null to unassign
    fields.push(`assignee_id = $${paramCount}`);
    params.push(assignee_id);
    paramCount++;
  }
  if (resolution_note) {
    fields.push(`resolution_note = $${paramCount}`);
    params.push(resolution_note);
    paramCount++;
  }

  fields.push("updated_at = CURRENT_TIMESTAMP");

  if (fields.length === 1) { // Only updated_at
    return res.status(400).json({ message: 'No fields to update' });
  }

  params.push(ticketId); // Add ID as last param
  const sql = `UPDATE tickets SET ${fields.join(', ')} WHERE id = $${paramCount}`;

  try {
    const result = await pool.query(sql, params);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Ticket not found' });
    res.json({ message: 'Ticket updated' });
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
  const { id } = req.params;
  const { note } = req.body;
  const userId = req.user.id;

  if (!note) return res.status(400).json({ message: 'Note content is required' });

  try {
    const result = await pool.query(
      "INSERT INTO ticket_notes (ticket_id, user_id, note) VALUES ($1, $2, $3) RETURNING *",
      [id, userId, note]
    );
    
    // Fetch user details for immediate display
    const noteWithUser = {
      ...result.rows[0],
      user_name: req.user.name || req.user.username, // Fallback if name not in token (should be there now)
      user_username: req.user.username
    };

    res.status(201).json(noteWithUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
