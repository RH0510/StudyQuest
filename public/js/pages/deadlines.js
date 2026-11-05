// ViewDeadlines (Section 4.6.8, FR-14, FR-15): overdue, due in the next 24 hours, and upcoming.
import { get, post } from '../api.js';
import { icon } from '../icons.js';
import { toast } from '../ui.js';
import { taskRow } from '../components/taskRow.js';
import { showCompletionFeedback } from '../components/feedback.js';

const GROUPS = [
  ['overdue', 'Overdue', 'triangle-alert', 'red'],
  ['dueSoon', 'Due in the next 24 hours', 'clock', 'amber'],
  ['upcoming', 'Upcoming', 'calendar-days', 'blue'],
];

export default {
  title: 'Deadlines',
  access: 'member',
  async render(root) {
    root.innerHTML = `
      <div class="container page">
        <div class="page-head">
          <div><h1 class="page-title">Deadlines</h1><p class="page-sub">Every pending task, assignment and test, in date order.</p></div>
          <a class="btn btn-light" href="/tasks">${icon('list-todo', { size: 18 })}Manage tasks</a>
        </div>
        <div data-groups></div>
      </div>`;
    const host = root.querySelector('[data-groups]');

    async function load() {
      const data = await get('/deadlines');
      const total = data.overdue.length + data.dueSoon.length + data.upcoming.length;
      if (!total) {
        host.innerHTML = `<div class="empty">${icon('party-popper', { size: 44 })}<p>No pending deadlines. You're all caught up!</p></div>`;
        return;
      }
      host.innerHTML = GROUPS.map(([key, label, iconName, tone]) => `
        <section class="deadline-group tone-${tone}">
          <h2>${icon(iconName, { size: 20 })}${label} <span class="count">${data[key].length}</span></h2>
          ${data[key].length ? `<ul class="task-list">${data[key].map((t) => taskRow(t, { actions: false })).join('')}</ul>` : '<p class="muted small group-empty">Nothing here.</p>'}
        </section>`).join('');
    }

    host.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-complete]');
      if (!btn) return;
      btn.disabled = true;
      try {
        const result = await post(`/tasks/${btn.dataset.complete}/complete`);
        await showCompletionFeedback(result);
        await load();
      } catch (err) {
        toast(err.message, 'error');
        btn.disabled = false;
      }
    });

    await load();
  },
};
