// public/js/auth-redirect.js
function redirectToLogin() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const redirectParam = encodeURIComponent(currentPage + window.location.search);
  window.location.href = `mediportal-signin.html?redirect=${redirectParam}`;
}