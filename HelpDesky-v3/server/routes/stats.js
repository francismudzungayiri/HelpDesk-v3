const express = require('express');
const db = require('../init_db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const router = express.Router();

// GET /api/stats - Admin Dashboard Stats
router.get('/', authenticateToken, authorizeRole('ADMIN'), (req, res) => {
  const stats = {};

  // 1. Total Open Tickets
  db.get("SELECT COUNT(*) as count FROM tickets WHERE status = 'OPEN'", [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    stats.total_open = row.count;

    // 2. Staff Workload (Active Tickets assigned)
    const sql = `
      SELECT u.name, 
             SUM(CASE WHEN t.status IN ('OPEN', 'IN_PROGRESS') THEN 1 ELSE 0 END) as active_tickets,
             SUM(CASE WHEN t.status = 'RESOLVED' THEN 1 ELSE 0 END) as resolved_tickets
      FROM users u
      LEFT JOIN tickets t ON u.id = t.assignee_id
      GROUP BY u.id
    `;
    
    db.all(sql, [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      stats.staff_stats = rows;
      
      // Send response
      res.json(stats);
    });
  });
});

module.exports = router;
