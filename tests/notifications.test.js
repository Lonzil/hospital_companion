// tests/notifications.test.js
const BASE_URL = 'http://localhost:3000';
let cookies = '';

function updateCookies(response) {
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    cookies = setCookie.split(';')[0];
  }
}

async function apiRequest(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookies) {
    headers['Cookie'] = cookies;
  }
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  updateCookies(response);
  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  return { status: response.status, data };
}

async function testNotifications() {
  console.log('\n=== Testing Notifications ===\n');

  // 1. Login as Sarah Jenkins
  console.log('1. Logging in as Sarah Jenkins...');
  const login = await apiRequest('POST', '/api/auth/login', {
    email: 's.jenkins@example.com',
    password: 'password123'
  });
  if (login.status !== 200) {
    console.log('   ❌ Login failed:', login.data);
    return;
  }
  console.log('   ✅ Login successful');

  // 2. Get all notifications
  console.log('2. GET /api/notifications?filter=all');
  const allRes = await apiRequest('GET', '/api/notifications?filter=all');
  if (allRes.status !== 200) {
    console.log('   ❌ Fetch all failed:', allRes.data);
    return;
  }
  const allNotifications = allRes.data.notifications;
  console.log(`   ✅ Total notifications: ${allNotifications.length}`);

  // 3. Get unread notifications
  console.log('3. GET /api/notifications?filter=unread');
  const unreadRes = await apiRequest('GET', '/api/notifications?filter=unread');
  if (unreadRes.status !== 200) {
    console.log('   ❌ Fetch unread failed:', unreadRes.data);
    return;
  }
  const unreadNotifications = unreadRes.data.notifications;
  console.log(`   ✅ Unread notifications: ${unreadNotifications.length}`);

  // 4. Mark one unread notification as read
  if (unreadNotifications.length > 0) {
    const firstUnreadId = unreadNotifications[0].id;
    console.log(`4. Mark notification #${firstUnreadId} as read`);
    const markOneRes = await apiRequest('PUT', `/api/notifications/${firstUnreadId}/read`);
    if (markOneRes.status !== 200) {
      console.log('   ❌ Mark one failed:', markOneRes.data);
      return;
    }
    console.log('   ✅ Marked one as read');
  } else {
    console.log('4. No unread notifications to mark (skipped)');
  }

  // 5. Get unread again
  console.log('5. GET /api/notifications?filter=unread (after marking one)');
  const unreadAfterOne = await apiRequest('GET', '/api/notifications?filter=unread');
  console.log(`   ✅ Unread count now: ${unreadAfterOne.data.notifications.length}`);

  // 6. Mark all as read
  console.log('6. Mark all as read');
  const markAllRes = await apiRequest('PUT', '/api/notifications/read-all');
  if (markAllRes.status !== 200) {
    console.log('   ❌ Mark all failed:', markAllRes.data);
    return;
  }
  console.log('   ✅ Marked all as read');

  // 7. Get unread after marking all
  console.log('7. GET /api/notifications?filter=unread (after marking all)');
  const unreadAfterAll = await apiRequest('GET', '/api/notifications?filter=unread');
  console.log(`   ✅ Unread count now: ${unreadAfterAll.data.notifications.length}`);

  console.log('\n=== Notifications Testing Complete ===\n');
}

testNotifications().catch((err) => {
  console.error('Test script error:', err);
});