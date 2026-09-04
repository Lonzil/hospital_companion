// routes/doctors.js
const express = require('express');
const db = require('../db');
const router = express.Router();

function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ error: 'Authentication required' });
}

// GET /api/doctors
router.get('/', requireAuth, (req, res) => {
  const doctors = db.prepare('SELECT id, name, specialty, role, avatar_url FROM doctors').all();
  res.json({ doctors });
});

module.exports = router;