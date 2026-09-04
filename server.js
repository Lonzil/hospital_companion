// server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const db = require('./db'); // Ensure database is initialised
const protectPages = require('./middleware/protectPages'); // <-- new
const SqliteStore = require('better-sqlite3-session-store')(session); // <-- new

const app = express();
const PORT = process.env.PORT || 3000;

// ------------------------------------------------------------------
// Trust proxy headers (important for Cloudflare, Nginx, Render, etc.)
// ------------------------------------------------------------------
app.set('trust proxy', 1);

// ------------------------------------------------------------------
// Middleware
// ------------------------------------------------------------------
app.use(cors()); // Allow cross-origin requests (optional for same-origin)
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session configuration
app.use(
  session({
    store: new SqliteStore({
      client: db,           // ✅ Correct option name is "client", not "db"
      table: 'sessions',    // Table will be created automatically
    }),
    secret: process.env.SESSION_SECRET || 'default_secret_change_me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: 'auto',      // Automatically sends Secure flag only over HTTPS (works behind proxies)
      sameSite: 'lax',     // Additional CSRF protection
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);

// ------------------------------------------------------------------
// Protect static HTML pages that require authentication.
// This must come BEFORE express.static() so the protected page
// is never served to unauthenticated users.
// ------------------------------------------------------------------
app.use(protectPages);

// ------------------------------------------------------------------
// Serve static files from the 'public' directory
// ------------------------------------------------------------------
app.use(express.static(path.join(__dirname, 'public')));

// ------------------------------------------------------------------
// Root route: static middleware automatically serves index.html
// if it exists. No redirect needed.
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// API Routes
// ------------------------------------------------------------------
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/lab-results', require('./routes/labResults'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/profile', require('./routes/profile')); // optional, can be part of settings

// ------------------------------------------------------------------
// Health check endpoint (for testing)
// ------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', database: 'connected' });
});

// ------------------------------------------------------------------
// Fallback to index.html for SPA (optional, not needed for static multi-page)
// If you uncomment this, use a named wildcard for Express 5:
// app.get('/*splat', (req, res) => { ... });
// ------------------------------------------------------------------
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'mediportal-signin.html'));
// });

// ------------------------------------------------------------------
// 404 handler for unknown API routes
// NOTE: Express 5 does not allow '/api/*' with unnamed wildcard.
// Use '/api' to catch all unmatched API requests.
// ------------------------------------------------------------------
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// ------------------------------------------------------------------
// Global error handler
// ------------------------------------------------------------------
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ------------------------------------------------------------------
// Start server
// ------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`📁 Static files served from ${path.join(__dirname, 'public')}`);
});