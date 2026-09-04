// public/js/logout.js
document.addEventListener('click', function (e) {
  const link = e.target.closest('a[href="mediportal-signin.html"]');
  if (!link) return;

  e.preventDefault();

  fetch('/api/auth/logout', { method: 'POST' })
    .finally(() => {
      window.location.href = 'mediportal-signin.html';
    });
});