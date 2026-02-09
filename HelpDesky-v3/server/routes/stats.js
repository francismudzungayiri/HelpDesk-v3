const express = require('express');
const pool = require('../db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const router = express.Router();

// GET /api/stats - Admin Dashboard Stats
router.get('/', authenticateToken, authorizeRole('ADMIN'), (req, res) => {
  const stats = {};

  (async () => {
    try {
      // 1. Total Open Tickets
      const openTicketsRes = await pool.query("SELECT COUNT(*) as count FROM tickets WHERE status = 'OPEN'");
      stats.total_open = parseInt(openTicketsRes.rows[0].count);

      // 2. Staff Workload (Active Tickets assigned)
      const sql = `
        SELECT u.name, 
               SUM(CASE WHEN t.status IN ('OPEN', 'IN_PROGRESS') THEN 1 ELSE 0 END) as active_tickets,
               SUM(CASE WHEN t.status = 'RESOLVED' THEN 1 ELSE 0 END) as resolved_tickets
        FROM users u
        LEFT JOIN tickets t ON u.id = t.assignee_id
        GROUP BY u.id
      `;
      
      const staffStatsRes = await pool.query(sql);
      stats.staff_stats = staffStatsRes.rows.map(row => ({
        name: row.name,
        active_tickets: parseInt(row.active_tickets || 0),
        resolved_tickets: parseInt(row.resolved_tickets || 0)
      }));
      
      // Send response
      res.json(stats);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  })();
});

module.exports = router;
