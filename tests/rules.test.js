// Unit tests for the game rules in Section 4.6 (no database needed).
const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateLevel, xpForTask, levelProgress } = require('../services/xp');
const { nextStreak, isStreakBroken } = require('../services/streaks');
const { evaluateBadges } = require('../services/badges');
const { isValidEmail } = require('../utils/validation');
const { dayKey, addDays, startOfDay } = require('../utils/dates');

const at = (iso) => new Date(iso);

test('CalculateLevel: 100 XP per level', () => {
  assert.equal(calculateLevel(0), 1);
  assert.equal(calculateLevel(99), 1);
  assert.equal(calculateLevel(100), 2);
  assert.equal(calculateLevel(230), 3);
  assert.deepEqual(levelProgress(230), { level: 3, xpIntoLevel: 30, xpToNextLevel: 70, levelPercent: 30 });
});

test('Task XP: 20 on time, 10 late', () => {
  const task = { dueDate: '2026-11-09T12:00:00+02:00' };
  assert.equal(xpForTask(task, at('2026-11-09T12:00:00+02:00')), 20);
  assert.equal(xpForTask(task, at('2026-11-09T12:00:01+02:00')), 10);
});

test('SAST day keys and day arithmetic', () => {
  assert.equal(dayKey(at('2026-11-03T21:59:00Z')), '2026-11-03');
  assert.equal(dayKey(at('2026-11-03T22:01:00Z')), '2026-11-04');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});

test('Streak grows on consecutive days and restarts after a gap', () => {
  const base = { currentStreak: 0, longestStreak: 0, lastActiveDate: null };
  const day1 = nextStreak(base, at('2026-11-02T09:00:00+02:00'));
  assert.equal(day1.currentStreak, 1);
  assert.equal(nextStreak({ ...base, ...day1 }, at('2026-11-02T23:50:00+02:00')), null, 'same day counts once');
  const day2 = nextStreak({ ...base, ...day1 }, at('2026-11-03T00:10:00+02:00'));
  assert.equal(day2.currentStreak, 2);
  const after = nextStreak({ ...base, ...day2 }, at('2026-11-05T10:00:00+02:00'));
  assert.equal(after.currentStreak, 1);
  assert.equal(after.longestStreak, 2);
});

test('RefreshStreak rule: broken only after a full day with no activity', () => {
  const p = { currentStreak: 4, longestStreak: 6, lastActiveDate: startOfDay('2026-11-02') };
  assert.equal(isStreakBroken(p, at('2026-11-03T20:00:00+02:00')), false);
  assert.equal(isStreakBroken(p, at('2026-11-04T08:00:00+02:00')), true);
  assert.equal(isStreakBroken({ ...p, currentStreak: 0 }, at('2026-11-10T08:00:00+02:00')), false);
});

test('Badge rules award only new badges', () => {
  const progress = { completedTasks: 10, currentStreak: 3, sessionsCompleted: 5 };
  const rewards = { level: 5, badges: ['First Step'] };
  assert.deepEqual(evaluateBadges(progress, rewards), ['Task Master', 'On a Roll', 'Focused Five', 'Level 5 Scholar']);
});

test('ValidateEmail', () => {
  assert.equal(isValidEmail('lerato@my.richfield.ac.za'), true);
  assert.equal(isValidEmail('no-at-sign.com'), false);
  assert.equal(isValidEmail('a@b'), false);
  assert.equal(isValidEmail('a@b.'), false);
  assert.equal(isValidEmail('a@@b.com'), false);
});
