// Task Management (Section 4.7.2) and ListTasks (Section 4.6.7)
import { get, post, del } from '../api.js';
import { icon } from '../icons.js';
import { escapeHtml, toast, confirmDialog } from '../ui.js';
import { openTaskForm } from '../components/taskForm.js';
import { taskRow } from '../components/taskRow.js';
import { showCompletionFeedback } from '../components/feedback.js';

export default {
  title: 'Tasks',
  access: 'member',
  async render(root) {
    const state = { status: 'all', sort: 'due', moduleId: '', tasks: [], modules: [] };
    state.modules = (await get('/modules')).modules;

    root.innerHTML = `
      <div class="container page">
        <div class="page-head">
          <h1 class="page-title">Tasks</h1>
          <button class="btn btn-primary" type="button" data-add>${icon('plus', { size: 18 })}Add task</button>
        </div>
        <div class="toolbar">
          <div class="seg" role="group" aria-label="Filter by status">
            <button type="button" data-status="all" aria-pressed="true">All</button>
            <button type="button" data-status="pending" aria-pressed="false">Pending</button>
            <button type="button" data-status="complete" aria-pressed="false">Complete</button>
          </div>
          <select class="select toolbar-select" data-sort aria-label="Sort tasks">
            <option value="due">Due date</option>
            <option value="newest">Newest</option>
          </select>
          ${state.modules.length ? `<select class="select toolbar-select" data-module aria-label="Filter by module">
            <option value="">All modules</option>
            ${state.modules.map((m) => `<option value="${m.id}">${escapeHtml(m.code)} · ${escapeHtml(m.name)}</option>`).join('')}
          </select>` : ''}
        </div>
        <div data-list></div>
      </div>`;

    const list = root.querySelector('[data-list]');

    async function load() {
      const q = new URLSearchParams({ sort: state.sort });
      if (state.status !== 'all') q.set('status', state.status);
      if (state.moduleId) q.set('moduleId', state.moduleId);
      state.tasks = (await get(`/tasks?${q}`)).tasks;
      if (!state.tasks.length) {
        list.innerHTML = `<div class="empty">${icon('clipboard-list', { size: 44 })}<p>${state.status === 'all' && !state.moduleId
          ? 'No tasks yet. Add your first task to start earning XP.'
          : 'No tasks match this filter.'}</p></div>`;
        return;
      }
      list.innerHTML = `<ul class="task-list">${state.tasks.map((t) => taskRow(t)).join('')}</ul>`;
    }

    root.querySelectorAll('[data-status]').forEach((btn) => btn.addEventListener('click', async () => {
      state.status = btn.dataset.status;
      root.querySelectorAll('[data-status]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      await load();
    }));
    root.querySelector('[data-sort]').addEventListener('change', async (e) => { state.sort = e.target.value; await load(); });
    const moduleFilter = root.querySelector('[data-module]');
    if (moduleFilter) moduleFilter.addEventListener('change', async (e) => { state.moduleId = e.target.value; await load(); });

    root.querySelector('[data-add]').addEventListener('click', async () => {
      if (await openTaskForm()) await load();
    });

    list.addEventListener('click', async (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const task = state.tasks.find((t) => t.id === (btn.dataset.complete || btn.dataset.edit || btn.dataset.delete));
      if (!task) return;
      try {
        if (btn.dataset.complete) {
          btn.disabled = true;
          const result = await post(`/tasks/${task.id}/complete`);
          await showCompletionFeedback(result);
          await load();
        } else if (btn.dataset.edit) {
          if (await openTaskForm({ task })) await load();
        } else if (btn.dataset.delete) {
          const ok = await confirmDialog({ title: 'Delete task?', message: `Delete '${task.title}'? This cannot be undone.`, confirmText: 'Delete', danger: true });
          if (!ok) return;
          toast((await del(`/tasks/${task.id}`)).message);
          await load();
        }
      } catch (err) {
        toast(err.message, 'error');
        btn.disabled = false;
      }
    });

    await load();
  },
};
