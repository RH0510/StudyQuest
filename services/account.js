const { collections } = require('../config/db');
const { FOCUS_MINUTES, BREAK_MINUTES, XP_STUDY_SESSION } = require('../config/constants');
const { levelProgress } = require('./xp');

function defaultPreferences() {
  return { theme: 'light', flameStyle: 'classic', sound: true };
}

// The fields a browser is allowed to see; passwordHash is never sent.
function publicUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    institution: user.institution || '',
    course: user.course || '',
    yearOfStudy: user.yearOfStudy || '',
    bio: user.bio || '',
    periodType: user.periodType || 'Semester',
    preferences: { ...defaultPreferences(), ...(user.preferences || {}) },
    createdAt: user.createdAt,
  };
}

// RegisterUser (Section 4.6.6): Rewards and Progress are created with the account.
async function createAccountDocuments(userId) {
  const { rewards, progress } = collections();
  await rewards.insertOne({
    userId, totalXP: 0, level: 1, pointsBalance: 0, badges: [], redeemedRewards: [],
  });
  await progress.insertOne({
    userId,
    completedTasks: 0,
    studyMinutes: 0,
    sessionsCompleted: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    sessionStartedAt: null,
  });
}

// Data the header needs on every page: name, streak, level, points and settings.
async function sessionSummary(userId) {
  const { users, rewards, progress } = collections();
  const [user, rewardsDoc, progressDoc] = await Promise.all([
    users.findOne({ _id: userId }),
    rewards.findOne({ userId }),
    progress.findOne({ userId }),
  ]);
  return {
    user: publicUser(user),
    stats: {
      totalXP: rewardsDoc.totalXP,
      pointsBalance: rewardsDoc.pointsBalance,
      ...levelProgress(rewardsDoc.totalXP),
      currentStreak: progressDoc.currentStreak,
      longestStreak: progressDoc.longestStreak,
      redeemedRewards: rewardsDoc.redeemedRewards || [],
      badgeCount: (rewardsDoc.badges || []).length,
    },
    timer: {
      focusMinutes: FOCUS_MINUTES,
      breakMinutes: BREAK_MINUTES,
      xpPerSession: XP_STUDY_SESSION,
      sessionActive: Boolean(progressDoc.sessionStartedAt),
    },
  };
}

module.exports = { defaultPreferences, publicUser, createAccountDocuments, sessionSummary };
