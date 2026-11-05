const express = require('express');
const { collections } = require('../config/db');
const { TASK_STATUSES } = require('../config/constants');
const { toObjectId } = require('../utils/validation');
const { asyncHandler, HttpError } = require('../utils/http');
const {
  TYPE_NAMES, moduleMapFor, serializeTask, validateTaskInput, completeTask,
} = require('../services/tasks');

const router = express.Router();

function taskIdFrom(req) {
  const id = toObjectId(req.params.id);
  if (!id) throw new HttpError(404, 'Task not found');
  return id;
}

// ListTasks (Section 4.6.7): every query is limited to the logged-in student (FR-12).
router.get('/', asyncHandler(async (req, res) => {
  const filter = { userId: req.userId };
  if (TASK_STATUSES.includes(req.query.status)) filter.status = req.query.status;
  if (req.query.moduleId) {
    const moduleId = toObjectId(req.query.moduleId);
    if (!moduleId) throw new HttpError(400, 'Module not found');
    filter.moduleId = moduleId;
  }
  const sort = req.query.sort === 'newest' ? { createdAt: -1 } : { dueDate: 1 };
  const [list, moduleMap] = await Promise.all([
    collections().tasks.find(filter).sort(sort).toArray(),
    moduleMapFor(req.userId),
  ]);
  const now = new Date();
  res.json({ tasks: list.map((t) => serializeTask(t, moduleMap, now)) });
}));

// CreateTask (Section 4.6.7)
router.post('/', asyncHandler(async (req, res) => {
  const input = await validateTaskInput(req.userId, req.body);
  const doc = {
    userId: req.userId,
    ...input,
    status: 'pending',
    createdAt: new Date(),
    completedAt: null,
    xpAwarded: 0,
  };
  const { insertedId } = await collections().tasks.insertOne(doc);
  const moduleMap = await moduleMapFor(req.userId);
  res.status(201).json({ message: `${TYPE_NAMES[input.type]} added`, task: serializeTask({ ...doc, _id: insertedId }, moduleMap) });
}));

// EditTask (Section 4.6.7)
router.put('/:id', asyncHandler(async (req, res) => {
  const taskId = taskIdFrom(req);
  const { tasks } = collections();
  const task = await tasks.findOne({ _id: taskId, userId: req.userId });
  if (!task) throw new HttpError(404, 'Task not found');
  if (task.status === 'complete') throw new HttpError(400, 'Completed tasks cannot be edited');
  const input = await validateTaskInput(req.userId, req.body, task);
  await tasks.updateOne({ _id: taskId, userId: req.userId }, { $set: input });
  const moduleMap = await moduleMapFor(req.userId);
  res.json({ message: `${TYPE_NAMES[input.type]} updated`, task: serializeTask({ ...task, ...input }, moduleMap) });
}));

// DeleteTask (Section 4.6.7): XP already earned is kept.
router.delete('/:id', asyncHandler(async (req, res) => {
  const taskId = taskIdFrom(req);
  const task = await collections().tasks.findOneAndDelete({ _id: taskId, userId: req.userId });
  if (!task) throw new HttpError(404, 'Task not found');
  res.json({ message: `${TYPE_NAMES[task.type || 'task']} deleted` });
}));

router.post('/:id/complete', asyncHandler(async (req, res) => {
  const result = await completeTask(req.userId, taskIdFrom(req));
  res.json(result);
}));

module.exports = router;
