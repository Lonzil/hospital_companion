// db.js
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');

// Connect to SQLite database (creates file if it doesn't exist)
const db = new Database(path.join(__dirname, 'hospital.db'));

// Enable foreign key constraints and WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ----------------------------------------------------------------------
// Create tables
// ----------------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    phone TEXT,
    dob TEXT,
    patient_id TEXT UNIQUE NOT NULL,
    is_verified INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    last_login TEXT
  );

  CREATE TABLE IF NOT EXISTS doctors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    specialty TEXT,
    role TEXT,
    avatar_url TEXT
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    reason TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (patient_id) REFERENCES users(id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
  );

  CREATE TABLE IF NOT EXISTS lab_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    report_id TEXT UNIQUE NOT NULL,
    test_name TEXT NOT NULL,
    category TEXT,
    report_date TEXT,
    physician TEXT,
    status TEXT,
    details_json TEXT,
    doctor_comment TEXT,
    FOREIGN KEY (patient_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT,
    message TEXT,
    category TEXT,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS encouragements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    message TEXT,
    context TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    user_id INTEGER PRIMARY KEY,
    email_notifications INTEGER DEFAULT 1,
    sms_notifications INTEGER DEFAULT 1,
    appointment_reminders INTEGER DEFAULT 1,
    lab_results_notifications INTEGER DEFAULT 1,
    health_tips INTEGER DEFAULT 0,
    reminder_frequency TEXT DEFAULT '1 day before',
    reminder_time TEXT DEFAULT 'Morning',
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS email_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// ----------------------------------------------------------------------
// Migration: add is_verified column if missing (for existing databases)
// ----------------------------------------------------------------------
const userColumns = db.pragma('table_info(users)');
const hasIsVerified = userColumns.some(column => column.name === 'is_verified');
if (!hasIsVerified) {
  db.exec('ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0');
}

// ----------------------------------------------------------------------
// Seed initial data (only if users table is empty)
// ----------------------------------------------------------------------
function seedIfEmpty() {
  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  if (userCount > 0) {
    console.log('Database already contains data. Skipping seed.');
    return;
  }

  console.log('Seeding database with demo data...');

  // 1. Insert demo patient (verified)
  const passwordHash = bcrypt.hashSync('password123', 10);
  const insertUser = db.prepare(`
    INSERT INTO users (full_name, email, password_hash, phone, dob, patient_id, is_verified, created_at, last_login)
    VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
  `);
  const userResult = insertUser.run(
    'Sarah Jenkins',
    's.jenkins@example.com',
    passwordHash,
    '+1 (555) 0123-4567',
    'May 12, 1988',
    '99281'
  );
  const sarahId = userResult.lastInsertRowid;

  // 2. Insert doctors
  const insertDoctor = db.prepare(`
    INSERT INTO doctors (name, specialty, role, avatar_url)
    VALUES (?, ?, ?, ?)
  `);

  const doctorEleanor = insertDoctor.run('Dr. Eleanor Vance', 'Cardiology', 'Senior Cardiologist', 'https://i.pravatar.cc/120?img=11').lastInsertRowid;
  const doctorMarcus = insertDoctor.run('Dr. Marcus Thorne', 'Neurology', 'Chief Neurologist', 'https://i.pravatar.cc/120?img=12').lastInsertRowid;
  const doctorSarah = insertDoctor.run('Dr. Sarah Mitchell', 'Hematology', 'Hematologist', 'https://i.pravatar.cc/120?img=13').lastInsertRowid;
  const doctorRobert = insertDoctor.run('Dr. Robert Miller', 'Endocrinology', 'Endocrinologist', 'https://i.pravatar.cc/120?img=14').lastInsertRowid;

  // 3. Insert appointments (dynamic future dates relative to today)
  const insertAppointment = db.prepare(`
    INSERT INTO appointments (patient_id, doctor_id, date, time, status, reason, created_at)
    VALUES (?, ?, date('now', '+5 days'), ?, ?, ?, datetime('now'))
  `);

  insertAppointment.run(sarahId, doctorEleanor, '10:30 AM', 'confirmed', 'Routine cardiovascular follow-up and lipid panel review.');
  insertAppointment.run(sarahId, doctorMarcus, '02:15 PM', 'pending', 'General neurological consultation.');

  // 4. Insert lab results
  const insertLabResult = db.prepare(`
    INSERT INTO lab_results (patient_id, report_id, test_name, category, report_date, physician, status, details_json, doctor_comment)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const cbcComponents = [
    { component: 'Hemoglobin', result: '14.2 g/dL', normal: '12.0 - 15.5 g/dL', status: 'Normal' },
    { component: 'White Blood Cells (WBC)', result: '6.8 x10³/µL', normal: '4.5 - 11.0 x10³/µL', status: 'Normal' },
    { component: 'Platelets', result: '245 x10³/µL', normal: '150 - 450 x10³/µL', status: 'Normal' },
    { component: 'Red Blood Cells (RBC)', result: '4.8 million/µL', normal: '4.2 - 5.4 million/µL', status: 'Normal' },
    { component: 'Hematocrit', result: '42%', normal: '37% - 48%', status: 'Normal' },
    { component: 'Mean Corpuscular Volume (MCV)', result: '88 fL', normal: '80 - 100 fL', status: 'Normal' }
  ];

  // CBC (detailed)
  insertLabResult.run(
    sarahId,
    'LR-2023-001',
    'Complete Blood Count (CBC)',
    'Hematology',
    '2023-10-20',
    'Dr. Sarah Mitchell',
    'Normal',
    JSON.stringify(cbcComponents),
    'Your blood counts are within the standard reference ranges. No signs of anemia or infection were detected in this sample. Continue with your current health regimen.'
  );

  // Lipid Panel
  insertLabResult.run(
    sarahId,
    'LR-2023-002',
    'Lipid Panel',
    'Cardiology',
    '2023-10-15',
    'Dr. Eleanor Vance',
    'Abnormal',
    JSON.stringify([
      { component: 'Total Cholesterol', result: '220 mg/dL', normal: '<200 mg/dL', status: 'Abnormal' },
      { component: 'HDL', result: '45 mg/dL', normal: '>40 mg/dL', status: 'Normal' },
      { component: 'LDL', result: '150 mg/dL', normal: '<100 mg/dL', status: 'Abnormal' },
      { component: 'Triglycerides', result: '160 mg/dL', normal: '<150 mg/dL', status: 'Abnormal' }
    ]),
    'Your LDL cholesterol is slightly elevated. We recommend dietary changes and follow-up in 3 months.'
  );

  // Metabolic Panel
  insertLabResult.run(
    sarahId,
    'LR-2023-003',
    'Metabolic Panel (CMP)',
    'Biochemistry',
    '2023-09-28',
    'Dr. Sarah Mitchell',
    'Normal',
    JSON.stringify([
      { component: 'Glucose', result: '90 mg/dL', normal: '70-100 mg/dL', status: 'Normal' },
      { component: 'Sodium', result: '140 mEq/L', normal: '135-145 mEq/L', status: 'Normal' },
      { component: 'Potassium', result: '4.2 mEq/L', normal: '3.5-5.0 mEq/L', status: 'Normal' },
      { component: 'Creatinine', result: '0.9 mg/dL', normal: '0.6-1.2 mg/dL', status: 'Normal' }
    ]),
    'All metabolic parameters are within normal limits.'
  );

  // TSH
  insertLabResult.run(
    sarahId,
    'LR-2023-004',
    'Thyroid Stimulating Hormone (TSH)',
    'Endocrinology',
    '2023-08-12',
    'Dr. Robert Miller',
    'Normal',
    JSON.stringify([
      { component: 'TSH', result: '2.5 mIU/L', normal: '0.4-4.0 mIU/L', status: 'Normal' }
    ]),
    'Thyroid function is normal.'
  );

  // Vitamin D
  insertLabResult.run(
    sarahId,
    'LR-2023-005',
    'Vitamin D, 25-Hydroxy',
    'Nutrition',
    '2023-07-05',
    'Dr. Eleanor Vance',
    'Abnormal',
    JSON.stringify([
      { component: 'Vitamin D', result: '18 ng/mL', normal: '30-100 ng/mL', status: 'Abnormal' }
    ]),
    'Your vitamin D level is low. Consider supplementation and increased sun exposure.'
  );

  // 5. Insert notifications
  const insertNotification = db.prepare(`
    INSERT INTO notifications (user_id, title, message, category, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertNotification.run(sarahId, 'Appointment Confirmed', 'Your cardiology follow-up with Dr. Eleanor Vance is confirmed for Oct 24 at 10:30 AM.', 'appointment', 0, "datetime('now', '-10 minutes')");
  insertNotification.run(sarahId, 'New Lab Result Available', 'Your Complete Blood Count (CBC) results from Oct 20 are now ready for viewing.', 'lab', 0, "datetime('now', '-2 hours')");
  insertNotification.run(sarahId, 'AI Message Received', 'Dr. Sarah Mitchell replied to your inquiry regarding dosage instructions.', 'message', 1, "datetime('now', '-5 hours')");
  insertNotification.run(sarahId, 'Prescription Refill Approved', 'Your refill request for Lisinopril 10mg has been successfully processed.', 'prescription', 1, "datetime('now', '-1 day')");
  insertNotification.run(sarahId, 'Health Profile Update', 'Your insurance information was successfully verified and updated in our system.', 'profile', 1, "datetime('now', '-2 days')");

  // 6. Insert encouragements
  const insertEncouragement = db.prepare(`
    INSERT INTO encouragements (user_id, message, context, created_at)
    VALUES (?, ?, ?, ?)
  `);

  insertEncouragement.run(sarahId, 'Your recent lab results show positive trends in your lipid levels. Keep up the great work...', 'lab', "datetime('now', '-7 days')");
  insertEncouragement.run(sarahId, 'Recovery is a journey, not a race. Small daily victories lead to long-term health...', 'wellness', "datetime('now', '-14 days')");
  insertEncouragement.run(sarahId, 'Starting a new routine takes courage. We\'re proud of the commitment you\'ve shown...', 'treatment', "datetime('now', '-21 days')");

  // 7. Insert default settings
  db.prepare(`
    INSERT INTO settings (user_id, email_notifications, sms_notifications, appointment_reminders, lab_results_notifications, health_tips, reminder_frequency, reminder_time)
    VALUES (?, 1, 1, 1, 1, 0, '1 day before', 'Morning')
  `).run(sarahId);

  console.log('Seed data inserted successfully.');
}

// Run seed if needed
seedIfEmpty();

// Export the database instance for use in routes
module.exports = db;