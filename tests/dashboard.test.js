// tests/dashboard.test.js
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
  try { data = await response.json(); } catch { data = null; }
  return { status: response.status, data };
}

async function testDashboard() {
  console.log('\n=== Testing Dashboard ===\n');

  // Login as seeded user
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

  // Fetch dashboard
  console.log('2. GET /api/dashboard');
  const dashboard = await apiRequest('GET', '/api/dashboard');
  console.log(`   Status: ${dashboard.status}`);
  if (dashboard.status === 200) {
    console.log('   ✅ Dashboard data received:');
    console.log('   User:', dashboard.data.user.full_name);
    console.log('   Patient ID:', dashboard.data.user.patient_id);
    console.log('   Stats:', JSON.stringify(dashboard.data.stats));
    console.log('   Upcoming appointments:', dashboard.data.appointments.length);
    console.log('   Recent notifications:', dashboard.data.notifications.length);
    console.log('   Health goal:', dashboard.data.healthGoal.title);
  } else {
    console.log('   ❌ Dashboard failed:', dashboard.data);
  }

  console.log('\n=== Dashboard Testing Complete ===\n');
}

testDashboard().catch(err => {
  console.error('Test script error:', err);
});