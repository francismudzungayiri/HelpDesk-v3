const express = require('express');
const pool = require('../db');
const bcrypt = require('bcrypt');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const router = express.Router();

// GET /api/users - List all users (id, name) for dropdowns
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT id, name, role FROM users");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users - Create new user (Admin only)
router.post('/', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
  const { username, password, role, name } = req.body;

  if (!username || !password || !role || !name) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (!['ADMIN', 'AGENT'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  try {
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
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
