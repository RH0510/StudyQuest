const express = require('express');
const { collections } = require('../config/db');
const { asyncHandler } = require('../utils/http');
const { cleanString } = require('../utils/validation');
const { levelProgress } = require('../services/xp');
const { badgeList } = require('../services/badges');
const { catalogueFor, redeemReward } = require('../services/rewards');

const router = express.Router();

// ViewRewards (Section 4.6.10, FR-23)
router.get('/', asyncHandler(async (req, res) => {
  const doc = await collections().rewards.findOne({ userId: req.userId });
  res.json({
    totalXP: doc.totalXP,
    pointsBalance: doc.pointsBalance,
    ...levelProgress(doc.totalXP),
    badges: badgeList(doc),
    catalogue: catalogueFor(doc),
  });
}));

router.post('/redeem', asyncHandler(async (req, res) => {
  const { item, pointsBalance } = await redeemReward(req.userId, cleanString(req.body.rewardId));
  res.json({ message: `${item.name} unlocked!`, rewardId: item.id, pointsBalance });
}));

module.exports = router;
