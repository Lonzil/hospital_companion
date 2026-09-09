// middleware/protectPages.js

const protectedPages = [
  '/mediportal-dashboard.html',
  '/mediportal-appointment.html',
  '/mediportal-appointments-list.html',
  '/appointment-details.html',
  '/reschedule-appointment.html',
  '/lab-results.html',
  '/cbc-results.html',
  '/search-lab-results.html',
  '/ai-support.html',
  '/encouragement.html',
  '/notifications.html',
  '/mediportal-settings.html',
  '/reminder-settings.html',
  '/messages.html',
  '/health-profile.html'
];

function protectPages(req, res, next) {
  const path = req.path;

  if (protectedPages.includes(path)) {
    if (!req.session || !req.session.userId) {
      const redirectUrl = encodeURIComponent(req.originalUrl);
      return res.redirect(`/mediportal-signin.html?redirect=${redirectUrl}`);
    }
  }

  next();
}

module.exports = protectPages;