const express = require('express');
const { z } = require('zod');
const pool = require('../db');
const bcrypt = require('bcrypt');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const router = express.Router();

// Validation Schemas
const userCreateSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(['ADMIN', 'AGENT']),
  name: z.string().min(2, "Name is required")
});

const userUpdateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  role: z.enum(['ADMIN', 'AGENT']).optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional()
});

// GET /api/users - List all users (id, name, username, role)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, username, role FROM users WHERE role IN ('ADMIN', 'AGENT') ORDER BY id"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users - Create new user (Admin only)
router.post('/', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
  try {
    const { username, password, role, name } = userCreateSchema.parse(req.body);

    // Check if username exists
    const userCheck = await pool.query("SELECT id FROM users WHERE username = $1", [username]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (username, password, role, name) VALUES ($1, $2, $3, $4) RETURNING id, username, role, name",
      [username, hash, role, name]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: err.errors.map(e => e.message) });
    }
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/users/:id - Update user details (Admin only)
router.patch('/:id', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, password } = userUpdateSchema.parse(req.body);
    
    const updates = [];
    const values = [];
    let idx = 1;

    if (name) {
      updates.push(`name = $${idx++}`);
      values.push(name);
    }
    if (role) {
      updates.push(`role = $${idx++}`);
      values.push(role);
    }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      updates.push(`password = $${idx++}`);
      values.push(hash);
    }

    if (updates.length === 0) return res.status(400).json({ message: 'No fields to update' });

    values.push(id);
    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, name, username, role`;
    
    const result = await pool.query(sql, values);
    
    if (result.rowCount === 0) return res.status(404).json({ message: 'User not found' });
    
    res.json(result.rows[0]);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: err.errors.map(e => e.message) });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id - Delete user (Admin only)
router.delete('/:id', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
  const { id } = req.params;
  
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ message: "You cannot delete yourself" });
  }

  try {
    const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id", [id]);
    
    if (result.rowCount === 0) return res.status(404).json({ message: 'User not found' });
    
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    if (err.code === '23503') { // ForeignKeyViolation
      res.status(400).json({ message: 'Cannot delete user with assigned tickets. Reassign tickets first.' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

module.exports = router;
