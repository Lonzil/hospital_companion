// routes/labResults.js
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
// GET /api/lab-results/search?query=...
// Search lab results by test name or report ID
// NOTE: Must be defined before /:reportId to avoid route conflict
// ----------------------------------------------------------------------
router.get('/search', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const { query } = req.query;

  if (!query || query.trim() === '') {
    return res.status(400).json({ error: 'Search query is required' });
  }

  const searchTerm = `%${query.trim()}%`;

  const results = db.prepare(`
    SELECT id, report_id, test_name, category, report_date, physician, status
    FROM lab_results
    WHERE patient_id = ?
      AND (test_name LIKE ? OR report_id LIKE ?)
    ORDER BY report_date DESC
  `).all(userId, searchTerm, searchTerm);

  res.json({ results });
});

// ----------------------------------------------------------------------
// GET /api/lab-results
// List all lab results for the current user
// ----------------------------------------------------------------------
router.get('/', requireAuth, (req, res) => {
  const userId = req.session.userId;

  const results = db.prepare(`
    SELECT id, report_id, test_name, category, report_date, physician, status
    FROM lab_results
    WHERE patient_id = ?
    ORDER BY report_date DESC
  `).all(userId);

  res.json({ results });
});

// ----------------------------------------------------------------------
// GET /api/lab-results/:reportId
// Get full details of a specific lab report
// ----------------------------------------------------------------------
router.get('/:reportId', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const { reportId } = req.params;

  const result = db.prepare(`
    SELECT lr.*, u.full_name AS patient_name, u.patient_id
    FROM lab_results lr
    JOIN users u ON lr.patient_id = u.id
    WHERE lr.report_id = ? AND lr.patient_id = ?
  `).get(reportId, userId);

  if (!result) {
    return res.status(404).json({ error: 'Lab result not found' });
  }

  // Parse the JSON components string into an array
  let details = [];
  if (result.details_json) {
    try {
      details = JSON.parse(result.details_json);
    } catch (err) {
      console.error('Failed to parse details_json:', err);
      details = [];
    }
  }

  res.json({
    result: {
      id: result.id,
      report_id: result.report_id,
      test_name: result.test_name,
      category: result.category,
      report_date: result.report_date,
      physician: result.physician,
      status: result.status,
      doctor_comment: result.doctor_comment,
      details,
      patient: {
        full_name: result.patient_name,
        patient_id: result.patient_id
      }
    }
  });
});

module.exports = router;