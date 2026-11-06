// User Profile (Section 4.7.2): account details, study stats and badges.
import { get } from '../api.js';
import { icon } from '../icons.js';
import { escapeHtml, formatMonthYear } from '../ui.js';
import { avatarHtml } from '../layout.js';

function aboutRow(iconName, label, value) {
  return `<li>${icon(iconName, { size: 20 })}<div><span>${label}</span><strong>${value ? escapeHtml(value) : '<em class="muted">Not set</em>'}</strong></div></li>`;
}

function statTile(iconName, value, label) {
  return `<div class="stat-tile">${icon(iconName, { size: 20 })}<strong>${value}</strong><span>${label}</span></div>`;
}

export default {
  title: 'My profile',
  access: 'member',
  async render(root) {
    const { user, stats, badges } = await get('/users/me');
    const subtitle = [user.course, user.institution].filter(Boolean).map(escapeHtml).join(' · ') || 'Add your course and institution in Edit profile';
    const days = (n) => `${n} day${n === 1 ? '' : 's'}`;
    root.innerHTML = `
      <div class="container page">
        <section class="hero-card profile-hero">
          ${avatarHtml(user.name, 'lg')}
          <div class="profile-id">
            <h1>${escapeHtml(user.name)}</h1>
            <p>${subtitle}</p>
            <span class="pill pill-gold">Level ${stats.level}</span>
          </div>
          <a class="btn btn-light" href="/settings?tab=profile">${icon('user-pen', { size: 18 })}Edit profile</a>
        </section>

        <div class="profile-grid">
          <section class="card">
            <h2 class="card-heading">About</h2>
            <p class="bio">${user.bio ? escapeHtml(user.bio) : '<span class="muted">No bio yet.</span>'}</p>
            <ul class="about-list">
              ${aboutRow('mail', 'Email', user.email)}
              ${aboutRow('building-2', 'Institution', user.institution)}
              ${aboutRow('book-open', 'Course', user.course)}
              ${aboutRow('graduation-cap', 'Year of study', user.yearOfStudy)}
              ${aboutRow('calendar', 'Member since', formatMonthYear(user.createdAt))}
            </ul>
          </section>
          <section class="card">
            <h2 class="card-heading">Study stats</h2>
            <div class="stat-tiles">
              ${statTile('star', stats.totalXP, 'Total XP')}
              ${statTile('coins', stats.pointsBalance, 'Points')}
              ${statTile('flame', days(stats.currentStreak), 'Current streak')}
              ${statTile('flame', days(stats.longestStreak), 'Longest streak')}
              ${statTile('list-checks', stats.completedTasks, 'Tasks completed')}
              ${statTile('timer', stats.sessionsCompleted, 'Study sessions')}
              ${statTile('clock', stats.studyMinutes, 'Minutes studied')}
            </div>
            <h3 class="badges-heading">Badges <span class="muted">(${badges.filter((b) => b.earned).length} of ${badges.length})</span></h3>
            <div class="mini-badges">
              ${badges.map((b) => `<div class="mini-badge${b.earned ? ' earned' : ''}" title="${escapeHtml(b.requirement)}"><span>${icon(b.icon, { size: 22 })}</span>${escapeHtml(b.name)}</div>`).join('')}
            </div>
          </section>
        </div>
      </div>`;
  },
};
