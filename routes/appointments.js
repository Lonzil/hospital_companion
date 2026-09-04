// routes/appointments.js
const express = require('express');
const db = require('../db');
const router = express.Router();

function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ error: 'Authentication required' });
}

// GET /api/appointments?status=upcoming|past|cancelled
router.get('/', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const { status } = req.query;

  let query = `
    SELECT a.id, a.date, a.time, a.status, a.reason,
           d.name AS doctor_name, d.specialty, d.role
    FROM appointments a
    JOIN doctors d ON a.doctor_id = d.id
    WHERE a.patient_id = ?
  `;
  const params = [userId];

  if (status === 'upcoming') {
    query += " AND a.status != 'cancelled' AND a.date >= date('now') ORDER BY a.date ASC";
  } else if (status === 'past') {
    query += " AND a.date < date('now') ORDER BY a.date DESC";
  } else if (status === 'cancelled') {
    query += " AND a.status = 'cancelled' ORDER BY a.date DESC";
  } else {
    query += " ORDER BY a.date ASC";
  }

  const appointments = db.prepare(query).all(...params);
  res.json({ appointments });
});

// POST /api/appointments - book new appointment
router.post('/', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const { doctor_id, date, time, reason } = req.body;

  if (!doctor_id || !date || !time) {
    return res.status(400).json({ error: 'Doctor, date, and time are required' });
  }

  const doctor = db.prepare('SELECT id FROM doctors WHERE id = ?').get(doctor_id);
  if (!doctor) {
    return res.status(400).json({ error: 'Invalid doctor selected' });
  }

  const result = db.prepare(`
    INSERT INTO appointments (patient_id, doctor_id, date, time, status, reason, created_at)
    VALUES (?, ?, ?, ?, 'pending', ?, datetime('now'))
  `).run(userId, doctor_id, date, time, reason || null);

  const appointment = db.prepare(`
    SELECT a.id, a.date, a.time, a.status, a.reason,
           d.name AS doctor_name, d.specialty, d.role
    FROM appointments a
    JOIN doctors d ON a.doctor_id = d.id
    WHERE a.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ appointment });
});

// GET /api/appointments/:id - get single appointment
router.get('/:id', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const appointmentId = req.params.id;

  const appointment = db.prepare(`
    SELECT a.id, a.patient_id, a.date, a.time, a.status, a.reason,
           d.name AS doctor_name, d.specialty, d.role, d.avatar_url
    FROM appointments a
    JOIN doctors d ON a.doctor_id = d.id
    WHERE a.id = ? AND a.patient_id = ?
  `).get(appointmentId, userId);

  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  res.json({ appointment });
});

// PUT /api/appointments/:id - update appointment (reschedule or cancel)
router.put('/:id', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const appointmentId = req.params.id;
  const { date, time, reason, status } = req.body;

  const existing = db.prepare('SELECT id, patient_id FROM appointments WHERE id = ?').get(appointmentId);
  if (!existing || existing.patient_id !== userId) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  // Build update fields dynamically
  const updates = [];
  const params = [];

  if (date !== undefined) {
    updates.push('date = ?');
    params.push(date);
  }
  if (time !== undefined) {
    updates.push('time = ?');
    params.push(time);
  }
  if (reason !== undefined) {
    updates.push('reason = ?');
    params.push(reason);
  }
  if (status !== undefined) {
    if (!['confirmed', 'pending', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    updates.push('status = ?');
    params.push(status);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  params.push(appointmentId);
  db.prepare(`UPDATE appointments SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare(`
    SELECT a.id, a.date, a.time, a.status, a.reason,
           d.name AS doctor_name, d.specialty, d.role
    FROM appointments a
    JOIN doctors d ON a.doctor_id = d.id
    WHERE a.id = ?
  `).get(appointmentId);

  res.json({ appointment: updated });
});

// DELETE /api/appointments/:id - cancel appointment
router.delete('/:id', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const appointmentId = req.params.id;

  const existing = db.prepare('SELECT id, patient_id FROM appointments WHERE id = ?').get(appointmentId);
  if (!existing || existing.patient_id !== userId) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  db.prepare("UPDATE appointments SET status = 'cancelled' WHERE id = ?").run(appointmentId);
  res.json({ message: 'Appointment cancelled successfully' });
});

module.exports = router;