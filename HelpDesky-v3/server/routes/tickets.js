const express = require('express');
const db = require('../init_db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// GET /api/tickets - List all tickets (with filters)
router.get('/', authenticateToken, (req, res) => {
  const { status, sort, assignee_id } = req.query;
  let sql = `
    SELECT t.*, u.name as assignee_name 
    FROM tickets t 
    LEFT JOIN users u ON t.assignee_id = u.id 
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    sql += ` AND t.status = ?`;
    params.push(status);
  }

  if (assignee_id) {
     sql += ` AND t.assignee_id = ?`;
     params.push(assignee_id);
  }

  // Sorting
  if (sort === 'priority') {
    // Custom sort order for priority? For now simple text sort, or we can use CASE
    // enum: LOW, MEDIUM, HIGH. 
    // To sort HIGH > MEDIUM > LOW, we can do:
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

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET /api/tickets/:id - Get single ticket details
router.get('/:id', authenticateToken, (req, res) => {
  const sql = `
    SELECT t.*, u.name as assignee_name 
    FROM tickets t 
    LEFT JOIN users u ON t.assignee_id = u.id 
    WHERE t.id = ?
  `;
  db.get(sql, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ message: 'Ticket not found' });
    res.json(row);
  });
});

// POST /api/tickets - Create new ticket
router.post('/', authenticateToken, (req, res) => {
  const { caller_name, department, phone, description, priority } = req.body;
  
  // Validation
  if (!caller_name || !department || !description || !priority) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const sql = `INSERT INTO tickets (caller_name, department, phone, description, priority, status) VALUES (?, ?, ?, ?, ?, 'OPEN')`;
  
  db.run(sql, [caller_name, department, phone, description, priority], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ 
      id: this.lastID, 
      message: 'Ticket created',
      status: 'OPEN'
    });
  });
});

// PATCH /api/tickets/:id - Update ticket
router.patch('/:id', authenticateToken, (req, res) => {
  const { status, assignee_id, resolution_note } = req.body;
  const ticketId = req.params.id;

  // Build dynamic update query
  let fields = [];
  let params = [];

  if (status) {
    fields.push("status = ?");
    params.push(status);
    if (status === 'RESOLVED') {
       fields.push("closed_at = CURRENT_TIMESTAMP");
    }
  }
  if (assignee_id !== undefined) { // allow null to unassign
    fields.push("assignee_id = ?");
    params.push(assignee_id);
  }
  if (resolution_note) {
    fields.push("resolution_note = ?");
    params.push(resolution_note);
  }

  fields.push("updated_at = CURRENT_TIMESTAMP");

  if (fields.length === 1) { // Only updated_at
    return res.status(400).json({ message: 'No fields to update' });
  }

  const sql = `UPDATE tickets SET ${fields.join(', ')} WHERE id = ?`;
  params.push(ticketId);

  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ message: 'Ticket not found' });
    res.json({ message: 'Ticket updated' });
  });
});

module.exports = router;
