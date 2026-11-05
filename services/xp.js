const { collections } = require('../config/db');
const { XP_PER_LEVEL, XP_TASK_ON_TIME, XP_TASK_LATE } = require('../config/constants');

// CalculateLevel (Section 4.6.10): 0-99 XP = level 1, 100-199 = level 2, and so on.
function calculateLevel(totalXP) {
  return Math.floor(Math.max(0, totalXP) / XP_PER_LEVEL) + 1;
}

// CompleteTask XP rule (Section 4.6.7): 20 XP on or before the due date, 10 XP if late.
function xpForTask(task, completedAt = new Date()) {
  return completedAt.getTime() <= new Date(task.dueDate).getTime() ? XP_TASK_ON_TIME : XP_TASK_LATE;
}

function levelProgress(totalXP) {
  const level = calculateLevel(totalXP);
  const xpIntoLevel = totalXP % XP_PER_LEVEL;
  return {
    level,
    xpIntoLevel,
    xpToNextLevel: XP_PER_LEVEL - xpIntoLevel,
    levelPercent: Math.round((xpIntoLevel / XP_PER_LEVEL) * 100),
  };
}

// AwardXP (Section 4.6.10): the only function that changes XP. totalXP only ever increases,
// and pointsBalance rises by the same amount so it can be spent in the rewards store.
async function awardXP(userId, amount) {
  if (!Number.isInteger(amount) || amount <= 0) return { levelledUp: false };
  const { rewards } = collections();
  const before = await rewards.findOneAndUpdate(
    { userId },
    { $inc: { totalXP: amount, pointsBalance: amount } },
    { returnDocument: 'before' },
  );
  if (!before) throw new Error('Rewards document missing for user');
  const oldLevel = calculateLevel(before.totalXP);
  const newTotal = before.totalXP + amount;
  const newLevel = calculateLevel(newTotal);
  if (newLevel !== before.level) await rewards.updateOne({ userId }, { $set: { level: newLevel } });
  return {
    levelledUp: newLevel > oldLevel,
    newLevel,
    totalXP: newTotal,
    pointsBalance: before.pointsBalance + amount,
  };
}

module.exports = { calculateLevel, xpForTask, levelProgress, awardXP };
