// API tests for the main flows and the security rules in Sections 4.6 and 4.8.
process.env.FOCUS_MINUTES = '0.15';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  startTestServer, Client, registerAndLogin, inHours,
} = require('./helpers');

let server;
test.before(async () => { server = await startTestServer(); });
test.after(async () => { await server.stop(); });

test('Registration validation messages', async () => {
  const c = new Client(server.baseUrl);
  const base = { name: 'Thabo', email: 'thabo@example.co.za', password: 'Password123', confirmPassword: 'Password123' };
  assert.equal((await c.post('/api/auth/register', { ...base, name: '' })).data.error, 'All fields are required');
  assert.equal((await c.post('/api/auth/register', { ...base, email: 'thabo.example' })).data.error, 'Please enter a valid email address');
  assert.equal((await c.post('/api/auth/register', { ...base, password: 'short', confirmPassword: 'short' })).data.error, 'Password must be at least 8 characters');
  assert.equal((await c.post('/api/auth/register', { ...base, confirmPassword: 'Different1' })).data.error, 'Passwords do not match');
  assert.equal((await c.post('/api/auth/register', base)).status, 201);
  const dup = await c.post('/api/auth/register', { ...base, email: 'THABO@example.co.za' });
  assert.equal(dup.status, 409);
  assert.equal(dup.data.error, 'An account with this email already exists');
});

test('Login uses one message for wrong email or password, and sets an HttpOnly cookie', async () => {
  const { account } = await registerAndLogin(server.baseUrl);
  const c = new Client(server.baseUrl);
  assert.equal((await c.post('/api/auth/login', { email: account.email, password: 'WrongPass1' })).data.error, 'Incorrect email or password');
  assert.equal((await c.post('/api/auth/login', { email: 'nobody@example.com', password: 'WrongPass1' })).data.error, 'Incorrect email or password');
  const ok = await c.post('/api/auth/login', { email: account.email, password: account.password });
  assert.equal(ok.status, 200);
  const cookie = ok.headers.getSetCookie().find((l) => l.startsWith('session='));
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.equal(ok.data.user.passwordHash, undefined);
});

test('Protected routes need a session, and logout ends it', async () => {
  const anon = new Client(server.baseUrl);
  assert.equal((await anon.get('/api/dashboard')).status, 401);
  assert.equal((await anon.get('/api/auth/session')).data.authenticated, false);
  const { client } = await registerAndLogin(server.baseUrl);
  assert.equal((await client.get('/api/dashboard')).status, 200);
  await client.post('/api/auth/logout');
  assert.equal((await client.get('/api/dashboard')).status, 401);
});

test('Requests that change data need the CSRF token', async () => {
  const { client } = await registerAndLogin(server.baseUrl);
  const saved = client.csrf;
  client.csrf = 'f'.repeat(64);
  const r = await client.post('/api/tasks', { title: 'X', dueDate: inHours(5) });
  assert.equal(r.status, 403);
  client.csrf = saved;
  assert.equal((await client.post('/api/tasks', { title: 'X', dueDate: inHours(5) })).status, 201);
});

test('MongoDB operators in input are rejected', async () => {
  const c = new Client(server.baseUrl);
  const r = await c.post('/api/auth/login', { email: { $ne: null }, password: { $ne: null } });
  assert.equal(r.status, 400);
  const { client } = await registerAndLogin(server.baseUrl);
  assert.equal((await client.get('/api/tasks?status[$ne]=x')).status, 400);
});

test('Task validation follows Section 4.6.7', async () => {
  const { client } = await registerAndLogin(server.baseUrl);
  assert.equal((await client.post('/api/tasks', { title: '  ', dueDate: inHours(2) })).data.error, 'Task title is required');
  assert.equal((await client.post('/api/tasks', { title: 'x'.repeat(101), dueDate: inHours(2) })).data.error, 'Title or description is too long');
  assert.equal((await client.post('/api/tasks', { title: 'A' })).data.error, 'Please choose a valid due date');
  assert.equal((await client.post('/api/tasks', { title: 'A', dueDate: inHours(-2) })).data.error, 'Due date cannot be in the past');
});

test('Completing a task awards XP once, updates streak and badges', async () => {
  const { client } = await registerAndLogin(server.baseUrl);
  const created = await client.post('/api/tasks', { title: 'PRO732 practical', dueDate: inHours(30) });
  const id = created.data.task.id;
  const done = await client.post(`/api/tasks/${id}/complete`);
  assert.equal(done.status, 200);
  assert.equal(done.data.xp, 20);
  assert.deepEqual(done.data.newBadges, ['First Step']);
  assert.equal(done.data.streak.currentStreak, 1);
  const again = await client.post(`/api/tasks/${id}/complete`);
  assert.equal(again.data.error, 'This task is already complete');
  assert.equal((await client.put(`/api/tasks/${id}`, { title: 'Edit', dueDate: inHours(40) })).data.error, 'Completed tasks cannot be edited');
  const dash = (await client.get('/api/dashboard')).data;
  assert.equal(dash.totalXP, 20);
  assert.equal(dash.pointsBalance, 20);
  assert.equal(dash.completedTasks, 1);
  assert.equal(dash.currentStreak, 1);
});

test('Level up after 100 XP', async () => {
  const { client } = await registerAndLogin(server.baseUrl);
  let last;
  for (let i = 0; i < 5; i += 1) {
    const t = await client.post('/api/tasks', { title: `Task ${i}`, dueDate: inHours(10) });
    last = await client.post(`/api/tasks/${t.data.task.id}/complete`);
  }
  assert.equal(last.data.levelledUp, true);
  assert.equal(last.data.newLevel, 2);
});

test('A student cannot see, edit, complete or delete another student\'s task', async () => {
  const a = await registerAndLogin(server.baseUrl);
  const b = await registerAndLogin(server.baseUrl);
  const t = await a.client.post('/api/tasks', { title: 'Private', dueDate: inHours(10) });
  const id = t.data.task.id;
  assert.equal((await b.client.get('/api/tasks')).data.tasks.length, 0);
  assert.equal((await b.client.put(`/api/tasks/${id}`, { title: 'Hacked', dueDate: inHours(10) })).status, 404);
  assert.equal((await b.client.post(`/api/tasks/${id}/complete`)).status, 404);
  assert.equal((await b.client.del(`/api/tasks/${id}`)).status, 404);
  assert.equal((await a.client.get('/api/tasks')).data.tasks[0].title, 'Private');
});

test('Deadlines are grouped and reminders cover the next 24 hours', async () => {
  const { client } = await registerAndLogin(server.baseUrl);
  const soon = await client.post('/api/tasks', { title: 'Due soon', dueDate: inHours(6) });
  await client.post('/api/tasks', { title: 'Later', dueDate: inHours(72) });
  const d = (await client.get('/api/deadlines')).data;
  assert.equal(d.dueSoon.length, 1);
  assert.equal(d.upcoming.length, 1);
  assert.equal(d.overdue.length, 0);
  const r = (await client.get('/api/deadlines/reminders')).data.reminders;
  assert.equal(r.length, 1);
  assert.equal(r[0].id, soon.data.task.id);
});

test('Study session: cannot be logged early, earns 10 XP once', async () => {
  const { client } = await registerAndLogin(server.baseUrl);
  assert.equal((await client.post('/api/sessions/complete')).data.error, 'Invalid session');
  await client.post('/api/sessions/start');
  assert.equal((await client.post('/api/sessions/complete')).data.error, 'Invalid session');
  await new Promise((r) => setTimeout(r, 4300));
  const ok = await client.post('/api/sessions/complete');
  assert.equal(ok.status, 200);
  assert.equal(ok.data.xp, 10);
  assert.equal((await client.post('/api/sessions/complete')).status, 400);
  const me = (await client.get('/api/users/me')).data;
  assert.equal(me.stats.sessionsCompleted, 1);
});

test('Rewards: not enough points, then redeem and unlock preference', async () => {
  const { client } = await registerAndLogin(server.baseUrl);
  assert.equal((await client.post('/api/rewards/redeem', { rewardId: 'dark-theme' })).data.error, 'Not enough points');
  assert.equal((await client.put('/api/users/me/preferences', { theme: 'dark' })).status, 403);
  for (let i = 0; i < 8; i += 1) {
    const t = await client.post('/api/tasks', { title: `T${i}`, dueDate: inHours(10) });
    await client.post(`/api/tasks/${t.data.task.id}/complete`);
  }
  const redeem = await client.post('/api/rewards/redeem', { rewardId: 'dark-theme' });
  assert.equal(redeem.status, 200);
  assert.equal(redeem.data.pointsBalance, 10);
  assert.equal((await client.post('/api/rewards/redeem', { rewardId: 'dark-theme' })).data.error, 'You already own this reward');
  const rewards = (await client.get('/api/rewards')).data;
  assert.equal(rewards.totalXP, 160, 'redeeming never lowers XP');
  assert.equal(rewards.level, 2);
  assert.equal((await client.get('/api/auth/session')).data.user.preferences.theme, 'dark');
});

test('Academic calendar: periods, modules and assessments', async () => {
  const { client } = await registerAndLogin(server.baseUrl);
  const bad = await client.post('/api/periods', { name: 'Semester 2', startDate: '2026-12-01', endDate: '2026-07-01' });
  assert.equal(bad.data.error, 'The end date must be after the start date');
  const p = await client.post('/api/periods', { name: 'Semester 2', startDate: '2026-07-20', endDate: '2026-12-04' });
  assert.equal(p.status, 201);
  const periodId = p.data.period.id;
  const m = await client.post('/api/modules', { periodId, code: 'pro732', name: 'Programming 732', lecturer: 'Mr Dube', colour: '#16A34A' });
  assert.equal(m.data.module.code, 'PRO732');
  const dup = await client.post('/api/modules', { periodId, code: 'PRO732', name: 'Again' });
  assert.equal(dup.status, 409);
  const moduleId = m.data.module.id;
  const a = await client.post('/api/tasks', {
    title: 'Final project', type: 'assignment', moduleId, weight: 40, dueDate: inHours(48),
  });
  assert.equal(a.status, 201);
  assert.equal(a.data.task.module.code, 'PRO732');
  const list = (await client.get(`/api/modules?periodId=${periodId}`)).data.modules;
  assert.equal(list[0].assessments.length, 1);
  assert.equal(list[0].assessments[0].weight, 40);
  const periods = (await client.get('/api/periods')).data.periods;
  assert.equal(periods[0].moduleCount, 1);
  assert.equal(periods[0].pendingAssessments, 1);

  const other = await registerAndLogin(server.baseUrl);
  assert.equal((await other.client.post('/api/tasks', { title: 'x', moduleId, dueDate: inHours(5) })).data.error, 'Module not found');
  assert.equal((await other.client.del(`/api/periods/${periodId}`)).status, 404);

  assert.equal((await client.del(`/api/periods/${periodId}`)).status, 200);
  assert.equal((await client.get('/api/tasks')).data.tasks.length, 0);
});

test('Profile, password change, export and delete account', async () => {
  const { client, account } = await registerAndLogin(server.baseUrl);
  const up = await client.put('/api/users/me', {
    name: 'Lerato Zwane', email: account.email, institution: 'Richfield', course: 'BSc IT', yearOfStudy: '3rd year', bio: 'Finish strong',
  });
  assert.equal(up.data.user.institution, 'Richfield');
  assert.equal((await client.put('/api/users/me/password', { currentPassword: 'nope', newPassword: 'NewPassword1', confirmPassword: 'NewPassword1' })).data.error, 'Current password is incorrect');
  assert.equal((await client.put('/api/users/me/password', { currentPassword: account.password, newPassword: 'NewPassword1', confirmPassword: 'NewPassword1' })).status, 200);
  const exp = await client.get('/api/users/me/export');
  assert.equal(exp.data.profile.name, 'Lerato Zwane');
  assert.equal(JSON.stringify(exp.data).includes('passwordHash'), false);
  assert.equal((await client.del('/api/users/me', { password: account.password })).status, 400);
  assert.equal((await client.del('/api/users/me', { password: 'NewPassword1' })).status, 200);
  const relog = await new Client(server.baseUrl).post('/api/auth/login', { email: account.email, password: 'NewPassword1' });
  assert.equal(relog.status, 401);
});
