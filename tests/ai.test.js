// tests/ai.test.js
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

async function testAI() {
  console.log('\n=== Testing AI Support ===\n');

  // 1. Login as seeded user
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

  // 2. Send a chat message
  console.log('2. POST /api/ai/message');
  const chatRes = await apiRequest('POST', '/api/ai/message', {
    message: "I'm feeling a bit anxious about my cardiology appointment."
  });
  if (chatRes.status !== 200) {
    console.log('   ❌ AI chat failed:', chatRes.data);
    return;
  }
  console.log('   ✅ AI reply received:');
  console.log(`   "${chatRes.data.reply}"`);

  // 3. Get an encouragement
  console.log('3. GET /api/ai/encouragement');
  const encRes = await apiRequest('GET', '/api/ai/encouragement');
  if (encRes.status !== 200) {
    console.log('   ❌ Encouragement failed:', encRes.data);
    return;
  }
  console.log('   ✅ Encouragement received:');
  console.log(`   "${encRes.data.message}"`);

  // 4. Get encouragement history
  console.log('4. GET /api/ai/history');
  const histRes = await apiRequest('GET', '/api/ai/history');
  if (histRes.status !== 200) {
    console.log('   ❌ History fetch failed:', histRes.data);
    return;
  }
  console.log(`   ✅ History count: ${histRes.data.history.length}`);

  console.log('\n=== AI Support Testing Complete ===\n');
}

testAI().catch((err) => {
  console.error('Test script error:', err);
});