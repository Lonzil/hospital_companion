// routes/ai.js
const express = require('express');
const db = require('../db');
const router = express.Router();
const Groq = require('groq-sdk');

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
// Groq client (optional)
// ----------------------------------------------------------------------
let groq = null;
if (process.env.GROQ_API_KEY) {
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
}

// ----------------------------------------------------------------------
// System prompt for the AI assistant
// ----------------------------------------------------------------------
const SYSTEM_PROMPT = `You are an empathetic AI companion for a hospital patient portal. 
You provide logistical and emotional support, not medical diagnosis. 
If the user asks clinical or medical questions, politely redirect them to their doctor or care team. 
You can guide them to book appointments, view lab results, and offer encouragement. 
Keep responses warm, concise, and supportive.`;

// ----------------------------------------------------------------------
// Helper: generate AI response using Groq
// ----------------------------------------------------------------------
async function generateAIResponse(userMessage) {
  if (!groq) {
    return "I'm here to support you. Please try again in a moment. If you need help with appointments or lab results, I can guide you.";
  }

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
    });

    const reply = completion.choices?.[0]?.message?.content?.trim();
    return reply || "I'm here to support you. How can I help?";
  } catch (err) {
    console.error('Groq API error:', err.message);
    return "I'm here to support you. Please try again in a moment.";
  }
}

// ----------------------------------------------------------------------
// GET /api/ai/history
// Return past encouragements from the database
// ----------------------------------------------------------------------
router.get('/history', requireAuth, (req, res) => {
  const userId = req.session.userId;

  const history = db.prepare(`
    SELECT id, message, context, created_at
    FROM encouragements
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId);

  res.json({ history });
});

// ----------------------------------------------------------------------
// GET /api/ai/encouragement
// Generate (or return fallback) encouragement and store it
// ----------------------------------------------------------------------
router.get('/encouragement', requireAuth, async (req, res) => {
  const userId = req.session.userId;

  // Get next upcoming appointment for context
  const upcoming = db.prepare(`
    SELECT a.date, a.time, d.name AS doctor_name, d.specialty
    FROM appointments a
    JOIN doctors d ON a.doctor_id = d.id
    WHERE a.patient_id = ? AND a.status != 'cancelled' AND a.date >= date('now')
    ORDER BY a.date ASC
    LIMIT 1
  `).get(userId);

  let prompt = `Write a short, warm, and encouraging message for me to help me feel supported in my healthcare journey.`;
  if (upcoming) {
    prompt = `The patient has an upcoming ${upcoming.specialty} appointment with ${upcoming.doctor_name} on ${upcoming.date} at ${upcoming.time}. Generate a short, warm, 2-sentence encouraging message to ease their nerves.`;
  }

  let message;
  if (!groq) {
    message = "You are doing a wonderful job taking care of your health. Keep going—you're stronger than you know!";
  } else {
    message = await generateAIResponse(prompt);
  }

  // Store the generated message
  db.prepare(`
    INSERT INTO encouragements (user_id, message, context, created_at)
    VALUES (?, ?, ?, datetime('now'))
  `).run(userId, message, 'generated');

  res.json({ message });
});

// ----------------------------------------------------------------------
// POST /api/ai/message
// Chat endpoint: accept user message, return AI response
// ----------------------------------------------------------------------
router.post('/message', requireAuth, async (req, res) => {
  const { message } = req.body;

  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message is required' });
  }

  const reply = await generateAIResponse(message.trim());
  res.json({ reply });
});

module.exports = router;