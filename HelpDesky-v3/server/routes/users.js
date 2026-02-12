const express = require('express');
const { z } = require('zod');
const pool = require('../db');
const bcrypt = require('bcrypt');
const { authenticateToken, authorizeAnyRole } = require('../middleware/auth');
const router = express.Router();
const SYSTEM_ADMIN_USERNAME = String(process.env.SEED_ADMIN_USERNAME || 'admin').trim().toLowerCase();

// Validation Schemas
const userCreateSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(['ADMIN', 'AGENT', 'END_USER']),
  name: z.string().min(2, "Name is required"),
  department: z.string().optional(),
  phone: z.string().optional()
});

const userUpdateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  role: z.enum(['ADMIN', 'AGENT', 'END_USER']).optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  department: z.string().optional(),
  phone: z.string().optional()
});

const listUsersByRoleClause = async (res, whereClause, params = []) => {
  try {
    let sql = "SELECT id, name, username, role, department, phone FROM users";
    if (whereClause) sql += ` WHERE ${whereClause}`;
    sql += " ORDER BY id";
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List users failed:', err);
    res.status(500).json({ message: 'Failed to list users' });
  }
};

// GET /api/users/staff - List staff users
router.get('/staff', authenticateToken, authorizeAnyRole('ADMIN', 'AGENT'), async (req, res) => {
  return listUsersByRoleClause(res, "role IN ('ADMIN', 'AGENT')");
});

// GET /api/users/end-users - List end users (admin or agent)
router.get('/end-users', authenticateToken, authorizeAnyRole('ADMIN', 'AGENT'), async (req, res) => {
  return listUsersByRoleClause(res, "role = 'END_USER'");
});

// GET /api/users - Backward-compatible list users endpoint
router.get('/', authenticateToken, authorizeAnyRole('ADMIN', 'AGENT'), async (req, res) => {
  const { role } = req.query;

  if (!role) {
    return listUsersByRoleClause(res, "role IN ('ADMIN', 'AGENT')");
  }

  if (!['ADMIN', 'AGENT', 'END_USER'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role filter' });
  }

  if (role === 'END_USER' && !['ADMIN', 'AGENT'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  return listUsersByRoleClause(res, "role = $1", [role]);
});

// POST /api/users - Create new user (admin or agent)
router.post('/', authenticateToken, authorizeAnyRole('ADMIN', 'AGENT'), async (req, res) => {
  try {
    const { username, password, role, name } = userCreateSchema.parse(req.body);

    // Check if username exists
    const userCheck = await pool.query("SELECT id FROM users WHERE username = $1", [username]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (username, password, role, name, department, phone) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, role, name, department, phone",
      [username, hash, role, name, req.body.department, req.body.phone]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: err.errors.map(e => e.message) });
    }
    console.error('Create user failed:', err);
    res.status(500).json({ message: 'Failed to create user' });
  }
});

// PATCH /api/users/:id - Update user details (admin or agent)
router.patch('/:id', authenticateToken, authorizeAnyRole('ADMIN', 'AGENT'), async (req, res) => {
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
    if (req.body.department !== undefined) {
      updates.push(`department = $${idx++}`);
      values.push(req.body.department);
    }
    if (req.body.phone !== undefined) {
      updates.push(`phone = $${idx++}`);
      values.push(req.body.phone);
    }

    if (updates.length === 0) return res.status(400).json({ message: 'No fields to update' });

    values.push(id);
    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, name, username, role, department, phone`;
    
    const result = await pool.query(sql, values);
    
    if (result.rowCount === 0) return res.status(404).json({ message: 'User not found' });
    
    res.json(result.rows[0]);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: err.errors.map(e => e.message) });
    }
    console.error('Update user failed:', err);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// DELETE /api/users/:id - Delete user (admin or agent)
router.delete('/:id', authenticateToken, authorizeAnyRole('ADMIN', 'AGENT'), async (req, res) => {
  const { id } = req.params;
  
  if (parseInt(id, 10) === req.user.id) {
    return res.status(400).json({ message: "You cannot delete yourself" });
  }

  try {
    const targetRes = await pool.query("SELECT id, username FROM users WHERE id = $1", [id]);
    if (targetRes.rowCount === 0) return res.status(404).json({ message: 'User not found' });

    const targetUser = targetRes.rows[0];
    const targetUsername = String(targetUser.username || '').trim().toLowerCase();
    if (targetUsername === SYSTEM_ADMIN_USERNAME) {
      return res.status(403).json({ message: 'System admin account cannot be deleted' });
    }

    const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id", [id]);
    
    if (result.rowCount === 0) return res.status(404).json({ message: 'User not found' });
    
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    if (err.code === '23503') { // ForeignKeyViolation
      res.status(400).json({ message: 'Cannot delete user with assigned tickets. Reassign tickets first.' });
    } else {
      console.error('Delete user failed:', err);
      res.status(500).json({ message: 'Failed to delete user' });
    }
  }
});

module.exports = router;
