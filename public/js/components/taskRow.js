// One task in a list (Section 4.7.4, Task List Output). Overdue tasks are flagged in red (FR-14).
import { icon } from '../icons.js';
import { escapeHtml, formatDateTime, relativeDue } from '../ui.js';
import { TYPE_LABELS } from './taskForm.js';

export function taskRow(task, { actions = true } = {}) {
  const done = task.status === 'complete';
  const chips = [
    task.module ? `<span class="chip chip-module" style="background:${task.module.colour}">${escapeHtml(task.module.code)}</span>` : '',
    task.type !== 'task' ? `<span class="chip chip-${task.type}">${TYPE_LABELS[task.type]}</span>` : '',
    task.weight !== null ? `<span class="chip">${task.weight}%</span>` : '',
    task.isOverdue ? '<span class="chip chip-overdue">OVERDUE</span>' : '',
  ].join('');
  const when = done
    ? `${icon('circle-check', { size: 15 })}Completed · +${task.xpAwarded} XP`
    : `${icon('calendar', { size: 15 })}${formatDateTime(task.dueDate)} · <span class="${task.isOverdue ? 'text-bad' : ''}">${relativeDue(task.dueDate)}</span>`;

  return `
    <li class="task-row${done ? ' done' : ''}${task.isOverdue ? ' overdue' : ''}" data-id="${task.id}">
      <button class="check" type="button" data-complete="${task.id}" ${done ? 'disabled' : ''} title="${done ? 'Completed' : 'Mark as complete'}" aria-label="${done ? 'Completed' : `Mark ${escapeHtml(task.title)} as complete`}">${icon('check', { size: 16, strokeWidth: 3 })}</button>
      <div class="task-main">
        <div class="task-title"><strong>${escapeHtml(task.title)}</strong>${chips}</div>
        ${task.description ? `<p class="task-desc">${escapeHtml(task.description)}</p>` : ''}
        <p class="task-when">${when}</p>
      </div>
      ${actions ? `<div class="task-actions">
        ${done ? '' : `<button class="btn btn-primary btn-sm" type="button" data-complete="${task.id}">${icon('check', { size: 15 })}Complete</button>
        <button class="icon-btn" type="button" data-edit="${task.id}" aria-label="Edit ${escapeHtml(task.title)}">${icon('pencil', { size: 17 })}</button>`}
        <button class="icon-btn danger" type="button" data-delete="${task.id}" aria-label="Delete ${escapeHtml(task.title)}">${icon('trash-2', { size: 17 })}</button>
      </div>` : ''}
    </li>`;
}
