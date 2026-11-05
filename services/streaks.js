const { collections } = require('../config/db');
const { dayKey, addDays, startOfDay } = require('../utils/dates');

// A qualifying activity is completing a task or a study session (SRS FR-27).
// Days are SAST calendar days, so 23:50 and 00:10 count as two different days.
function nextStreak(progress, now = new Date()) {
  const today = dayKey(now);
  const last = progress.lastActiveDate ? dayKey(new Date(progress.lastActiveDate)) : null;
  if (last === today) return null;
  const currentStreak = last === addDays(today, -1) ? progress.currentStreak + 1 : 1;
  return {
    currentStreak,
    longestStreak: Math.max(progress.longestStreak, currentStreak),
    lastActiveDate: startOfDay(today),
  };
}

// FR-28: a streak is broken when a full day has passed with no qualifying activity.
function isStreakBroken(progress, now = new Date()) {
  if (!progress.lastActiveDate || progress.currentStreak <= 0) return false;
  return dayKey(new Date(progress.lastActiveDate)) < addDays(dayKey(now), -1);
}

// UpdateStreak (Section 4.6.11)
async function updateStreak(userId, now = new Date()) {
  const { progress } = collections();
  const doc = await progress.findOne({ userId });
  const next = doc ? nextStreak(doc, now) : null;
  if (!next) return doc ? { currentStreak: doc.currentStreak, longestStreak: doc.longestStreak } : null;
  await progress.updateOne({ userId }, { $set: next });
  return { currentStreak: next.currentStreak, longestStreak: next.longestStreak };
}

// RefreshStreak (Section 4.6.11): longestStreak is never reset.
async function refreshStreak(userId, now = new Date()) {
  const { progress } = collections();
  const doc = await progress.findOne({ userId });
  if (!doc || !isStreakBroken(doc, now)) return { reset: false };
  await progress.updateOne({ userId }, { $set: { currentStreak: 0 } });
  return { reset: true };
}

module.exports = { nextStreak, isStreakBroken, updateStreak, refreshStreak };
