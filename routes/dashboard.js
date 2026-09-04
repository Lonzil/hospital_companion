// routes/dashboard.js
const express = require('express');
const db = require('../db');
const router = express.Router();

// Simple auth check
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ error: 'Authentication required' });
}

// GET /api/dashboard
router.get('/', requireAuth, (req, res) => {
  const userId = req.session.userId;

  // 1. Get user info
  const user = db.prepare(
    'SELECT full_name, patient_id, last_login FROM users WHERE id = ?'
  ).get(userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // 2. Upcoming appointments count (status != cancelled and date >= today)
  const upcomingAppointmentsCount = db.prepare(
    `SELECT COUNT(*) AS count FROM appointments 
     WHERE patient_id = ? AND status != 'cancelled' AND date >= date('now')`
  ).get(userId).count;

  // 3. New lab results count (latest 5? or all results with status normal/abnormal)
  const totalLabResults = db.prepare(
    'SELECT COUNT(*) AS count FROM lab_results WHERE patient_id = ?'
  ).get(userId).count;

  // 4. Unread notifications count
  const unreadNotifications = db.prepare(
    'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0'
  ).get(userId).count;

  // 5. Next 2 upcoming appointments
  const upcomingAppointments = db.prepare(
    `SELECT a.id, a.date, a.time, a.status, d.name AS doctor_name, d.specialty
     FROM appointments a
     JOIN doctors d ON a.doctor_id = d.id
     WHERE a.patient_id = ? AND a.status != 'cancelled' AND a.date >= date('now')
     ORDER BY a.date ASC
     LIMIT 2`
  ).all(userId);

  // 6. 3 most recent notifications
  const recentNotifications = db.prepare(
    `SELECT id, title, message, category, is_read, created_at
     FROM notifications
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 3`
  ).all(userId);

  // 7. Health goal (static as per current UI)
  const healthGoal = {
    title: 'Hydration tracking',
    value: 'Daily Water Intake',
    progress: 75
  };

  res.json({
    user: {
      full_name: user.full_name,
      patient_id: user.patient_id,
      last_login: user.last_login
    },
    stats: {
      upcoming_appointments: upcomingAppointmentsCount,
      lab_results_total: totalLabResults,
      unread_notifications: unreadNotifications
    },
    appointments: upcomingAppointments,
    notifications: recentNotifications,
    healthGoal
  });
});

module.exports = router;