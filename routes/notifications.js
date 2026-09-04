// routes/notifications.js
const express = require('express');
const db = require('../db');
const router = express.Router();

// ----------------------------------------------------------------------
// Helper: require authentication
// ----------------------------------------------------------------------
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ error: 'Authentication required' });
}

// ----------------------------------------------------------------------
// GET /api/notifications?filter=all|unread|read
// List notifications for the current user
// ----------------------------------------------------------------------
router.get('/', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const { filter } = req.query; // 'all', 'unread', 'read'

  let query = `
    SELECT id, title, message, category, is_read, created_at
    FROM notifications
    WHERE user_id = ?
  `;
  const params = [userId];

  if (filter === 'unread') {
    query += ' AND is_read = 0';
  } else if (filter === 'read') {
    query += ' AND is_read = 1';
  }

  query += ' ORDER BY created_at DESC';

  const notifications = db.prepare(query).all(...params);
  res.json({ notifications });
});

// ----------------------------------------------------------------------
// PUT /api/notifications/read-all
// Mark all notifications as read for the current user
// ----------------------------------------------------------------------
router.put('/read-all', requireAuth, (req, res) => {
  const userId = req.session.userId;

  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0')
    .run(userId);

  res.json({ message: 'All notifications marked as read' });
});

// ----------------------------------------------------------------------
// PUT /api/notifications/:id/read
// Mark a single notification as read
// ----------------------------------------------------------------------
router.put('/:id/read', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const notificationId = req.params.id;

  const notification = db.prepare(
    'SELECT id FROM notifications WHERE id = ? AND user_id = ?'
  ).get(notificationId, userId);

  if (!notification) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(notificationId);

  res.json({ message: 'Notification marked as read' });
});

module.exports = router;