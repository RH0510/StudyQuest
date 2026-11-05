const { collections } = require('../config/db');
const { REWARD_CATALOGUE } = require('../config/constants');
const { HttpError } = require('../utils/http');

function catalogueFor(rewardsDoc) {
  const owned = new Set(rewardsDoc.redeemedRewards || []);
  return REWARD_CATALOGUE.map((item) => ({
    ...item,
    owned: owned.has(item.id),
    affordable: rewardsDoc.pointsBalance >= item.cost,
    shortfall: Math.max(0, item.cost - rewardsDoc.pointsBalance),
  }));
}

// RedeemReward (Section 4.6.10). The update only matches when the student still has enough
// points and does not own the item, so two quick clicks cannot spend points twice.
async function redeemReward(userId, rewardId) {
  const item = REWARD_CATALOGUE.find((r) => r.id === rewardId);
  if (!item) throw new HttpError(404, 'Reward not found');
  const { rewards, users } = collections();
  const doc = await rewards.findOne({ userId });
  if ((doc.redeemedRewards || []).includes(rewardId)) throw new HttpError(400, 'You already own this reward');
  if (doc.pointsBalance < item.cost) throw new HttpError(400, 'Not enough points');

  const result = await rewards.updateOne(
    { userId, pointsBalance: { $gte: item.cost }, redeemedRewards: { $ne: rewardId } },
    { $inc: { pointsBalance: -item.cost }, $push: { redeemedRewards: rewardId } },
  );
  if (result.modifiedCount !== 1) throw new HttpError(400, 'Not enough points');

  if (rewardId === 'dark-theme') await users.updateOne({ _id: userId }, { $set: { 'preferences.theme': 'dark' } });
  if (rewardId === 'streak-flame') await users.updateOne({ _id: userId }, { $set: { 'preferences.flameStyle': 'cool' } });

  return { item, pointsBalance: doc.pointsBalance - item.cost };
}

module.exports = { catalogueFor, redeemReward };
