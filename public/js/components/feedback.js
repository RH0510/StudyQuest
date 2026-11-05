// Feedback after a task or study session is completed (Section 4.7.4): XP toast, level-up and badges.
import { toast, celebrateLevel, confetti } from '../ui.js';
import { refreshSession } from '../store.js';

export async function showCompletionFeedback(result) {
  toast(`+${result.xp} XP`, 'xp');
  (result.newBadges || []).forEach((name, i) => {
    setTimeout(() => toast(`Badge earned: ${name}`, 'badge', 4500), 400 + i * 350);
  });
  if (result.levelledUp) celebrateLevel(result.newLevel);
  else if ((result.newBadges || []).length) confetti();
  await refreshSession();
}
