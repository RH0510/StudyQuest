// Test helpers: starts the app on a free port against the TEST database and gives each
// test a small browser-like client that keeps cookies and sends the CSRF header.
require('dotenv').config();

const TEST_URI = process.env.TEST_MONGODB_URI;
if (!TEST_URI) {
  console.error('Set TEST_MONGODB_URI in .env to a database used only for tests, then run npm test again.');
  process.exit(1);
}
process.env.JWT_SECRET = process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32
  ? process.env.JWT_SECRET
  : 'test-secret-test-secret-test-secret-123456';

const { connectToDatabase, getDb, ensureIndexes, closeDatabase } = require('../config/db');
const { createApp } = require('../app');

async function startTestServer() {
  await connectToDatabase(TEST_URI, process.env.TEST_DB_NAME || 'studyquest_test');
  await getDb().dropDatabase();
  await ensureIndexes();
  const server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  return {
    baseUrl,
    async stop() {
      await new Promise((resolve) => server.close(resolve));
      await getDb().dropDatabase();
      await closeDatabase();
    },
  };
}

class Client {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cookies = {};
    this.csrf = null;
  }

  storeCookies(response) {
    for (const line of response.headers.getSetCookie()) {
      const [pair] = line.split(';');
      const index = pair.indexOf('=');
      const name = pair.slice(0, index);
      const value = pair.slice(index + 1);
      if (value === '' || /Expires=Thu, 01 Jan 1970/i.test(line)) delete this.cookies[name];
      else this.cookies[name] = value;
    }
  }

  async request(method, path, body) {
    if (method !== 'GET' && !this.csrf) {
      const r = await fetch(`${this.baseUrl}/api/auth/csrf-token`, { headers: this.headers() });
      this.storeCookies(r);
      this.csrf = (await r.json()).csrfToken;
    }
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: { ...this.headers(), 'Content-Type': 'application/json', ...(this.csrf ? { 'X-CSRF-Token': this.csrf } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    this.storeCookies(response);
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    return { status: response.status, data, headers: response.headers };
  }

  headers() {
    const cookie = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join('; ');
    return cookie ? { Cookie: cookie } : {};
  }

  get(path) { return this.request('GET', path); }

  post(path, body = {}) { return this.request('POST', path, body); }

  put(path, body = {}) { return this.request('PUT', path, body); }

  del(path, body) { return this.request('DELETE', path, body); }
}

async function registerAndLogin(baseUrl, overrides = {}) {
  const client = new Client(baseUrl);
  const account = {
    name: 'Test Student',
    email: `student${Date.now()}${Math.floor(Math.random() * 1000)}@example.ac.za`,
    password: 'Password123',
    confirmPassword: 'Password123',
    ...overrides,
  };
  const reg = await client.post('/api/auth/register', account);
  if (reg.status !== 201) throw new Error(`Register failed: ${JSON.stringify(reg.data)}`);
  const login = await client.post('/api/auth/login', { email: account.email, password: account.password });
  if (login.status !== 200) throw new Error(`Login failed: ${JSON.stringify(login.data)}`);
  return { client, account };
}

function inHours(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

module.exports = { startTestServer, Client, registerAndLogin, inHours };
