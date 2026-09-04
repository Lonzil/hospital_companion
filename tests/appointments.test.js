// tests/appointments.test.js
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
  if (cookies) headers['Cookie'] = cookies;
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

async function testAppointments() {
  console.log('\n=== Testing Appointments ===\n');

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

  // Get doctors
  console.log('2. GET /api/doctors');
  const doctorsRes = await apiRequest('GET', '/api/doctors');
  if (doctorsRes.status !== 200) {
    console.log('   ❌ Doctors fetch failed:', doctorsRes.data);
    return;
  }
  console.log(`   ✅ Got ${doctorsRes.data.doctors.length} doctors`);

  // List appointments (upcoming)
  console.log('3. GET /api/appointments?status=upcoming');
  const listRes = await apiRequest('GET', '/api/appointments?status=upcoming');
  if (listRes.status !== 200) {
    console.log('   ❌ Appointments list failed:', listRes.data);
    return;
  }
  console.log(`   ✅ Upcoming appointments: ${listRes.data.appointments.length}`);

  // Book a new appointment
  console.log('4. POST /api/appointments (book new)');
  const doctor = doctorsRes.data.doctors[0]; // first doctor
  const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 10 days ahead
  const bookRes = await apiRequest('POST', '/api/appointments', {
    doctor_id: doctor.id,
    date: futureDate,
    time: '11:00 AM',
    reason: 'Test appointment booking'
  });
  if (bookRes.status !== 201) {
    console.log('   ❌ Booking failed:', bookRes.data);
    return;
  }
  console.log(`   ✅ Booked appointment ID: ${bookRes.data.appointment.id}`);

  // Get appointment details
  const apptId = bookRes.data.appointment.id;
  console.log('5. GET /api/appointments/:id');
  const detailRes = await apiRequest('GET', `/api/appointments/${apptId}`);
  if (detailRes.status !== 200) {
    console.log('   ❌ Detail fetch failed:', detailRes.data);
    return;
  }
  console.log(`   ✅ Detail: ${detailRes.data.appointment.doctor_name} on ${detailRes.data.appointment.date}`);

  // Reschedule appointment
  console.log('6. PUT /api/appointments/:id (reschedule)');
  const newDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const updateRes = await apiRequest('PUT', `/api/appointments/${apptId}`, {
    date: newDate,
    time: '02:00 PM',
    reason: 'Rescheduled test appointment'
  });
  if (updateRes.status !== 200) {
    console.log('   ❌ Reschedule failed:', updateRes.data);
    return;
  }
  console.log(`   ✅ Updated date to ${updateRes.data.appointment.date}`);

  // Cancel appointment
  console.log('7. DELETE /api/appointments/:id (cancel)');
  const cancelRes = await apiRequest('DELETE', `/api/appointments/${apptId}`);
  if (cancelRes.status !== 200) {
    console.log('   ❌ Cancel failed:', cancelRes.data);
    return;
  }
  console.log('   ✅ Appointment cancelled');

  // Verify cancellation
  const verifyRes = await apiRequest('GET', `/api/appointments/${apptId}`);
  if (verifyRes.status === 200 && verifyRes.data.appointment.status === 'cancelled') {
    console.log('   ✅ Verification: status is cancelled');
  } else {
    console.log('   ⚠️ Verification not as expected:', verifyRes.data);
  }

  console.log('\n=== Appointments Testing Complete ===\n');
}

testAppointments().catch(err => {
  console.error('Test script error:', err);
});