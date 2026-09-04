# Hospital Companion (MediPortal)

An AI-assisted web application for a hospital patient portal that allows patients to book appointments, view lab results, get AI support, receive encouragement, manage notifications, update settings, and contact help.

Built as a third-year CS mini project.

## Features

- User signup with email verification (using Gmail SMTP)
- Login with "Remember me" option
- Password reset via email
- Role-based access (patient only)
- Dashboard with health overview
- Appointment booking wizard (Department → Doctor → Schedule → Confirm)
- Appointment list with tabs (Upcoming, Past, Cancelled)
- Appointment details, reschedule, and cancel
- Lab results list, detail view, and search
- AI Support chat (using Groq API / Llama model)
- AI Encouragement messages
- Notifications with filter and mark-as-read
- Profile and settings management
- Reminder settings

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript, Bootstrap 5, Inter font
- **Backend:** Node.js, Express 5
- **Database:** SQLite (better-sqlite3)
- **AI:** Groq SDK (Llama models)
- **Email:** Nodemailer (Gmail SMTP)
- **Session:** express-session with SQLite store
- **Security:** bcrypt, parameterised queries, secure cookies

## Project Structure

```
HOSPITAL_COMPANION/
├── middleware/
│   └── protectPages.js       # Server-side page protection
├── public/
│   ├── js/
│   │   ├── auth-redirect.js
│   │   └── logout.js
│   ├── index.html
│   ├── about.html
│   ├── contact-help.html
│   ├── faqs.html
│   ├── privacy-policy.html
│   ├── terms-of-service.html
│   ├── mediportal-signin.html
│   ├── mediportal-signup.html
│   ├── mediportal-forgot-password.html
│   ├── mediportal-reset-password.html
│   └── ... (protected pages)
├── routes/
│   ├── auth.js
│   ├── dashboard.js
│   ├── doctors.js
│   ├── appointments.js
│   ├── labResults.js
│   ├── notifications.js
│   ├── ai.js
│   ├── settings.js
│   └── profile.js
├── db.js
├── server.js
├── package.json
├── .env
├── .gitignore
└── README.md
```


## Setup Locally

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. Create `.env` file in root with:

   ```env
   SESSION_SECRET=your_super_secret_random_string_here
   GROQ_API_KEY=your_groq_api_key
   PORT=3000
   EMAIL_USER=your_gmail@gmail.com
   EMAIL_PASS=your_gmail_app_password
   BASE_URL=http://localhost:3000
   ```

   For email, enable 2FA on your Google account and create an App Password.

3. Run the server:

   ```bash
   npm start
   ```

   Or with auto-restart (development):

   ```bash
   npm run dev
   ```

4. Open `http://localhost:3000`.

## Demo Credentials

A pre-seeded patient account exists for demonstration:

- Email: `s.jenkins@example.com`
- Password: `password123`
- Patient ID: `99281`

## API Endpoints Overview

| Method | Endpoint                         | Description                          |
|--------|----------------------------------|--------------------------------------|
| POST   | `/api/auth/signup`               | Create account, send verification email |
| POST   | `/api/auth/login`                | Login, set session                   |
| POST   | `/api/auth/logout`               | Logout, destroy session              |
| GET    | `/api/auth/me`                   | Get current user                     |
| POST   | `/api/auth/forgot-password`      | Request password reset               |
| POST   | `/api/auth/reset-password`       | Reset password with token            |
| POST   | `/api/auth/change-password`      | Change password (logged in)          |
| GET    | `/api/dashboard`                 | Dashboard summary data               |
| GET    | `/api/doctors`                   | List doctors                         |
| GET    | `/api/appointments`              | List appointments (filter by status) |
| POST   | `/api/appointments`              | Book appointment                     |
| GET    | `/api/appointments/:id`          | Get appointment details              |
| PUT    | `/api/appointments/:id`          | Update (reschedule/cancel)           |
| DELETE | `/api/appointments/:id`          | Cancel appointment                   |
| GET    | `/api/lab-results`               | List lab results                     |
| GET    | `/api/lab-results/search?query=` | Search lab results                   |
| GET    | `/api/lab-results/:reportId`     | Get lab report detail                |
| GET    | `/api/notifications`             | List notifications                   |
| PUT    | `/api/notifications/read-all`    | Mark all notifications as read       |
| PUT    | `/api/notifications/:id/read`    | Mark one notification as read        |
| POST   | `/api/ai/message`                | Chat with AI                         |
| GET    | `/api/ai/encouragement`          | Generate encouragement               |
| GET    | `/api/ai/history`                | Get encouragement history            |
| GET    | `/api/settings`                  | Get user settings                    |
| PUT    | `/api/settings`                  | Update settings                      |
| GET    | `/api/profile`                   | Get profile                          |
| PUT    | `/api/profile`                   | Update profile                       |

## Deployment

### Recommended: Render (Free tier)

1. Push your code to a Git repository (GitHub, GitLab).
2. Create a new Web Service on Render and connect the repo.
3. Set the build command: `npm install`
4. Set the start command: `npm start`
5. Add environment variables from your `.env`.
6. Add a persistent disk (Render allows one for free tier) and mount it at `/opt/render/project/src/data` to keep the SQLite database persistent.
7. In your `db.js`, change the database path to use a directory like `./data/hospital.db` so it writes to the persistent disk.
8. Deploy.

### Alternative: Railway

1. Push code to GitHub.
2. Create new project on Railway and deploy from GitHub.
3. Add environment variables.
4. Add a Volume for persistence if needed.

> **Note:** The SQLite database file must be on a persistent volume; otherwise it will be reset on each deploy.

## Security Notes

- `secure: 'auto'` ensures Secure cookies when behind HTTPS.
- `sameSite: 'lax'` helps prevent CSRF.
- Passwords are hashed with bcrypt.
- All SQL queries use parameterised statements.
- The AI model is restricted to non-clinical support.
- The `protectPages` middleware prevents unauthenticated access to protected pages.

## License

This project is for educational purposes.