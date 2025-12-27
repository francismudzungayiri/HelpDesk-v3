const express = require('express');
const db = require('../init_db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// GET /api/users - List all users (id, name) for dropdowns
router.get('/', authenticateToken, (req, res) => {
  db.all("SELECT id, name, role FROM users", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

module.exports = router;
