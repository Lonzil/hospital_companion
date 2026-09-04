// tests/labResults.test.js
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

async function testLabResults() {
  console.log('\n=== Testing Lab Results ===\n');

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

  // 2. List all lab results
  console.log('2. GET /api/lab-results');
  const listRes = await apiRequest('GET', '/api/lab-results');
  if (listRes.status !== 200) {
    console.log('   ❌ Lab results list failed:', listRes.data);
    return;
  }
  const results = listRes.data.results;
  console.log(`   ✅ Got ${results.length} lab results`);
  if (results.length > 0) {
    console.log(`   First result: ${results[0].test_name} (${results[0].report_id})`);
  }

  // 3. Fetch details for CBC report
  console.log('3. GET /api/lab-results/LR-2023-001');
  const detailRes = await apiRequest('GET', '/api/lab-results/LR-2023-001');
  if (detailRes.status !== 200) {
    console.log('   ❌ Detail fetch failed:', detailRes.data);
    return;
  }
  const report = detailRes.data.result;
  console.log(`   ✅ Report: ${report.test_name}`);
  console.log(`   Status: ${report.status}`);
  console.log(`   Components: ${report.details.length}`);
  if (report.details.length > 0) {
    console.log(`   First component: ${report.details[0].component} = ${report.details[0].result}`);
  }
  console.log(`   Doctor comment: "${report.doctor_comment}"`);

  // 4. Search for "Lipid"
  console.log('4. GET /api/lab-results/search?query=Lipid');
  const searchRes = await apiRequest('GET', '/api/lab-results/search?query=Lipid');
  if (searchRes.status !== 200) {
    console.log('   ❌ Search failed:', searchRes.data);
    return;
  }
  const searchResults = searchRes.data.results;
  console.log(`   ✅ Search returned ${searchResults.length} result(s)`);
  if (searchResults.length > 0) {
    console.log(`   Found: ${searchResults[0].test_name} (${searchResults[0].report_id})`);
  }

  console.log('\n=== Lab Results Testing Complete ===\n');
}

testLabResults().catch((err) => {
  console.error('Test script error:', err);
});