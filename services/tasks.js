const { collections } = require('../config/db');
const { LIMITS, TASK_TYPES, REMINDER_WINDOW_HOURS } = require('../config/constants');
const { cleanString, parseDate, toObjectId } = require('../utils/validation');
const { HttpError } = require('../utils/http');
const { xpForTask, awardXP } = require('./xp');
const { updateStreak } = require('./streaks');
const { checkBadges } = require('./badges');

const HOUR_MS = 60 * 60 * 1000;

// IsOverdue (Section 4.6.8)
function isOverdue(task, now = new Date()) {
  return task.status === 'pending' && new Date(task.dueDate).getTime() < now.getTime();
}

function isDueSoon(task, now = new Date()) {
  const due = new Date(task.dueDate).getTime();
  return task.status === 'pending' && due >= now.getTime() && due <= now.getTime() + REMINDER_WINDOW_HOURS * HOUR_MS;
}

async function moduleMapFor(userId) {
  const list = await collections().modules.find({ userId }).toArray();
  return new Map(list.map((m) => [String(m._id), m]));
}

function serializeTask(task, moduleMap, now = new Date()) {
  const mod = task.moduleId ? moduleMap.get(String(task.moduleId)) : null;
  return {
    id: String(task._id),
    title: task.title,
    description: task.description || '',
    dueDate: task.dueDate,
    status: task.status,
    type: task.type || 'task',
    weight: typeof task.weight === 'number' ? task.weight : null,
    createdAt: task.createdAt,
    completedAt: task.completedAt,
    xpAwarded: task.xpAwarded || 0,
    isOverdue: isOverdue(task, now),
    moduleId: task.moduleId ? String(task.moduleId) : null,
    module: mod ? { id: String(mod._id), code: mod.code, name: mod.name, colour: mod.colour } : null,
  };
}

// CreateTask / EditTask validation (Section 4.6.7). Assessments are tasks with a type and a module.
async function validateTaskInput(userId, body, existing = null) {
  const title = cleanString(body.title);
  const description = cleanString(body.description);
  if (!title) throw new HttpError(400, 'Task title is required');
  if (title.length > LIMITS.titleMax || description.length > LIMITS.descriptionMax) {
    throw new HttpError(400, 'Title or description is too long');
  }
  const dueDate = parseDate(body.dueDate);
  if (!dueDate) throw new HttpError(400, 'Please choose a valid due date');
  const dueChanged = !existing || new Date(existing.dueDate).getTime() !== dueDate.getTime();
  if (dueChanged && dueDate.getTime() < Date.now() - 60 * 1000) {
    throw new HttpError(400, 'Due date cannot be in the past');
  }

  const type = body.type === undefined || body.type === '' ? 'task' : body.type;
  if (!TASK_TYPES.includes(type)) throw new HttpError(400, 'Please choose a valid type');

  let moduleId = null;
  if (body.moduleId) {
    moduleId = toObjectId(body.moduleId);
    const owned = moduleId && await collections().modules.findOne({ _id: moduleId, userId }, { projection: { _id: 1 } });
    if (!owned) throw new HttpError(400, 'Module not found');
  }

  let weight = null;
  if (body.weight !== undefined && body.weight !== null && body.weight !== '') {
    weight = Number(body.weight);
    if (!Number.isFinite(weight) || weight < 0 || weight > 100) throw new HttpError(400, 'Weight must be between 0 and 100');
  }

  return { title, description, dueDate, type, moduleId, weight };
}

// CompleteTask (Section 4.6.7). The update only matches a pending task, so XP is never awarded twice.
async function completeTask(userId, taskId, now = new Date()) {
  const { tasks, progress } = collections();
  const task = await tasks.findOne({ _id: taskId, userId });
  if (!task) throw new HttpError(404, 'Task not found');
  if (task.status === 'complete') throw new HttpError(400, 'This task is already complete');

  const xp = xpForTask(task, now);
  const updated = await tasks.updateOne(
    { _id: taskId, userId, status: 'pending' },
    { $set: { status: 'complete', completedAt: now, xpAwarded: xp } },
  );
  if (updated.modifiedCount !== 1) throw new HttpError(400, 'This task is already complete');

  await progress.updateOne({ userId }, { $inc: { completedTasks: 1 } });
  const result = await awardXP(userId, xp);
  const streak = await updateStreak(userId, now);
  const newBadges = await checkBadges(userId);
  return { xp, levelledUp: result.levelledUp, newLevel: result.newLevel, newBadges, streak };
}

const TYPE_NAMES = {
  task: 'Task', assignment: 'Assignment', test: 'Test', exam: 'Exam', project: 'Project',
};

module.exports = { TYPE_NAMES, isOverdue, isDueSoon, moduleMapFor, serializeTask, validateTaskInput, completeTask };
