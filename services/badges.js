const { collections } = require('../config/db');
const { BADGE_RULES } = require('../config/constants');

// Returns the names of badges whose rule is now met but which the student does not have yet.
function evaluateBadges(progress, rewards) {
  const owned = new Set(rewards.badges || []);
  return BADGE_RULES
    .filter((rule) => !owned.has(rule.name) && rule.test(progress, rewards))
    .map((rule) => rule.name);
}

// CheckBadges (Section 4.6.10): $addToSet guarantees each badge is stored only once.
async function checkBadges(userId) {
  const { progress, rewards } = collections();
  const [progressDoc, rewardsDoc] = await Promise.all([
    progress.findOne({ userId }),
    rewards.findOne({ userId }),
  ]);
  if (!progressDoc || !rewardsDoc) return [];
  const newBadges = evaluateBadges(progressDoc, rewardsDoc);
  if (newBadges.length) {
    await rewards.updateOne({ userId }, { $addToSet: { badges: { $each: newBadges } } });
  }
  return newBadges;
}

function badgeList(rewardsDoc) {
  const owned = new Set(rewardsDoc.badges || []);
  return BADGE_RULES.map(({ id, name, icon, requirement }) => ({ id, name, icon, requirement, earned: owned.has(name) }));
}

module.exports = { evaluateBadges, checkBadges, badgeList };
