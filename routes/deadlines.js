const express = require('express');
const { collections } = require('../config/db');
const { REMINDER_WINDOW_HOURS } = require('../config/constants');
const { asyncHandler } = require('../utils/http');
const {
  isOverdue, isDueSoon, moduleMapFor, serializeTask,
} = require('../services/tasks');

const router = express.Router();

// ViewDeadlines (Section 4.6.8): pending tasks grouped as overdue, due within 24 hours, and upcoming.
router.get('/', asyncHandler(async (req, res) => {
  const [list, moduleMap] = await Promise.all([
    collections().tasks.find({ userId: req.userId, status: 'pending' }).sort({ dueDate: 1 }).toArray(),
    moduleMapFor(req.userId),
  ]);
  const now = new Date();
  const groups = { overdue: [], dueSoon: [], upcoming: [] };
  for (const task of list) {
    const item = serializeTask(task, moduleMap, now);
    if (isOverdue(task, now)) groups.overdue.push(item);
    else if (isDueSoon(task, now)) groups.dueSoon.push(item);
    else groups.upcoming.push(item);
  }
  res.json(groups);
}));

// GetReminders (Section 4.6.8, FR-13): pending tasks due in the next 24 hours.
router.get('/reminders', asyncHandler(async (req, res) => {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000);
  const list = await collections().tasks
    .find({ userId: req.userId, status: 'pending', dueDate: { $gte: now, $lte: windowEnd } })
    .sort({ dueDate: 1 })
    .toArray();
  res.json({
    reminders: list.map((task) => {
      const hoursLeft = Math.floor((new Date(task.dueDate) - now) / (60 * 60 * 1000));
      return { id: String(task._id), title: task.title, dueDate: task.dueDate, hoursLeft };
    }),
  });
}));

module.exports = router;
