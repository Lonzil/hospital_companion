// tests/test-session-persist.js
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const PORT = 4300; // unique port
const HOST = 'localhost';
const BASE_URL = `http://${HOST}:${PORT}`;
const SERVER_FILE = path.join(__dirname, '..', 'server.js');

let serverProcess;
let output = '';

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: options.method || 'GET', headers: options.headers || {} }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function startServer() {
  return new Promise((resolve, reject) => {
    console.log('Starting server...');
    serverProcess = spawn('node', [SERVER_FILE], {
      env: { ...process.env, PORT: String(PORT) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    serverProcess.stdout.on('data', (d) => {
      const text = d.toString();
      output += text;
      console.log(`[server] ${text.trim()}`);
    });

    serverProcess.stderr.on('data', (d) => {
      const text = d.toString();
      output += text;
      console.error(`[server-error] ${text.trim()}`);
    });

    serverProcess.on('error', (err) => {
      console.error('Failed to spawn server:', err);
      reject(err);
    });

    const poll = async () => {
      for (let i = 0; i < 40; i++) {
        try {
          const res = await request(`${BASE_URL}/api/health`);
          if (res.status === 200) {
            console.log('Server is healthy.');
            return resolve();
          }
        } catch {}
        await new Promise((r) => setTimeout(r, 500));
      }
      console.error('Server output so far:\n', output);
      reject(new Error('Server did not start in time'));
    };
    poll();
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (!serverProcess || serverProcess.killed) return resolve();
    serverProcess.once('exit', () => resolve());
    serverProcess.kill('SIGTERM');
  });
}

async function main() {
  console.log('1. Starting server for the first time...');
  await startServer();

  console.log('2. Logging in as demo user...');
  const loginRes = await request(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 's.jenkins@example.com',
      password: 'password123',
      remember: false,
    }),
  });

  if (loginRes.status !== 200) {
    console.error('Login failed. Status:', loginRes.status, 'Body:', loginRes.body);
    await stopServer();
    process.exit(1);
  }

  const setCookie = loginRes.headers['set-cookie'];
  if (!setCookie) {
    console.error('No session cookie received.');
    await stopServer();
    process.exit(1);
  }

  const cookie = setCookie[0].split(';')[0];
  console.log('Got session cookie:', cookie);

  console.log('3. Stopping first server...');
  await stopServer();
  console.log('First server stopped.');

  console.log('4. Starting server again...');
  await startServer();

  console.log('5. Checking /api/auth/me with saved cookie...');
  const meRes = await request(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: cookie },
  });

  if (meRes.status === 200) {
    const data = JSON.parse(meRes.body);
    if (data.user && data.user.email === 's.jenkins@example.com') {
      console.log('✅ SUCCESS: Session persisted across restart!');
    } else {
      console.error('❌ Unexpected user data:', data);
    }
  } else {
    console.error('❌ Not logged in after restart. Status:', meRes.status, 'Body:', meRes.body);
  }

  await stopServer();
}

main().catch(async (err) => {
  console.error('❌ Test error:', err.message);
  console.error('Output:\n', output);
  await stopServer();
  process.exit(1);
});