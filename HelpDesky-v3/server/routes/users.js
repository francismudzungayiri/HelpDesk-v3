const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
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

module.exports = router;
