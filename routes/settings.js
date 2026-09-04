// routes/settings.js
const express = require('express');
const db = require('../db');
const router = express.Router();

function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ error: 'Authentication required' });
}

// GET /api/settings
router.get('/', requireAuth, (req, res) => {
  const userId = req.session.userId;

  let settings = db.prepare(
    'SELECT * FROM settings WHERE user_id = ?'
  ).get(userId);

  // If no settings row exists, create default
  if (!settings) {
    db.prepare(`
      INSERT INTO settings (user_id)
      VALUES (?)
    `).run(userId);
    settings = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(userId);
  }

  res.json({ settings });
});

// PUT /api/settings
router.put('/', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const {
    email_notifications,
    sms_notifications,
    appointment_reminders,
    lab_results_notifications,
    health_tips,
    reminder_frequency,
    reminder_time
  } = req.body;

  // Ensure settings row exists
  let existing = db.prepare('SELECT user_id FROM settings WHERE user_id = ?').get(userId);
  if (!existing) {
    db.prepare('INSERT INTO settings (user_id) VALUES (?)').run(userId);
  }

  // Build update fields dynamically
  const updates = [];
  const params = [];

  if (email_notifications !== undefined) {
    updates.push('email_notifications = ?');
    params.push(email_notifications ? 1 : 0);
  }
  if (sms_notifications !== undefined) {
    updates.push('sms_notifications = ?');
    params.push(sms_notifications ? 1 : 0);
  }
  if (appointment_reminders !== undefined) {
    updates.push('appointment_reminders = ?');
    params.push(appointment_reminders ? 1 : 0);
  }
  if (lab_results_notifications !== undefined) {
    updates.push('lab_results_notifications = ?');
    params.push(lab_results_notifications ? 1 : 0);
  }
  if (health_tips !== undefined) {
    updates.push('health_tips = ?');
    params.push(health_tips ? 1 : 0);
  }
  if (reminder_frequency !== undefined) {
    updates.push('reminder_frequency = ?');
    params.push(reminder_frequency);
  }
  if (reminder_time !== undefined) {
    updates.push('reminder_time = ?');
    params.push(reminder_time);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  params.push(userId);
  db.prepare(`UPDATE settings SET ${updates.join(', ')} WHERE user_id = ?`).run(...params);

  const updated = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(userId);
  res.json({ settings: updated });
});

module.exports = router;