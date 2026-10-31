const express = require('express');
const { z } = require('zod');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { publish } = require('../realtime');

const router = express.Router();

const LIST_LIMIT = 30;
const ticketIdSchema = z.coerce.number().int().positive();

const getUnreadCount = async (userId) => {
  const result = await pool.query(
    'SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND read_at IS NULL',
    [userId]
  );
  return result.rows[0].count;
};

// Keeps the person's other open tabs in step when something is read in this one.
const publishRead = (userId) => {
  publish('notification.read', {}, (user) => Number(user.id) === Number(userId));
};

// GET /api/notifications - The signed-in user's latest notifications and unread count
router.get('/', authenticateToken, async (req, res) => {
  try {
    const items = await pool.query(
      `
      SELECT id, ticket_id, type, title, body, read_at, created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT $2
    `,
      [req.user.id, LIST_LIMIT]
    );

    res.json({
      items: items.rows,
      unread_count: await getUnreadCount(req.user.id)
    });
  } catch (err) {
    console.error('List notifications failed:', err);
    res.status(500).json({ message: 'Failed to load notifications' });
  }
});

// POST /api/notifications/read-all - Mark everything as read
router.post('/read-all', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND read_at IS NULL',
      [req.user.id]
    );

    if (result.rowCount > 0) publishRead(req.user.id);
    res.json({ unread_count: 0 });
  } catch (err) {
    console.error('Mark all notifications read failed:', err);
    res.status(500).json({ message: 'Failed to update notifications' });
  }
});

// POST /api/notifications/tickets/:ticketId/read - Mark a ticket's notifications as read
router.post('/tickets/:ticketId/read', authenticateToken, async (req, res) => {
  const ticketId = ticketIdSchema.safeParse(req.params.ticketId);
  if (!ticketId.success) {
    return res.status(400).json({ message: 'Invalid ticket' });
  }

  try {
    const result = await pool.query(
      'UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND ticket_id = $2 AND read_at IS NULL',
      [req.user.id, ticketId.data]
    );

    if (result.rowCount > 0) publishRead(req.user.id);
    res.json({ unread_count: await getUnreadCount(req.user.id) });
  } catch (err) {
    console.error('Mark ticket notifications read failed:', err);
    res.status(500).json({ message: 'Failed to update notifications' });
  }
});

module.exports = router;
