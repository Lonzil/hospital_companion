// routes/profile.js
const express = require('express');
const db = require('../db');
const router = express.Router();

function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ error: 'Authentication required' });
}

// GET /api/profile
router.get('/', requireAuth, (req, res) => {
  const userId = req.session.userId;

  const user = db.prepare(
    'SELECT id, full_name, email, phone, dob, patient_id, last_login FROM users WHERE id = ?'
  ).get(userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ profile: user });
});

// PUT /api/profile
router.put('/', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const { full_name, phone, dob } = req.body;

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const updates = [];
  const params = [];

  if (full_name !== undefined) {
    updates.push('full_name = ?');
    params.push(full_name);
  }
  if (phone !== undefined) {
    updates.push('phone = ?');
    params.push(phone);
  }
  if (dob !== undefined) {
    updates.push('dob = ?');
    params.push(dob);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  params.push(userId);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare(
    'SELECT id, full_name, email, phone, dob, patient_id, last_login FROM users WHERE id = ?'
  ).get(userId);

  res.json({ profile: updated });
});

module.exports = router;