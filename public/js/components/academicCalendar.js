// My modules (dashboard section): academic periods (semesters, quarters, trimesters or terms),
// the modules in each period, and each module's assignments, tests, exams and projects.
import { get, post, put, del } from '../api.js';
import { icon } from '../icons.js';
import {
  escapeHtml, formatDate, formatDateTime, relativeDue, toDateInput, openModal, confirmDialog, setBusy, toast,
} from '../ui.js';
import { store, refreshSession } from '../store.js';
import { openTaskForm, TYPE_LABELS } from './taskForm.js';
import { showCompletionFeedback } from './feedback.js';

const PERIOD_TYPES = ['Semester', 'Quarter', 'Trimester', 'Term'];
const STORAGE_KEY = 'sq-selected-period';

function periodType() {
  return (store.session && store.session.user.periodType) || 'Semester';
}

function rememberPeriod(id) {
  try { localStorage.setItem(STORAGE_KEY, id); } catch { /* storage may be blocked */ }
}

function rememberedPeriod() {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

function assessmentItem(a) {
  const state = a.status === 'complete' ? 'done' : a.isOverdue ? 'overdue' : '';
  const when = a.status === 'complete'
    ? `Completed · +${a.xpAwarded} XP`
    : `${a.type === 'test' || a.type === 'exam' ? 'On' : 'Due'} ${formatDateTime(a.dueDate)} · <span class="${a.isOverdue ? 'text-bad' : ''}">${relativeDue(a.dueDate)}</span>`;
  return `
    <li class="assessment ${state}" data-task="${a.id}">
      <button class="check" type="button" data-complete="${a.id}" ${a.status === 'complete' ? 'disabled' : ''} aria-label="${a.status === 'complete' ? 'Completed' : `Mark ${escapeHtml(a.title)} as complete`}" title="${a.status === 'complete' ? 'Completed' : 'Mark as complete'}">${icon('check', { size: 16, strokeWidth: 3 })}</button>
      <div class="assessment-main">
        <div class="assessment-chips"><span class="chip chip-${a.type}">${TYPE_LABELS[a.type]}</span>${a.weight !== null ? `<span class="chip">${a.weight}%</span>` : ''}</div>
        <strong class="assessment-title">${escapeHtml(a.title)}</strong>
        <div class="small muted">${when}</div>
      </div>
      <div class="row-actions">
        ${a.status === 'pending' ? `<button class="icon-btn" type="button" data-edit-task="${a.id}" aria-label="Edit">${icon('pencil', { size: 16 })}</button>` : ''}
        <button class="icon-btn danger" type="button" data-delete-task="${a.id}" aria-label="Delete">${icon('trash-2', { size: 16 })}</button>
      </div>
    </li>`;
}

function moduleCard(m) {
  const pending = m.assessments.filter((a) => a.status === 'pending');
  const done = m.assessments.filter((a) => a.status === 'complete');
  return `
    <article class="module-card" style="--mod:${m.colour}" data-module="${m.id}">
      <header class="module-head">
        <span class="module-code">${escapeHtml(m.code)}</span>
        <div class="row-actions">
          <button class="icon-btn" type="button" data-edit-module="${m.id}" aria-label="Edit ${escapeHtml(m.code)}">${icon('pencil', { size: 16 })}</button>
          <button class="icon-btn danger" type="button" data-delete-module="${m.id}" aria-label="Delete ${escapeHtml(m.code)}">${icon('trash-2', { size: 16 })}</button>
        </div>
      </header>
      <h4 class="module-name">${escapeHtml(m.name)}</h4>
      ${m.lecturer ? `<p class="small muted module-lecturer">${icon('user', { size: 14 })}${escapeHtml(m.lecturer)}</p>` : ''}
      ${pending.length ? `<ul class="assessments">${pending.map(assessmentItem).join('')}</ul>` : '<p class="small muted module-empty">No upcoming assignments or tests.</p>'}
      ${done.length ? `<details class="done-list"><summary>${done.length} completed</summary><ul class="assessments">${done.map(assessmentItem).join('')}</ul></details>` : ''}
      <footer class="module-foot">
        <button class="btn btn-light btn-sm" type="button" data-add-assessment="${m.id}" data-type="assignment">${icon('plus', { size: 15 })}Assignment</button>
        <button class="btn btn-light btn-sm" type="button" data-add-assessment="${m.id}" data-type="test">${icon('plus', { size: 15 })}Test</button>
        <button class="btn btn-light btn-sm" type="button" data-add-assessment="${m.id}" data-type="exam">${icon('plus', { size: 15 })}Exam</button>
      </footer>
    </article>`;
}

export function mountAcademicCalendar(container, { onChange } = {}) {
  const state = { periods: [], selectedId: null, modules: [], colours: [] };
  let alive = true;

  async function loadPeriods() {
    state.periods = (await get('/periods')).periods;
    const ids = state.periods.map((p) => p.id);
    if (!ids.includes(state.selectedId)) {
      const remembered = rememberedPeriod();
      const current = state.periods.find((p) => p.isCurrent);
      state.selectedId = ids.includes(remembered) ? remembered : current ? current.id : ids[ids.length - 1] || null;
    }
  }

  async function loadModules() {
    if (!state.selectedId) { state.modules = []; return; }
    const data = await get(`/modules?periodId=${state.selectedId}`);
    state.modules = data.modules;
    state.colours = data.colours;
  }

  async function reload({ changed = true } = {}) {
    await loadPeriods();
    await loadModules();
    if (!alive) return;
    render();
    if (changed && onChange) onChange();
  }

  function render() {
    const type = periodType();
    const typeOptions = PERIOD_TYPES.map((t) => `<option value="${t}"${t === type ? ' selected' : ''}>${t}s</option>`).join('');
    const selected = state.periods.find((p) => p.id === state.selectedId);
    const tabs = state.periods.map((p) => `
      <button type="button" role="tab" class="period-tab" aria-selected="${p.id === state.selectedId}" data-period="${p.id}">
        <span>${escapeHtml(p.name)}</span>${p.isCurrent ? '<span class="pill pill-gold">Current</span>' : ''}
      </button>`).join('');

    const pendingAll = state.modules
      .flatMap((m) => m.assessments.filter((a) => a.status === 'pending').map((a) => ({ ...a, moduleColour: m.colour, moduleCode: m.code })))
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 6);

    let body;
    if (!state.periods.length) {
      body = `<div class="empty academic-empty">${icon('calendar-range', { size: 40 })}<h3>Add your first ${type.toLowerCase()}</h3>
        <p class="muted" style="margin:6px 0 18px">Create a ${type.toLowerCase()}, add its modules, then add each assignment due date and test date.</p>
        <button class="btn btn-primary" type="button" data-add-period>${icon('calendar-plus', { size: 18 })}Add ${type.toLowerCase()}</button></div>`;
    } else {
      body = `
        <div class="period-tabs" role="tablist" aria-label="${type}s">${tabs}</div>
        <div class="period-bar">
          <div>
            <strong>${escapeHtml(selected.name)}</strong>
            <span class="muted"> · ${formatDate(selected.startDate)} – ${formatDate(selected.endDate)} · ${selected.moduleCount} module${selected.moduleCount === 1 ? '' : 's'} · ${selected.pendingAssessments} upcoming</span>
          </div>
          <div class="period-actions">
            <button class="icon-btn" type="button" data-edit-period aria-label="Edit ${escapeHtml(selected.name)}">${icon('pencil', { size: 17 })}</button>
            <button class="icon-btn danger" type="button" data-delete-period aria-label="Delete ${escapeHtml(selected.name)}">${icon('trash-2', { size: 17 })}</button>
            <button class="btn btn-primary btn-sm" type="button" data-add-module>${icon('plus', { size: 16 })}Add module</button>
          </div>
        </div>
        <div class="academic-body">
          <div class="module-grid">
            ${state.modules.length ? state.modules.map(moduleCard).join('') : `<div class="empty module-grid-empty">${icon('book-marked', { size: 34 })}<p>No modules in ${escapeHtml(selected.name)} yet.</p><button class="btn btn-primary btn-sm" type="button" data-add-module style="margin-top:12px">${icon('plus', { size: 16 })}Add module</button></div>`}
          </div>
          <aside class="upcoming card-inset" aria-label="Coming up">
            <h4>${icon('calendar-days', { size: 18 })}Coming up</h4>
            ${pendingAll.length ? `<ol class="upcoming-list">${pendingAll.map((a) => `
              <li>
                <span class="dot" style="background:${a.moduleColour}"></span>
                <div><div class="small"><strong>${escapeHtml(a.moduleCode)}</strong> · ${TYPE_LABELS[a.type]}</div>
                <div class="upcoming-title">${escapeHtml(a.title)}</div>
                <div class="small ${a.isOverdue ? 'text-bad' : 'muted'}">${formatDateTime(a.dueDate)} · ${relativeDue(a.dueDate)}</div></div>
              </li>`).join('')}</ol>` : '<p class="small muted">Nothing due in this ' + type.toLowerCase() + '. Add an assignment or test to a module.</p>'}
          </aside>
        </div>`;
    }

    container.innerHTML = `
      <section class="card academic" id="modules" aria-label="My modules">
        <div class="academic-head">
          <div>
            <h2 class="card-title">${icon('layers', { size: 22 })}My modules</h2>
            <p class="muted">Organise your modules, assignment due dates and test dates by ${type.toLowerCase()}.</p>
          </div>
          <div class="academic-actions">
            <label class="period-type"><span>Organise by</span><select class="select" data-period-type aria-label="Organise by">${typeOptions}</select></label>
            ${state.periods.length ? `<button class="btn btn-primary" type="button" data-add-period>${icon('calendar-plus', { size: 18 })}Add ${type.toLowerCase()}</button>` : ''}
          </div>
        </div>
        ${body}
      </section>`;
  }

  function openPeriodForm(period = null) {
    const type = periodType();
    const year = new Date().getFullYear();
    const suggestion = `${type} ${state.periods.length + 1} ${year}`;
    const { modal, close } = openModal({
      title: period ? `Edit ${type.toLowerCase()}` : `Add ${type.toLowerCase()}`,
      body: `
        <form novalidate>
          <div class="field"><label for="pf-name">Name</label>
            <input class="input" id="pf-name" name="name" maxlength="40" value="${escapeHtml(period ? period.name : suggestion)}" placeholder="e.g. ${escapeHtml(suggestion)}"></div>
          <div class="grid-2">
            <div class="field"><label for="pf-start">Start date</label><input class="input" type="date" id="pf-start" name="startDate" value="${period ? toDateInput(period.startDate) : ''}"></div>
            <div class="field"><label for="pf-end">End date</label><input class="input" type="date" id="pf-end" name="endDate" value="${period ? toDateInput(period.endDate) : ''}"></div>
          </div>
          <p class="hint" style="margin-bottom:12px">Use your institution's academic calendar dates. Exams can fall inside the ${type.toLowerCase()}.</p>
          <p class="form-error" role="alert" data-error></p>
          <div class="modal-foot"><button type="button" class="btn btn-light" data-close>Cancel</button><button type="submit" class="btn btn-primary">Save</button></div>
        </form>`,
    });
    const form = modal.querySelector('form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const error = modal.querySelector('[data-error]');
      error.textContent = '';
      const body = { name: form.name.value.trim(), startDate: form.startDate.value, endDate: form.endDate.value };
      if (!body.name) { error.textContent = 'Name is required'; return; }
      if (!body.startDate || !body.endDate) { error.textContent = 'Please choose valid start and end dates'; return; }
      const button = form.querySelector('button[type=submit]');
      setBusy(button, true, 'Saving…');
      try {
        const result = period ? await put(`/periods/${period.id}`, body) : await post('/periods', body);
        if (!period) { state.selectedId = result.period.id; rememberPeriod(result.period.id); }
        toast(result.message);
        close();
        await reload();
      } catch (err) {
        error.textContent = err.message;
        setBusy(button, false);
      }
    });
  }

  function openModuleForm(mod = null) {
    const colours = state.colours.length ? state.colours : ['#2D6FE7'];
    const current = mod ? mod.colour : colours[state.modules.length % colours.length];
    const swatches = colours.map((c, i) => `
      <label class="swatch" style="--c:${c}"><input type="radio" name="colour" value="${c}" ${c === current ? 'checked' : ''}><span class="sr-only">Colour ${i + 1}</span></label>`).join('');
    const { modal, close } = openModal({
      title: mod ? `Edit ${mod.code}` : 'Add module',
      body: `
        <form novalidate>
          <div class="grid-2">
            <div class="field"><label for="mf-code">Module code</label><input class="input" id="mf-code" name="code" maxlength="12" value="${escapeHtml(mod ? mod.code : '')}" placeholder="e.g. PRO732"></div>
            <div class="field"><label for="mf-lecturer">Lecturer</label><input class="input" id="mf-lecturer" name="lecturer" maxlength="60" value="${escapeHtml(mod ? mod.lecturer : '')}" placeholder="Optional"></div>
          </div>
          <div class="field"><label for="mf-name">Module name</label><input class="input" id="mf-name" name="name" maxlength="80" value="${escapeHtml(mod ? mod.name : '')}" placeholder="e.g. Programming 732"></div>
          <div class="field"><span class="label">Colour</span><div class="swatches">${swatches}</div></div>
          <p class="form-error" role="alert" data-error></p>
          <div class="modal-foot"><button type="button" class="btn btn-light" data-close>Cancel</button><button type="submit" class="btn btn-primary">Save</button></div>
        </form>`,
    });
    const form = modal.querySelector('form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const error = modal.querySelector('[data-error]');
      error.textContent = '';
      const body = {
        periodId: state.selectedId,
        code: form.code.value.trim(),
        name: form.name.value.trim(),
        lecturer: form.lecturer.value.trim(),
        colour: (form.querySelector('input[name=colour]:checked') || {}).value,
      };
      if (!body.code) { error.textContent = 'Module code is required'; return; }
      if (!body.name) { error.textContent = 'Module name is required'; return; }
      const button = form.querySelector('button[type=submit]');
      setBusy(button, true, 'Saving…');
      try {
        const result = mod ? await put(`/modules/${mod.id}`, body) : await post('/modules', body);
        toast(result.message);
        close();
        await reload();
      } catch (err) {
        error.textContent = err.message;
        setBusy(button, false);
      }
    });
  }

  function findTask(id) {
    for (const m of state.modules) {
      const t = m.assessments.find((a) => a.id === id);
      if (t) return t;
    }
    return null;
  }

  async function handleClick(e) {
    const t = e.target.closest('button');
    if (!t || !container.contains(t)) return;
    const type = periodType();
    const selected = state.periods.find((p) => p.id === state.selectedId);
    try {
      if (t.dataset.period) {
        state.selectedId = t.dataset.period;
        rememberPeriod(state.selectedId);
        await loadModules();
        render();
      } else if (t.hasAttribute('data-add-period')) {
        openPeriodForm();
      } else if (t.hasAttribute('data-edit-period')) {
        openPeriodForm(selected);
      } else if (t.hasAttribute('data-delete-period')) {
        const ok = await confirmDialog({
          title: `Delete ${selected.name}?`,
          message: `This also deletes its ${selected.moduleCount} module(s) and all their assignments and tests. XP already earned is kept. This cannot be undone.`,
          confirmText: `Delete ${type.toLowerCase()}`,
          danger: true,
        });
        if (!ok) return;
        toast((await del(`/periods/${selected.id}`)).message);
        state.selectedId = null;
        await reload();
      } else if (t.hasAttribute('data-add-module')) {
        openModuleForm();
      } else if (t.dataset.editModule) {
        openModuleForm(state.modules.find((m) => m.id === t.dataset.editModule));
      } else if (t.dataset.deleteModule) {
        const mod = state.modules.find((m) => m.id === t.dataset.deleteModule);
        const ok = await confirmDialog({
          title: `Delete ${mod.code}?`,
          message: `This also deletes its ${mod.assessments.length} assignment(s) and test(s). XP already earned is kept. This cannot be undone.`,
          confirmText: 'Delete module',
          danger: true,
        });
        if (!ok) return;
        toast((await del(`/modules/${mod.id}`)).message);
        await reload();
      } else if (t.dataset.addAssessment) {
        const saved = await openTaskForm({ defaults: { moduleId: t.dataset.addAssessment, type: t.dataset.type }, lockModule: true });
        if (saved) await reload();
      } else if (t.dataset.editTask) {
        const saved = await openTaskForm({ task: findTask(t.dataset.editTask), lockModule: true });
        if (saved) await reload();
      } else if (t.dataset.deleteTask) {
        const task = findTask(t.dataset.deleteTask);
        const ok = await confirmDialog({ title: 'Delete?', message: `Delete '${task.title}'? This cannot be undone.`, confirmText: 'Delete', danger: true });
        if (!ok) return;
        toast((await del(`/tasks/${task.id}`)).message);
        await reload();
      } else if (t.dataset.complete) {
        t.disabled = true;
        const result = await post(`/tasks/${t.dataset.complete}/complete`);
        await showCompletionFeedback(result);
        await reload();
      }
    } catch (err) {
      toast(err.message, 'error');
      if (t.dataset.complete) t.disabled = false;
    }
  }

  async function handleChange(e) {
    if (!e.target.matches('[data-period-type]')) return;
    try {
      await put('/users/me/preferences', { periodType: e.target.value });
      await refreshSession();
      render();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  container.addEventListener('click', handleClick);
  container.addEventListener('change', handleChange);
  container.innerHTML = '<section class="card academic"><div class="spinner"></div></section>';
  reload({ changed: false }).catch((err) => {
    container.innerHTML = `<section class="card academic"><p class="muted">Could not load your modules: ${escapeHtml(err.message)}</p></section>`;
  });

  return () => { alive = false; };
}
