// Dashboard Output (Section 4.7.4, LoadDashboard in Section 4.6.12) plus the My modules section.
import { get } from '../api.js';
import { icon } from '../icons.js';
import { escapeHtml, flameSvg, formatDateTime } from '../ui.js';
import { store } from '../store.js';
import { mountAcademicCalendar } from '../components/academicCalendar.js';

function studyTime(minutes, sessions) {
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours} hour${hours === 1 ? '' : 's'} over ${sessions} session${sessions === 1 ? '' : 's'}`;
}

function reminderBanner(reminders) {
  if (!reminders.length) return '';
  const items = reminders.map((r) => `<li><strong>${escapeHtml(r.title)}</strong> is due in ${r.hoursLeft} hour${r.hoursLeft === 1 ? '' : 's'} <span class="small">(${formatDateTime(r.dueDate)})</span></li>`).join('');
  return `<div class="reminder-banner" role="status">${icon('bell', { size: 22 })}<div><strong>Due in the next 24 hours</strong><ul>${items}</ul></div></div>`;
}

function topSection(d, timer) {
  const badges = d.badges.length
    ? `<div class="badge-row">${d.badges.map((b) => `<span class="badge-chip" title="${escapeHtml(b.requirement)}">${icon(b.icon, { size: 18 })}${escapeHtml(b.name)}</span>`).join('')}</div>`
    : '<p class="muted">No badges yet.</p>';
  return `
    ${reminderBanner(d.reminders)}
    <div class="dash-top">
      <section class="hero-card level-hero" aria-label="Level and XP">
        <p class="welcome">Welcome back, ${escapeHtml(d.name)}</p>
        <div class="level-row">
          <div class="level-box">${d.level}</div>
          <div><div class="level-label">Level</div><div class="xp-total">${d.totalXP} <span>XP</span></div></div>
        </div>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${d.levelPercent}" aria-label="Progress to next level"><span style="width:${d.levelPercent}%"></span></div>
        <p class="xp-next">${d.xpToNextLevel} XP to level ${d.level + 1}</p>
      </section>
      <section class="card streak-card" aria-label="Current streak">
        <p class="muted">Current streak</p>
        <div class="streak-value">${flameSvg(52)}<span class="num">${d.currentStreak}</span><span class="unit">day${d.currentStreak === 1 ? '' : 's'}</span></div>
        <p class="muted">Best: ${d.longestStreak} day${d.longestStreak === 1 ? '' : 's'}</p>
      </section>
    </div>

    <div class="stat-grid">
      <div class="card stat"><p class="stat-label">${icon('circle-check', { size: 18, className: 'ok' })}Completed</p><p class="stat-value">${d.completedTasks}</p></div>
      <a class="card stat" href="/tasks"><p class="stat-label">${icon('list-todo', { size: 18, className: 'info' })}Pending</p><p class="stat-value">${d.pendingTasks}</p></a>
      <a class="card stat" href="/deadlines"><p class="stat-label">${icon('triangle-alert', { size: 18, className: 'bad' })}Overdue</p><p class="stat-value">${d.overdueTasks}</p></a>
      <div class="card stat"><p class="stat-label">${icon('clock', { size: 18, className: 'muted-i' })}Study time</p><p class="stat-text">${studyTime(d.studyMinutes, d.sessionsCompleted)}</p></div>
    </div>

    <div class="dash-row">
      <section class="card">
        <div class="row-between"><h3>Badges earned: ${d.badges.length}</h3><a href="/rewards">View all</a></div>
        <div class="badge-wrap">${badges}</div>
      </section>
      <section class="card focus-card">
        <div><h3>Ready to focus?</h3><p class="muted">A ${timer.focusMinutes}-minute session earns ${timer.xpPerSession} XP.</p></div>
        <a class="btn btn-primary" href="/timer">${icon('book-open', { size: 18 })}Start studying</a>
      </section>
    </div>`;
}

export default {
  title: 'Dashboard',
  access: 'member',
  async render(root) {
    const timer = () => (store.session ? store.session.timer : { focusMinutes: 25, xpPerSession: 10 });
    const d = await get('/dashboard');
    root.innerHTML = `
      <div class="container page dashboard">
        <div data-dash-top>${topSection(d, timer())}</div>
        <div data-academic></div>
      </div>`;

    const top = root.querySelector('[data-dash-top]');
    const refreshTop = async () => {
      try { top.innerHTML = topSection(await get('/dashboard'), timer()); } catch { /* the next page load shows fresh figures */ }
    };
    return mountAcademicCalendar(root.querySelector('[data-academic]'), { onChange: refreshTop });
  },
};
