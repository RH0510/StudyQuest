const express = require('express');
const { collections } = require('../config/db');
const { FOCUS_MINUTES, XP_STUDY_SESSION } = require('../config/constants');
const { asyncHandler, HttpError } = require('../utils/http');
const { awardXP } = require('../services/xp');
const { updateStreak } = require('../services/streaks');
const { checkBadges } = require('../services/badges');

const router = express.Router();
const TOLERANCE_MS = 5 * 1000;

// The countdown runs in the browser (Section 4.6.9). The server records when a focus session
// started so a session can only be logged once a full focus interval has really passed.
router.post('/start', asyncHandler(async (req, res) => {
  await collections().progress.updateOne({ userId: req.userId }, { $set: { sessionStartedAt: new Date() } });
  res.json({ focusMinutes: FOCUS_MINUTES });
}));

// ResetTimer: a reset session earns nothing.
router.post('/cancel', asyncHandler(async (req, res) => {
  await collections().progress.updateOne({ userId: req.userId }, { $set: { sessionStartedAt: null } });
  res.json({ message: 'Session cancelled' });
}));

// CompleteStudySession (Section 4.6.9, FR-19)
router.post('/complete', asyncHandler(async (req, res) => {
  const { progress } = collections();
  const doc = await progress.findOne({ userId: req.userId });
  const startedAt = doc && doc.sessionStartedAt ? new Date(doc.sessionStartedAt) : null;
  const elapsed = startedAt ? Date.now() - startedAt.getTime() : 0;
  if (!startedAt || elapsed < FOCUS_MINUTES * 60 * 1000 - TOLERANCE_MS) throw new HttpError(400, 'Invalid session');

  const cleared = await progress.updateOne(
    { userId: req.userId, sessionStartedAt: doc.sessionStartedAt },
    {
      $set: { sessionStartedAt: null },
      $inc: { studyMinutes: FOCUS_MINUTES, sessionsCompleted: 1 },
    },
  );
  if (cleared.modifiedCount !== 1) throw new HttpError(400, 'Invalid session');

  const result = await awardXP(req.userId, XP_STUDY_SESSION);
  const streak = await updateStreak(req.userId);
  const newBadges = await checkBadges(req.userId);
  res.json({
    xp: XP_STUDY_SESSION,
    levelledUp: result.levelledUp,
    newLevel: result.newLevel,
    newBadges,
    streak,
  });
}));

module.exports = router;
