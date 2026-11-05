// Task Creation and Editing Interface (Section 4.7.3). Also used for module assessments:
// an assignment, test, exam or project is a task with a type and a module.
import { post, put, get } from '../api.js';
import {
  openModal, escapeHtml, toLocalInput, fromLocalInput, setBusy, toast,
} from '../ui.js';

export const TYPE_LABELS = {
  task: 'Task', assignment: 'Assignment', test: 'Test', exam: 'Exam', project: 'Project',
};

function defaultDue() {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  return d;
}

export async function openTaskForm({ task = null, defaults = {}, lockModule = false } = {}) {
  let modules = [];
  try { modules = (await get('/modules')).modules; } catch { modules = []; }

  const values = {
    title: task ? task.title : '',
    description: task ? task.description : '',
    type: task ? task.type : (defaults.type || 'task'),
    moduleId: task ? task.moduleId || '' : (defaults.moduleId || ''),
    dueDate: toLocalInput(task ? task.dueDate : (defaults.dueDate || defaultDue())),
    weight: task && task.weight !== null ? task.weight : '',
  };
  const isAssessment = values.type !== 'task';
  const heading = task ? `Edit ${TYPE_LABELS[values.type].toLowerCase()}` : (isAssessment ? `Add ${TYPE_LABELS[values.type].toLowerCase()}` : 'Add task');

  const moduleOptions = ['<option value="">No module</option>']
    .concat(modules.map((m) => `<option value="${m.id}"${m.id === values.moduleId ? ' selected' : ''}>${escapeHtml(m.code)} · ${escapeHtml(m.name)}${m.periodName ? ` (${escapeHtml(m.periodName)})` : ''}</option>`))
    .join('');
  const typeOptions = Object.entries(TYPE_LABELS)
    .map(([value, label]) => `<option value="${value}"${value === values.type ? ' selected' : ''}>${label}</option>`).join('');

  return new Promise((resolve) => {
    let saved = null;
    const { modal, close } = openModal({
      title: heading,
      body: `
        <form novalidate data-task-form>
          <div class="field">
            <label for="tf-title">Title</label>
            <input class="input" id="tf-title" name="title" maxlength="100" value="${escapeHtml(values.title)}" placeholder="e.g. Database design assignment" required>
          </div>
          <div class="grid-2">
            <div class="field">
              <label for="tf-type">Type</label>
              <select class="select" id="tf-type" name="type">${typeOptions}</select>
            </div>
            <div class="field">
              <label for="tf-module">Module</label>
              <select class="select" id="tf-module" name="moduleId" ${lockModule ? 'disabled' : ''}>${moduleOptions}</select>
            </div>
          </div>
          <div class="grid-2">
            <div class="field">
              <label for="tf-due" data-due-label>${values.type === 'test' || values.type === 'exam' ? 'Date and time' : 'Due date and time'}</label>
              <input class="input" type="datetime-local" id="tf-due" name="dueDate" value="${values.dueDate}" required>
            </div>
            <div class="field" data-weight-field ${values.type === 'task' ? 'hidden' : ''}>
              <label for="tf-weight">Weight (% of module mark)</label>
              <input class="input" type="number" min="0" max="100" step="1" id="tf-weight" name="weight" value="${escapeHtml(values.weight)}" placeholder="Optional">
            </div>
          </div>
          <div class="field">
            <label for="tf-desc">Description</label>
            <textarea class="textarea" id="tf-desc" name="description" maxlength="500" placeholder="Optional details, venue or instructions">${escapeHtml(values.description)}</textarea>
          </div>
          <p class="form-error" role="alert" data-error></p>
          <div class="modal-foot">
            <button type="button" class="btn btn-light" data-close>Cancel</button>
            <button type="submit" class="btn btn-primary">${task ? 'Save changes' : 'Save'}</button>
          </div>
        </form>`,
    });

    const form = modal.querySelector('[data-task-form]');
    const error = modal.querySelector('[data-error]');
    form.type.addEventListener('change', () => {
      const t = form.type.value;
      modal.querySelector('[data-weight-field]').hidden = t === 'task';
      modal.querySelector('[data-due-label]').textContent = t === 'test' || t === 'exam' ? 'Date and time' : 'Due date and time';
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      error.textContent = '';
      if (!form.title.value.trim()) { error.textContent = 'Task title is required'; return; }
      if (!form.dueDate.value) { error.textContent = 'Please choose a valid due date'; return; }
      const body = {
        title: form.title.value.trim(),
        description: form.description.value.trim(),
        type: form.type.value,
        moduleId: form.moduleId.value,
        dueDate: fromLocalInput(form.dueDate.value),
        weight: form.type.value === 'task' ? '' : form.weight.value,
      };
      const button = form.querySelector('button[type=submit]');
      setBusy(button, true, 'Saving…');
      try {
        const result = task ? await put(`/tasks/${task.id}`, body) : await post('/tasks', body);
        saved = result.task;
        toast(result.message);
        close();
      } catch (err) {
        error.textContent = err.message;
        setBusy(button, false);
      }
    });

    const observer = new MutationObserver(() => {
      if (!document.body.contains(modal)) { observer.disconnect(); resolve(saved); }
    });
    observer.observe(document.body, { childList: true });
  });
}
