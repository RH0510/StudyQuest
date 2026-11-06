// Login rate limit (Section 4.8): runs in its own process with a low limit.
process.env.LOGIN_RATE_LIMIT = '3';
const test = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, Client, registerAndLogin } = require('./helpers');

let server;
test.before(async () => { server = await startTestServer(); });
test.after(async () => { await server.stop(); });

test('Repeated failed logins are blocked; successful logins are not counted', async () => {
  const { account } = await registerAndLogin(server.baseUrl);
  const c = new Client(server.baseUrl);
  for (let i = 0; i < 3; i += 1) {
    assert.equal((await c.post('/api/auth/login', { email: account.email, password: 'WrongPass1' })).status, 401);
  }
  const blocked = await c.post('/api/auth/login', { email: account.email, password: account.password });
  assert.equal(blocked.status, 429);
  assert.match(blocked.data.error, /Too many failed login attempts/);
});

test('Security headers are set', async () => {
  const r = await fetch(`${server.baseUrl}/login`);
  assert.match(r.headers.get('content-security-policy'), /default-src 'self'/);
  assert.equal(r.headers.get('x-powered-by'), null);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
});
