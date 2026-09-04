// tests/remember.test.js
const BASE_URL = 'http://localhost:3000';

// Simple cookie jar
let cookies = '';

function updateCookies(response) {
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    // Store the full Set-Cookie string for later inspection
    cookies = setCookie;
  }
}

async function apiRequest(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookies) {
    headers['Cookie'] = cookies.split(';')[0]; // only the first cookie part
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
  return { status: response.status, data, setCookie: cookies };
}

function parseExpires(setCookieHeader) {
  if (!setCookieHeader) return null;
  const expiresMatch = setCookieHeader.match(/Expires=([^;]+)/i);
  if (expiresMatch) {
    return new Date(expiresMatch[1]);
  }
  const maxAgeMatch = setCookieHeader.match(/Max-Age=(\d+)/i);
  if (maxAgeMatch) {
    const maxAgeSeconds = parseInt(maxAgeMatch[1], 10);
    return new Date(Date.now() + maxAgeSeconds * 1000);
  }
  return null;
}

async function testRememberMe() {
  console.log('\n=== Testing Remember Me Functionality ===\n');

  // 1. Login WITHOUT "remember me"
  cookies = '';
  console.log('1. Login WITHOUT remember me');
  const loginNoRemember = await apiRequest('POST', '/api/auth/login', {
    email: 's.jenkins@example.com',
    password: 'password123',
    remember: false
  });

  if (loginNoRemember.status !== 200) {
    console.log('   ❌ Login failed:', loginNoRemember.data);
    return;
  }
  console.log('   ✅ Login successful');

  const expiresNoRemember = parseExpires(loginNoRemember.setCookie);
  if (expiresNoRemember) {
    const durationMs = expiresNoRemember.getTime() - Date.now();
    const durationDays = durationMs / (1000 * 60 * 60 * 24);
    console.log(`   Session cookie expires in approximately ${durationDays.toFixed(1)} days`);
  } else {
    console.log('   ⚠️ Could not determine cookie expiry');
  }

  // 2. Login WITH "remember me"
  cookies = '';
  console.log('2. Login WITH remember me');
  const loginWithRemember = await apiRequest('POST', '/api/auth/login', {
    email: 's.jenkins@example.com',
    password: 'password123',
    remember: true
  });

  if (loginWithRemember.status !== 200) {
    console.log('   ❌ Login failed:', loginWithRemember.data);
    return;
  }
  console.log('   ✅ Login successful');

  const expiresWithRemember = parseExpires(loginWithRemember.setCookie);
  if (expiresWithRemember) {
    const durationMs = expiresWithRemember.getTime() - Date.now();
    const durationDays = durationMs / (1000 * 60 * 60 * 24);
    console.log(`   Session cookie expires in approximately ${durationDays.toFixed(1)} days`);
  } else {
    console.log('   ⚠️ Could not determine cookie expiry');
  }

  // Compare
  if (expiresNoRemember && expiresWithRemember) {
    const diffDays = (expiresWithRemember.getTime() - expiresNoRemember.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 1) {
      console.log('   ✅ Remember me extends session significantly.');
    } else {
      console.log('   ❌ Remember me does not seem to extend session.');
    }
  }

  console.log('\n=== Remember Me Testing Complete ===\n');
}

testRememberMe().catch((err) => {
  console.error('Test script error:', err);
});