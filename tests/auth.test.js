// tests/auth.test.js
const BASE_URL = 'http://localhost:3000';

// Simple cookie jar
let cookies = '';

function updateCookies(response) {
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    // Simple handling: just append the first part (session cookie)
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

async function testAuth() {
  console.log('\n=== Testing Authentication ===\n');

  // 1. Signup
  const uniqueEmail = `test_${Date.now()}@example.com`;
  console.log(`1. Signup with ${uniqueEmail}`);
  const signup = await apiRequest('POST', '/api/auth/signup', {
    full_name: 'Test User',
    email: uniqueEmail,
    password: 'password123',
    phone: '+1234567890',
    dob: '1990-01-01',
  });
  console.log(`   Status: ${signup.status}`);
  if (signup.status === 201) {
    console.log(`   ✅ Signup successful. Patient ID: ${signup.data.user.patient_id}`);
  } else {
    console.log(`   ❌ Signup failed:`, signup.data);
    return;
  }

  // 2. Check /me after signup (should be logged in)
  console.log('2. GET /api/auth/me');
  const me = await apiRequest('GET', '/api/auth/me');
  console.log(`   Status: ${me.status}`);
  if (me.status === 200) {
    console.log(`   ✅ Logged in as: ${me.data.user.full_name}`);
  } else {
    console.log(`   ❌ /me failed:`, me.data);
  }

  // 3. Logout
  console.log('3. POST /api/auth/logout');
  const logout = await apiRequest('POST', '/api/auth/logout');
  console.log(`   Status: ${logout.status}`);
  if (logout.status === 200) {
    console.log('   ✅ Logged out');
  }

  // 4. Check /me after logout (should be 401)
  console.log('4. GET /api/auth/me after logout');
  const meAfterLogout = await apiRequest('GET', '/api/auth/me');
  console.log(`   Status: ${meAfterLogout.status}`);
  if (meAfterLogout.status === 401) {
    console.log('   ✅ Protected route correctly blocked');
  } else {
    console.log('   ❌ Expected 401 but got', meAfterLogout.status);
  }

  // 5. Login with seeded user (Sarah Jenkins)
  console.log('5. Login with seeded user');
  const login = await apiRequest('POST', '/api/auth/login', {
    email: 's.jenkins@example.com',
    password: 'password123',
  });
  console.log(`   Status: ${login.status}`);
  if (login.status === 200) {
    console.log(`   ✅ Login successful. Welcome ${login.data.user.full_name}`);
  } else {
    console.log('   ❌ Login failed:', login.data);
  }

  console.log('\n=== Auth Testing Complete ===\n');
}

testAuth().catch((err) => {
  console.error('Test script error:', err);
});