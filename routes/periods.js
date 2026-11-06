const express = require('express');
const { collections } = require('../config/db');
const { LIMITS } = require('../config/constants');
const { cleanString, parseDate, toObjectId } = require('../utils/validation');
const { asyncHandler, HttpError } = require('../utils/http');
const { dayKey, startOfDay, addDays } = require('../utils/dates');

// Academic periods: the semesters, quarters, trimesters or terms a student's modules belong to.
const router = express.Router();

function periodIdFrom(req) {
  const id = toObjectId(req.params.id);
  if (!id) throw new HttpError(404, 'Not found');
  return id;
}

// Dates are whole SAST days: a period runs from 00:00 on its start day to 23:59 on its end day.
function validatePeriod(body) {
  const name = cleanString(body.name);
  if (!name) throw new HttpError(400, 'Name is required');
  if (name.length > LIMITS.periodNameMax) throw new HttpError(400, 'Name is too long');
  const start = parseDate(body.startDate);
  const end = parseDate(body.endDate);
  if (!start || !end) throw new HttpError(400, 'Please choose valid start and end dates');
  const startDate = startOfDay(dayKey(start));
  const endDate = new Date(startOfDay(addDays(dayKey(end), 1)).getTime() - 1);
  if (endDate <= startDate) throw new HttpError(400, 'The end date must be after the start date');
  return { name, startDate, endDate };
}

function serializePeriod(period, now, counts = {}) {
  return {
    id: String(period._id),
    name: period.name,
    startDate: period.startDate,
    endDate: period.endDate,
    isCurrent: period.startDate <= now && now <= period.endDate,
    moduleCount: counts.modules || 0,
    pendingAssessments: counts.pending || 0,
  };
}

router.get('/', asyncHandler(async (req, res) => {
  const c = collections();
  const [periods, modules, pending] = await Promise.all([
    c.periods.find({ userId: req.userId }).sort({ startDate: 1 }).toArray(),
    c.modules.find({ userId: req.userId }, { projection: { periodId: 1 } }).toArray(),
    c.tasks.find({ userId: req.userId, status: 'pending', moduleId: { $ne: null } }, { projection: { moduleId: 1 } }).toArray(),
  ]);
  const periodOfModule = new Map(modules.map((m) => [String(m._id), String(m.periodId)]));
  const counts = {};
  for (const m of modules) {
    const key = String(m.periodId);
    counts[key] = counts[key] || { modules: 0, pending: 0 };
    counts[key].modules += 1;
  }
  for (const t of pending) {
    const key = periodOfModule.get(String(t.moduleId));
    if (key && counts[key]) counts[key].pending += 1;
  }
  const now = new Date();
  res.json({ periods: periods.map((p) => serializePeriod(p, now, counts[String(p._id)])) });
}));

router.post('/', asyncHandler(async (req, res) => {
  const input = validatePeriod(req.body);
  const doc = { userId: req.userId, ...input, createdAt: new Date() };
  const { insertedId } = await collections().periods.insertOne(doc);
  res.status(201).json({ message: `${input.name} added`, period: serializePeriod({ ...doc, _id: insertedId }, new Date()) });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const periodId = periodIdFrom(req);
  const input = validatePeriod(req.body);
  const result = await collections().periods.updateOne({ _id: periodId, userId: req.userId }, { $set: input });
  if (result.matchedCount !== 1) throw new HttpError(404, 'Not found');
  res.json({ message: `${input.name} updated` });
}));

// Deleting a period also deletes its modules and their assessments. XP already earned is kept.
router.delete('/:id', asyncHandler(async (req, res) => {
  const periodId = periodIdFrom(req);
  const c = collections();
  const period = await c.periods.findOne({ _id: periodId, userId: req.userId });
  if (!period) throw new HttpError(404, 'Not found');
  const moduleIds = (await c.modules.find({ userId: req.userId, periodId }, { projection: { _id: 1 } }).toArray())
    .map((m) => m._id);
  if (moduleIds.length) {
    await c.tasks.deleteMany({ userId: req.userId, moduleId: { $in: moduleIds } });
    await c.modules.deleteMany({ userId: req.userId, periodId });
  }
  await c.periods.deleteOne({ _id: periodId, userId: req.userId });
  res.json({ message: `${period.name} deleted` });
}));

module.exports = router;
