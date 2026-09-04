// tests/settings.test.js
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

async function testSettingsAndProfile() {
  console.log('\n=== Testing Settings & Profile ===\n');

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

  // 2. Get profile
  console.log('2. GET /api/profile');
  const profileRes = await apiRequest('GET', '/api/profile');
  if (profileRes.status !== 200) {
    console.log('   ❌ Profile fetch failed:', profileRes.data);
    return;
  }
  console.log(`   ✅ Profile: ${profileRes.data.profile.full_name}, ${profileRes.data.profile.patient_id}`);

  // 3. Update profile
  console.log('3. PUT /api/profile (change phone)');
  const updateProfileRes = await apiRequest('PUT', '/api/profile', {
    phone: '+1 (555) 999-8888'
  });
  if (updateProfileRes.status !== 200) {
    console.log('   ❌ Profile update failed:', updateProfileRes.data);
    return;
  }
  console.log(`   ✅ Updated phone to: ${updateProfileRes.data.profile.phone}`);

  // 4. Get settings
  console.log('4. GET /api/settings');
  const settingsRes = await apiRequest('GET', '/api/settings');
  if (settingsRes.status !== 200) {
    console.log('   ❌ Settings fetch failed:', settingsRes.data);
    return;
  }
  console.log('   ✅ Settings:', JSON.stringify(settingsRes.data.settings));

  // 5. Update settings
  console.log('5. PUT /api/settings (toggle health_tips)');
  const updateSettingsRes = await apiRequest('PUT', '/api/settings', {
    health_tips: 1,
    reminder_time: 'Afternoon'
  });
  if (updateSettingsRes.status !== 200) {
    console.log('   ❌ Settings update failed:', updateSettingsRes.data);
    return;
  }
  console.log('   ✅ Updated settings:', JSON.stringify(updateSettingsRes.data.settings));

  // 6. Change password (optional, but we'll test if current password works)
  console.log('6. POST /api/auth/change-password');
  const changePwRes = await apiRequest('POST', '/api/auth/change-password', {
    current_password: 'password123',
    new_password: 'newpassword123'
  });
  if (changePwRes.status !== 200) {
    console.log('   ❌ Change password failed:', changePwRes.data);
    return;
  }
  console.log('   ✅ Password changed successfully');

  // 7. Restore original password (so seed login still works)
  console.log('7. Restore original password');
  const restorePwRes = await apiRequest('POST', '/api/auth/change-password', {
    current_password: 'newpassword123',
    new_password: 'password123'
  });
  if (restorePwRes.status !== 200) {
    console.log('   ⚠️ Could not restore original password:', restorePwRes.data);
  } else {
    console.log('   ✅ Original password restored');
  }

  console.log('\n=== Settings & Profile Testing Complete ===\n');
}

testSettingsAndProfile().catch((err) => {
  console.error('Test script error:', err);
});