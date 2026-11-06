const express = require('express');
const bcrypt = require('bcryptjs');
const { collections } = require('../config/db');
const {
  LIMITS, MIN_PASSWORD_LENGTH, BCRYPT_ROUNDS, PERIOD_TYPES, THEMES, FLAME_STYLES,
} = require('../config/constants');
const { isValidEmail, cleanString, normaliseEmail } = require('../utils/validation');
const { asyncHandler, HttpError } = require('../utils/http');
const { clearSessionCookie } = require('../middleware/auth');
const { publicUser } = require('../services/account');
const { levelProgress } = require('../services/xp');
const { badgeList } = require('../services/badges');

const router = express.Router();

// My profile page: account details plus study stats.
router.get('/me', asyncHandler(async (req, res) => {
  const { users, rewards, progress } = collections();
  const [user, rewardsDoc, progressDoc] = await Promise.all([
    users.findOne({ _id: req.userId }),
    rewards.findOne({ userId: req.userId }),
    progress.findOne({ userId: req.userId }),
  ]);
  res.json({
    user: publicUser(user),
    stats: {
      totalXP: rewardsDoc.totalXP,
      pointsBalance: rewardsDoc.pointsBalance,
      ...levelProgress(rewardsDoc.totalXP),
      currentStreak: progressDoc.currentStreak,
      longestStreak: progressDoc.longestStreak,
      completedTasks: progressDoc.completedTasks,
      sessionsCompleted: progressDoc.sessionsCompleted,
      studyMinutes: progressDoc.studyMinutes,
    },
    badges: badgeList(rewardsDoc),
    redeemedRewards: rewardsDoc.redeemedRewards || [],
  });
}));

// Edit profile
router.put('/me', asyncHandler(async (req, res) => {
  const name = cleanString(req.body.name);
  const email = normaliseEmail(req.body.email);
  const institution = cleanString(req.body.institution);
  const course = cleanString(req.body.course);
  const yearOfStudy = cleanString(req.body.yearOfStudy);
  const bio = cleanString(req.body.bio);

  if (!name) throw new HttpError(400, 'Full name is required');
  if (name.length > LIMITS.nameMax) throw new HttpError(400, 'Name is too long');
  if (!isValidEmail(email) || email.length > LIMITS.emailMax) throw new HttpError(400, 'Please enter a valid email address');
  if ([institution, course, yearOfStudy].some((v) => v.length > LIMITS.profileFieldMax)) {
    throw new HttpError(400, 'One of the fields is too long');
  }
  if (bio.length > LIMITS.bioMax) throw new HttpError(400, `Bio must be ${LIMITS.bioMax} characters or fewer`);

  const { users } = collections();
  const taken = await users.findOne({ email, _id: { $ne: req.userId } }, { projection: { _id: 1 } });
  if (taken) throw new HttpError(409, 'An account with this email already exists');
  await users.updateOne({ _id: req.userId }, {
    $set: {
      name, email, institution, course, yearOfStudy, bio,
    },
  });
  const user = await users.findOne({ _id: req.userId });
  res.json({ message: 'Profile updated', user: publicUser(user) });
}));

router.put('/me/password', asyncHandler(async (req, res) => {
  const current = typeof req.body.currentPassword === 'string' ? req.body.currentPassword : '';
  const next = typeof req.body.newPassword === 'string' ? req.body.newPassword : '';
  const confirm = typeof req.body.confirmPassword === 'string' ? req.body.confirmPassword : '';
  if (!current || !next || !confirm) throw new HttpError(400, 'All fields are required');

  const { users } = collections();
  const user = await users.findOne({ _id: req.userId });
  if (!(await bcrypt.compare(current, user.passwordHash))) throw new HttpError(400, 'Current password is incorrect');
  if (next.length < MIN_PASSWORD_LENGTH) throw new HttpError(400, 'Password must be at least 8 characters');
  if (next !== confirm) throw new HttpError(400, 'Passwords do not match');
  if (current === next) throw new HttpError(400, 'New password must be different from your current password');

  await users.updateOne({ _id: req.userId }, { $set: { passwordHash: await bcrypt.hash(next, BCRYPT_ROUNDS) } });
  res.json({ message: 'Password updated' });
}));

// Preferences: dark theme and flame colours can only be chosen once redeemed in the store.
router.put('/me/preferences', asyncHandler(async (req, res) => {
  const { users, rewards } = collections();
  const owned = new Set(((await rewards.findOne({ userId: req.userId })) || {}).redeemedRewards || []);
  const update = {};

  if (req.body.theme !== undefined) {
    if (!THEMES.includes(req.body.theme)) throw new HttpError(400, 'Invalid theme');
    if (req.body.theme === 'dark' && !owned.has('dark-theme')) throw new HttpError(403, 'Redeem the dark theme in the Rewards store first');
    update['preferences.theme'] = req.body.theme;
  }
  if (req.body.flameStyle !== undefined) {
    if (!FLAME_STYLES.includes(req.body.flameStyle)) throw new HttpError(400, 'Invalid flame style');
    if (req.body.flameStyle === 'cool' && !owned.has('streak-flame')) throw new HttpError(403, 'Redeem streak flame colours in the Rewards store first');
    update['preferences.flameStyle'] = req.body.flameStyle;
  }
  if (req.body.sound !== undefined) {
    if (typeof req.body.sound !== 'boolean') throw new HttpError(400, 'Invalid sound setting');
    update['preferences.sound'] = req.body.sound;
  }
  if (req.body.periodType !== undefined) {
    if (!PERIOD_TYPES.includes(req.body.periodType)) throw new HttpError(400, 'Invalid academic period type');
    update.periodType = req.body.periodType;
  }
  if (!Object.keys(update).length) throw new HttpError(400, 'Nothing to update');

  await users.updateOne({ _id: req.userId }, { $set: update });
  const user = await users.findOne({ _id: req.userId });
  res.json({ message: 'Preferences saved', user: publicUser(user) });
}));

// Download my data: everything stored about the student, without the password hash.
router.get('/me/export', asyncHandler(async (req, res) => {
  const c = collections();
  const strip = ({ userId, ...rest }) => rest;
  const [user, rewardsDoc, progressDoc, tasks, periods, modules] = await Promise.all([
    c.users.findOne({ _id: req.userId }),
    c.rewards.findOne({ userId: req.userId }),
    c.progress.findOne({ userId: req.userId }),
    c.tasks.find({ userId: req.userId }).sort({ dueDate: 1 }).toArray(),
    c.periods.find({ userId: req.userId }).sort({ startDate: 1 }).toArray(),
    c.modules.find({ userId: req.userId }).toArray(),
  ]);
  const data = {
    exportedAt: new Date().toISOString(),
    profile: publicUser(user),
    rewards: strip(rewardsDoc),
    progress: strip(progressDoc),
    periods: periods.map(strip),
    modules: modules.map(strip),
    tasks: tasks.map(strip),
  };
  res.setHeader('Content-Disposition', 'attachment; filename="studyquest-my-data.json"');
  res.type('application/json').send(JSON.stringify(data, null, 2));
}));

// Delete account: password confirmation, then every document owned by the student is removed.
router.delete('/me', asyncHandler(async (req, res) => {
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const c = collections();
  const user = await c.users.findOne({ _id: req.userId });
  if (!password || !(await bcrypt.compare(password, user.passwordHash))) throw new HttpError(400, 'Password is incorrect');
  await Promise.all([
    c.tasks.deleteMany({ userId: req.userId }),
    c.modules.deleteMany({ userId: req.userId }),
    c.periods.deleteMany({ userId: req.userId }),
    c.rewards.deleteMany({ userId: req.userId }),
    c.progress.deleteMany({ userId: req.userId }),
  ]);
  await c.users.deleteOne({ _id: req.userId });
  clearSessionCookie(res);
  res.json({ message: 'Account deleted' });
}));

module.exports = router;
