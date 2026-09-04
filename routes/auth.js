// routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('../db');
const router = express.Router();

// ----------------------------------------------------------------------
// Configure Nodemailer transporter (Gmail SMTP)
// ----------------------------------------------------------------------
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

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
// Helper: get the correct base URL for links in emails
// Reads X-Forwarded-Host and X-Forwarded-Proto when behind a proxy/tunnel.
// Falls back to BASE_URL or request host when those headers are absent.
// ----------------------------------------------------------------------
function getBaseUrl(req) {
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }

  const forwardedHost = req.get('x-forwarded-host');
  const host = forwardedHost || req.get('host');
  const forwardedProto = req.get('x-forwarded-proto');
  const protocol = forwardedProto || req.protocol || 'http';

  return `${protocol}://${host}`;
}

// ----------------------------------------------------------------------
// Helper: send verification email
// ----------------------------------------------------------------------
async function sendVerificationEmail(toEmail, token, baseUrl) {
  const verificationLink = `${baseUrl}/api/auth/verify-email?token=${token}`;

  await transporter.sendMail({
    from: `"Hospital Companion" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Verify Your Email Address',
    text: `Welcome to Hospital Companion! Please verify your email address by clicking the link below:\n\n${verificationLink}\n\nThis link will expire in 30 minutes. If you did not create an account, please ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16326B;">Verify Your Email Address</h2>
        <p>Welcome to Hospital Companion! Please click the button below to verify your email address and activate your account.</p>
        <p><a href="${verificationLink}" style="display: inline-block; background: #3D5AF1; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Verify Email</a></p>
        <p>If the button doesn't work, copy and paste this link into your web browser:</p>
        <p>${verificationLink}</p>
        <p>This link expires in 30 minutes. If you did not create an account, you can safely ignore this email.</p>
      </div>
    `,
  });
}

// ----------------------------------------------------------------------
// POST /api/auth/signup
// Create new account (unverified) and send verification email
// ----------------------------------------------------------------------
router.post('/signup', async (req, res) => {
  const { full_name, email, password, phone, dob } = req.body;

  if (!full_name || !email || !password) {
    return res.status(400).json({ error: 'Full name, email, and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existingUser) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  let patientId;
  do {
    patientId = String(Math.floor(10000 + Math.random() * 90000));
  } while (db.prepare('SELECT id FROM users WHERE patient_id = ?').get(patientId));

  const insertUser = db.prepare(`
    INSERT INTO users (full_name, email, password_hash, phone, dob, patient_id, is_verified)
    VALUES (?, ?, ?, ?, ?, ?, 0)
  `);
  const result = insertUser.run(full_name, email, passwordHash, phone || null, dob || null, patientId);
  const userId = result.lastInsertRowid;

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30).toISOString();
  db.prepare('INSERT INTO email_verifications (user_id, token, expires_at) VALUES (?, ?, ?)')
    .run(userId, token, expiresAt);

  try {
    const baseUrl = getBaseUrl(req);
    await sendVerificationEmail(email, token, baseUrl);
  } catch (error) {
    db.prepare('DELETE FROM email_verifications WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    console.error('Error sending verification email:', error);
    return res.status(500).json({ error: 'Could not send verification email. Please try again.' });
  }

  res.status(201).json({ message: 'Verification email sent. Please check your inbox.' });
});

// ----------------------------------------------------------------------
// POST /api/auth/login
// Log in an existing user (must be verified)
// ----------------------------------------------------------------------
router.post('/login', (req, res) => {
  const { email, password, remember } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const passwordMatch = bcrypt.compareSync(password, user.password_hash);
  if (!passwordMatch) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (!user.is_verified) {
    return res.status(403).json({ error: 'Please verify your email before logging in.' });
  }

  db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id);

  // Set session user ID
  req.session.userId = user.id;

  // Remember me functionality: extend cookie maxAge if requested
  if (remember === true) {
    // 30 days
    req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30;
  } else {
    // 1 day
    req.session.cookie.maxAge = 1000 * 60 * 60 * 24;
  }

  const safeUser = {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone,
    dob: user.dob,
    patient_id: user.patient_id,
    last_login: user.last_login
  };

  // Explicitly save the session so the cookie is updated immediately
  req.session.save((err) => {
    if (err) {
      console.error('Session save error:', err);
      return res.status(500).json({ error: 'Could not save session' });
    }
    res.json({ user: safeUser });
  });
});

// ----------------------------------------------------------------------
// POST /api/auth/logout
// Destroy the session
// ----------------------------------------------------------------------
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

// ----------------------------------------------------------------------
// GET /api/auth/me
// Get current authenticated user
// ----------------------------------------------------------------------
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, full_name, email, phone, dob, patient_id, last_login FROM users WHERE id = ?').get(req.session.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user });
});

// ----------------------------------------------------------------------
// GET /api/auth/verify-email?token=...
// Verify email and activate account
// ----------------------------------------------------------------------
router.get('/verify-email', (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.redirect('/mediportal-signin.html?verify_error=1');
  }

  const verificationEntry = db.prepare('SELECT * FROM email_verifications WHERE token = ?').get(token);
  if (!verificationEntry) {
    return res.redirect('/mediportal-signin.html?verify_error=1');
  }

  if (new Date(verificationEntry.expires_at) < new Date()) {
    db.prepare('DELETE FROM email_verifications WHERE token = ?').run(token);
    return res.redirect('/mediportal-signin.html?verify_error=1');
  }

  db.prepare('UPDATE users SET is_verified = 1 WHERE id = ?').run(verificationEntry.user_id);
  db.prepare('DELETE FROM email_verifications WHERE token = ?').run(token);

  res.redirect('/mediportal-signin.html?verified=1');
});

// ----------------------------------------------------------------------
// POST /api/auth/forgot-password
// Generate reset token and send real email
// ----------------------------------------------------------------------
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

    if (user) {
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 1000 * 60 * 30).toISOString();

      db.prepare('INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)')
        .run(user.id, token, expiresAt);

      const baseUrl = getBaseUrl(req);
      const resetLink = `${baseUrl}/mediportal-reset-password.html?token=${token}`;

      await transporter.sendMail({
        from: `"Hospital Companion" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Password Reset Request',
        text: `You requested a password reset. Click the following link to reset your password:\n\n${resetLink}\n\nThis link will expire in 30 minutes. If you did not request this, please ignore this email.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16326B;">Password Reset Request</h2>
            <p>You requested a password reset for your Hospital Companion account.</p>
            <p><a href="${resetLink}" style="display: inline-block; background: #3D5AF1; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Reset Password</a></p>
            <p>If the button doesn't work, copy and paste this link into your web browser:</p>
            <p>${resetLink}</p>
            <p>This link expires in 30 minutes. If you did not request a password reset, you can safely ignore this email.</p>
          </div>
        `,
      });
    }

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Error sending password reset email:', error);
    res.status(500).json({ error: 'Failed to process request. Please try again later.' });
  }
});

// ----------------------------------------------------------------------
// POST /api/auth/reset-password
// Reset password using token
// ----------------------------------------------------------------------
router.post('/reset-password', (req, res) => {
  const { token, new_password } = req.body;

  if (!token || !new_password) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const resetEntry = db.prepare('SELECT * FROM password_resets WHERE token = ?').get(token);
  if (!resetEntry) {
    return res.status(400).json({ error: 'Invalid or expired token' });
  }

  if (new Date(resetEntry.expires_at) < new Date()) {
    db.prepare('DELETE FROM password_resets WHERE token = ?').run(token);
    return res.status(400).json({ error: 'Token has expired' });
  }

  const newHash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, resetEntry.user_id);
  db.prepare('DELETE FROM password_resets WHERE token = ?').run(token);

  res.json({ message: 'Password reset successful. You can now sign in.' });
});

// ----------------------------------------------------------------------
// POST /api/auth/change-password
// Change password for logged-in user
// ----------------------------------------------------------------------
router.post('/change-password', requireAuth, (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.session.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const passwordMatch = bcrypt.compareSync(current_password, user.password_hash);
  if (!passwordMatch) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const newHash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.session.userId);

  res.json({ message: 'Password changed successfully' });
});

module.exports = router;