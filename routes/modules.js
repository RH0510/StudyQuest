const express = require('express');
const { collections } = require('../config/db');
const { LIMITS, MODULE_COLOURS } = require('../config/constants');
const { cleanString, toObjectId } = require('../utils/validation');
const { asyncHandler, HttpError } = require('../utils/http');
const { serializeTask } = require('../services/tasks');

// Modules belong to one academic period. A module's assignments, tests, exams and projects are
// stored as tasks with a moduleId, so they also appear in Tasks, Deadlines and reminders and earn XP.
const router = express.Router();

function moduleIdFrom(req) {
  const id = toObjectId(req.params.id);
  if (!id) throw new HttpError(404, 'Module not found');
  return id;
}

async function validateModule(userId, body, currentId = null) {
  const code = cleanString(body.code).toUpperCase();
  const name = cleanString(body.name);
  const lecturer = cleanString(body.lecturer);
  if (!code) throw new HttpError(400, 'Module code is required');
  if (code.length > LIMITS.moduleCodeMax || !/^[A-Z0-9][A-Z0-9 -]*$/.test(code)) {
    throw new HttpError(400, 'Module code may only use letters, numbers, spaces and dashes (max 12)');
  }
  if (!name) throw new HttpError(400, 'Module name is required');
  if (name.length > LIMITS.moduleNameMax || lecturer.length > LIMITS.lecturerMax) {
    throw new HttpError(400, 'Module name or lecturer is too long');
  }
  const colour = MODULE_COLOURS.includes(body.colour) ? body.colour : MODULE_COLOURS[0];

  const periodId = toObjectId(body.periodId);
  const period = periodId && await collections().periods.findOne({ _id: periodId, userId });
  if (!period) throw new HttpError(400, 'Please choose a valid period');

  const duplicate = await collections().modules.findOne({
    userId, periodId, code, ...(currentId ? { _id: { $ne: currentId } } : {}),
  }, { projection: { _id: 1 } });
  if (duplicate) throw new HttpError(409, `${code} is already in ${period.name}`);

  return {
    periodId, code, name, lecturer, colour,
  };
}

function serializeModule(mod, assessments = []) {
  return {
    id: String(mod._id),
    periodId: String(mod.periodId),
    code: mod.code,
    name: mod.name,
    lecturer: mod.lecturer || '',
    colour: mod.colour,
    assessments,
    pendingCount: assessments.filter((a) => a.status === 'pending').length,
  };
}

// Without a periodId: every module the student has, for the module picker in the task form.
// With a periodId: that period's modules, each with its assessments in date order.
router.get('/', asyncHandler(async (req, res) => {
  const c = collections();
  if (!req.query.periodId) {
    const [periods, modules] = await Promise.all([
      c.periods.find({ userId: req.userId }).sort({ startDate: -1 }).toArray(),
      c.modules.find({ userId: req.userId }).sort({ code: 1 }).toArray(),
    ]);
    const periodName = new Map(periods.map((p) => [String(p._id), p.name]));
    const order = new Map(periods.map((p, i) => [String(p._id), i]));
    modules.sort((a, b) => order.get(String(a.periodId)) - order.get(String(b.periodId)));
    return res.json({
      modules: modules.map((m) => ({ ...serializeModule(m), periodName: periodName.get(String(m.periodId)) || '' })),
    });
  }
  const periodId = toObjectId(req.query.periodId);
  if (!periodId) throw new HttpError(400, 'Please choose a valid period');
  const modules = await c.modules.find({ userId: req.userId, periodId }).sort({ code: 1 }).toArray();
  const tasks = modules.length
    ? await c.tasks.find({ userId: req.userId, moduleId: { $in: modules.map((m) => m._id) } }).sort({ dueDate: 1 }).toArray()
    : [];
  const moduleMap = new Map(modules.map((m) => [String(m._id), m]));
  const now = new Date();
  res.json({
    colours: MODULE_COLOURS,
    modules: modules.map((m) => serializeModule(
      m,
      tasks.filter((t) => String(t.moduleId) === String(m._id)).map((t) => serializeTask(t, moduleMap, now)),
    )),
  });
}));

router.post('/', asyncHandler(async (req, res) => {
  const input = await validateModule(req.userId, req.body);
  const doc = { userId: req.userId, ...input, createdAt: new Date() };
  const { insertedId } = await collections().modules.insertOne(doc);
  res.status(201).json({ message: `${input.code} added`, module: serializeModule({ ...doc, _id: insertedId }) });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const moduleId = moduleIdFrom(req);
  const existing = await collections().modules.findOne({ _id: moduleId, userId: req.userId });
  if (!existing) throw new HttpError(404, 'Module not found');
  const input = await validateModule(req.userId, { periodId: String(existing.periodId), ...req.body }, moduleId);
  await collections().modules.updateOne({ _id: moduleId, userId: req.userId }, { $set: input });
  res.json({ message: `${input.code} updated` });
}));

// Deleting a module also deletes its assessments. XP already earned is kept.
router.delete('/:id', asyncHandler(async (req, res) => {
  const moduleId = moduleIdFrom(req);
  const c = collections();
  const mod = await c.modules.findOne({ _id: moduleId, userId: req.userId });
  if (!mod) throw new HttpError(404, 'Module not found');
  await c.tasks.deleteMany({ userId: req.userId, moduleId });
  await c.modules.deleteOne({ _id: moduleId, userId: req.userId });
  res.json({ message: `${mod.code} deleted` });
}));

module.exports = router;
