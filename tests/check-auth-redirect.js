// tests/check-auth-redirect.js
// This script checks that accessing protected pages while logged out
// redirects to the sign-in page with the full URL (including query string) preserved.

const http = require('http');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// List of protected pages and sample query strings to test.
// The path should be relative to the base URL, e.g., '/appointment-details.html?id=3'
const testCases = [
  { page: '/appointment-details.html?id=3', expectedRedirect: '/mediportal-signin.html?redirect=%2Fappointment-details.html%3Fid%3D3' },
  { page: '/reschedule-appointment.html?id=7', expectedRedirect: '/mediportal-signin.html?redirect=%2Freschedule-appointment.html%3Fid%3D7' },
  { page: '/cbc-results.html?report=LR-2023-001', expectedRedirect: '/mediportal-signin.html?redirect=%2Fcbc-results.html%3Freport%3DLR-2023-001' },
  { page: '/ai-support.html', expectedRedirect: '/mediportal-signin.html?redirect=%2Fai-support.html' },
  { page: '/lab-results.html', expectedRedirect: '/mediportal-signin.html?redirect=%2Flab-results.html' }
];

function checkRedirect(testCase) {
  return new Promise((resolve) => {
    const url = new URL(testCase.page, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        // No cookie header to simulate logged-out user
      }
    };

    const req = http.request(options, (res) => {
      // We expect a 302 or 301 redirect
      const location = res.headers.location || '';
      const status = res.statusCode;

      // The server-side middleware should redirect before serving the page.
      // Status code 302 is typical for res.redirect().
      const isRedirect = status === 302 || status === 301;
      const isCorrectLocation = location === testCase.expectedRedirect;

      // Also accept if the location contains the encoded query string (some servers may encode differently)
      const locationMatches = decodeURIComponent(location).includes(testCase.page);

      res.resume(); // Consume response data to free up memory
      resolve({
        page: testCase.page,
        status,
        location,
        pass: isRedirect && (isCorrectLocation || locationMatches)
      });
    });

    req.on('error', (err) => {
      resolve({
        page: testCase.page,
        error: err.message,
        pass: false
      });
    });

    req.end();
  });
}

async function runTests() {
  console.log(`🔍 Checking auth-redirect fix against ${BASE_URL}\n`);
  let allPass = true;

  for (const testCase of testCases) {
    const result = await checkRedirect(testCase);
    if (result.pass) {
      console.log(`✅ PASS  ${result.page}`);
      console.log(`   Status: ${result.status}, Location: ${result.location}`);
    } else {
      allPass = false;
      console.log(`❌ FAIL  ${result.page}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      } else {
        console.log(`   Status: ${result.status}, Location: ${result.location}`);
        console.log(`   Expected Location to include: ${testCase.expectedRedirect}`);
      }
    }
    console.log('');
  }

  if (allPass) {
    console.log('🎉 All auth-redirect tests passed! Query parameters are preserved.');
  } else {
    console.log('⚠️  Some tests failed. Check the server is running and the middleware is properly set up.');
  }
}

runTests();