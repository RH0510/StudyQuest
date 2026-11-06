const express = require('express');
const { collections } = require('../config/db');
const { REMINDER_WINDOW_HOURS } = require('../config/constants');
const { asyncHandler } = require('../utils/http');
const { levelProgress } = require('../services/xp');
const { badgeList } = require('../services/badges');
const { refreshStreak } = require('../services/streaks');

const router = express.Router();

// LoadDashboard (Section 4.6.12, FR-24 to FR-26). Read-only apart from RefreshStreak.
router.get('/', asyncHandler(async (req, res) => {
  const { reset } = await refreshStreak(req.userId);
  const { users, rewards, progress, tasks } = collections();
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000);

  const [user, rewardsDoc, progressDoc, pendingCount, overdueCount, dueSoon] = await Promise.all([
    users.findOne({ _id: req.userId }, { projection: { name: 1 } }),
    rewards.findOne({ userId: req.userId }),
    progress.findOne({ userId: req.userId }),
    tasks.countDocuments({ userId: req.userId, status: 'pending' }),
    tasks.countDocuments({ userId: req.userId, status: 'pending', dueDate: { $lt: now } }),
    tasks.find({ userId: req.userId, status: 'pending', dueDate: { $gte: now, $lte: windowEnd } })
      .sort({ dueDate: 1 }).toArray(),
  ]);

  res.json({
    name: user.name,
    streakReset: reset,
    totalXP: rewardsDoc.totalXP,
    pointsBalance: rewardsDoc.pointsBalance,
    ...levelProgress(rewardsDoc.totalXP),
    currentStreak: progressDoc.currentStreak,
    longestStreak: progressDoc.longestStreak,
    completedTasks: progressDoc.completedTasks,
    pendingTasks: pendingCount,
    overdueTasks: overdueCount,
    studyMinutes: progressDoc.studyMinutes,
    sessionsCompleted: progressDoc.sessionsCompleted,
    badges: badgeList(rewardsDoc).filter((b) => b.earned),
    reminders: dueSoon.map((t) => ({
      id: String(t._id),
      title: t.title,
      dueDate: t.dueDate,
      hoursLeft: Math.floor((new Date(t.dueDate) - now) / (60 * 60 * 1000)),
    })),
  });
}));

module.exports = router;
