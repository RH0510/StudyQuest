// Reward Selection Interface and Gamification Output (Sections 4.7.3, 4.7.4), ViewRewards (Section 4.6.10)
import { get, post } from '../api.js';
import { icon } from '../icons.js';
import {
  escapeHtml, toast, confirmDialog, confetti,
} from '../ui.js';
import { refreshSession } from '../store.js';

function badgeCard(b) {
  return `
    <div class="badge-card${b.earned ? ' earned' : ''}">
      <div class="badge-icon">${icon(b.icon, { size: 34, strokeWidth: 1.8 })}</div>
      <h3>${escapeHtml(b.name)}</h3>
      <p class="badge-req">${b.earned ? `${icon('circle-check', { size: 15 })}Earned` : `${icon('lock', { size: 15 })}${escapeHtml(b.requirement)}`}</p>
    </div>`;
}

function rewardCard(r) {
  let action;
  if (r.owned) action = `<div class="reward-state owned">${icon('circle-check', { size: 17 })}Owned</div>`;
  else if (r.affordable) action = `<button class="btn btn-primary btn-block" type="button" data-redeem="${r.id}">${icon('sparkles', { size: 17 })}Redeem</button>`;
  else action = `<div class="reward-state">Need ${r.shortfall} more points</div>`;
  return `
    <article class="card reward-card">
      <div class="reward-icon">${icon(r.icon, { size: 26 })}</div>
      <h3>${escapeHtml(r.name)}</h3>
      <p class="muted">${escapeHtml(r.description)}</p>
      <p class="reward-cost">${icon('coins', { size: 18 })}${r.cost} points</p>
      ${action}
    </article>`;
}

export default {
  title: 'Rewards & Badges',
  access: 'member',
  async render(root) {
    root.innerHTML = '<div data-rewards></div>';
    const host = root.querySelector('[data-rewards]');

    async function paint() {
      const data = await get('/rewards');
      host.innerHTML = `
        <div class="container page">
          <section class="hero-card rewards-hero" aria-label="Your totals">
            <div class="hero-stat"><span class="gold-tile">${icon('star', { size: 30 })}</span><div><p>Total XP</p><strong>${data.totalXP}</strong></div></div>
            <div class="hero-stat"><span class="gold-tile">${icon('sparkles', { size: 30 })}</span><div><p>Level</p><strong>${data.level}</strong></div></div>
            <div class="hero-stat"><span class="gold-tile">${icon('coins', { size: 30 })}</span><div><p>Points balance</p><strong>${data.pointsBalance}</strong></div></div>
          </section>

          <h2 class="section-title">Badges</h2>
          <div class="badge-grid">${data.badges.map(badgeCard).join('')}</div>

          <h2 class="section-title">Rewards store</h2>
          <p class="muted store-note">You earn 1 point for every XP. Spending points never lowers your XP or level.</p>
          <div class="reward-grid">${data.catalogue.map(rewardCard).join('')}</div>
        </div>`;
    }

    host.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-redeem]');
      if (!btn) return;
      const name = btn.closest('.reward-card').querySelector('h3').textContent;
      const ok = await confirmDialog({ title: `Redeem ${name}?`, message: 'Points will be taken from your balance. Your XP and level stay the same.', confirmText: 'Redeem' });
      if (!ok) return;
      btn.disabled = true;
      try {
        const result = await post('/rewards/redeem', { rewardId: btn.dataset.redeem });
        toast(result.message);
        confetti();
        await refreshSession();
        await paint();
      } catch (err) {
        toast(err.message, 'error');
        btn.disabled = false;
      }
    });

    await paint();
  },
};
