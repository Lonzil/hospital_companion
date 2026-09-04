const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const PORT = 3100; // Use a non-default port for testing
const SERVER_FILE = path.join(__dirname, '..', 'server.js');

let serverProcess;

function startServer() {
  return new Promise((resolve, reject) => {
    serverProcess = spawn('node', [SERVER_FILE], {
      env: { ...process.env, PORT: String(PORT) },
      stdio: 'pipe'
    });

    let started = false;
    const timeout = setTimeout(() => {
      if (!started) {
        reject(new Error('Server did not start in time'));
      }
    }, 10000);

    // Poll health endpoint until ready
    const poll = setInterval(() => {
      http.get(`http://localhost:${PORT}/api/health`, (res) => {
        if (res.statusCode === 200) {
          clearInterval(poll);
          clearTimeout(timeout);
          started = true;
          resolve();
        }
      }).on('error', () => {});
    }, 500);
  });
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
  }
}

function makeLoginRequest(extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      email: 's.jenkins@example.com',
      password: 'password123'
    });

    const options = {
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...extraHeaders
      }
    };

    const req = http.request(options, (res) => {
      const cookies = res.headers['set-cookie'] || [];
      res.resume();
      resolve({ status: res.statusCode, cookies });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function hasSecureFlag(cookies) {
  return cookies.some(cookie => {
    const parts = cookie.split(';').map(s => s.trim());
    return parts.some(p => p.toLowerCase() === 'secure');
  });
}

async function main() {
  console.log('🔧 Starting server for session cookie test...');
  await startServer();
  console.log('✅ Server started.\n');

  try {
    // 1. Test without HTTPS (plain HTTP)
    const httpRes = await makeLoginRequest();
    console.log('--- HTTP (no X-Forwarded-Proto) ---');
    console.log('Status:', httpRes.status);
    console.log('Set-Cookie headers:', httpRes.cookies);
    console.log('Secure flag present?', hasSecureFlag(httpRes.cookies));
    console.assert(!hasSecureFlag(httpRes.cookies), 'Expected NO Secure flag on HTTP');
    console.log('');

    // 2. Test with HTTPS simulation (X-Forwarded-Proto: https)
    const httpsRes = await makeLoginRequest({ 'X-Forwarded-Proto': 'https' });
    console.log('--- HTTPS (X-Forwarded-Proto: https) ---');
    console.log('Status:', httpsRes.status);
    console.log('Set-Cookie headers:', httpsRes.cookies);
    console.log('Secure flag present?', hasSecureFlag(httpsRes.cookies));
    console.assert(hasSecureFlag(httpsRes.cookies), 'Expected Secure flag on HTTPS');
    console.log('');

    console.log('✅ Test complete.');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
  } finally {
    stopServer();
  }
}

main();