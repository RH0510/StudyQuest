// Study Timer Interface and Output (Sections 4.7.3, 4.7.4)
import { get } from '../api.js';
import { icon } from '../icons.js';
import { store } from '../store.js';
import {
  timer, onTimerChange, start, pause, reset, formatClock,
} from '../timerEngine.js';

const RADIUS = 150;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default {
  title: 'Study Timer',
  access: 'member',
  async render(root) {
    const { focusMinutes, xpPerSession } = store.session.timer;
    root.innerHTML = `
      <div class="container page timer-page">
        <h1 class="page-title">Study Timer</h1>
        <p class="page-sub">Finish a focus session to earn ${xpPerSession} XP. Paused or reset sessions earn nothing.</p>
        <span class="mode-pill" data-mode></span>
        <div class="dial">
          <svg viewBox="0 0 340 340" aria-hidden="true">
            <circle class="dial-track" cx="170" cy="170" r="${RADIUS}"></circle>
            <circle class="dial-ring" cx="170" cy="170" r="${RADIUS}" stroke-dasharray="${CIRCUMFERENCE}" stroke-dashoffset="0" data-ring></circle>
          </svg>
          <div class="dial-text">
            <div class="clock" data-clock role="timer" aria-live="off"></div>
            <div class="state" data-state></div>
          </div>
        </div>
        <p class="timer-message" data-message aria-live="polite"></p>
        <div class="timer-controls">
          <button class="btn btn-primary" type="button" data-start>${icon('play', { size: 18 })}Start</button>
          <button class="btn btn-light" type="button" data-pause>${icon('pause', { size: 18 })}Pause</button>
          <button class="btn btn-ghost" type="button" data-reset>${icon('rotate-ccw', { size: 18 })}Reset</button>
        </div>
        <p class="muted timer-stats" data-stats></p>
      </div>`;

    const el = (sel) => root.querySelector(sel);
    const startBtn = el('[data-start]');
    const pauseBtn = el('[data-pause]');

    async function loadStats() {
      try {
        const { stats } = await get('/users/me');
        el('[data-stats]').textContent = `${stats.sessionsCompleted} session${stats.sessionsCompleted === 1 ? '' : 's'} completed · ${stats.studyMinutes} minutes studied`;
      } catch { /* stats are informational only */ }
    }

    let lastMode = null;
    function paint() {
      const total = (timer.mode === 'focus' ? focusMinutes : store.session.timer.breakMinutes) * 60;
      el('[data-clock]').textContent = formatClock(timer.remaining);
      el('[data-state]').textContent = timer.state === 'running' ? (timer.mode === 'focus' ? 'Focusing' : 'On a break') : timer.state === 'paused' ? 'Paused' : 'Ready';
      el('[data-mode]').innerHTML = timer.mode === 'focus' ? `${icon('brain', { size: 18 })}Focus` : `${icon('sun', { size: 18 })}Break`;
      el('[data-mode]').classList.toggle('break', timer.mode === 'break');
      el('[data-ring]').style.strokeDashoffset = String(CIRCUMFERENCE * (1 - timer.remaining / total));
      el('[data-ring]').classList.toggle('break', timer.mode === 'break');
      el('[data-message]').textContent = timer.message;
      startBtn.disabled = timer.state === 'running';
      startBtn.innerHTML = `${icon('play', { size: 18 })}${timer.state === 'paused' ? 'Resume' : 'Start'}`;
      pauseBtn.disabled = timer.state !== 'running';
      document.title = timer.state === 'running' ? `${formatClock(timer.remaining)} · Study Timer | StudyQuest` : 'Study Timer | StudyQuest';
      if (lastMode === 'break' && timer.mode === 'focus' && timer.state === 'idle') loadStats();
      if (lastMode === 'focus' && timer.mode === 'break') setTimeout(loadStats, 800);
      lastMode = timer.mode;
    }

    startBtn.addEventListener('click', start);
    pauseBtn.addEventListener('click', pause);
    el('[data-reset]').addEventListener('click', reset);

    const unsubscribe = onTimerChange(paint);
    paint();
    loadStats();
    return () => {
      unsubscribe();
      document.title = 'StudyQuest';
    };
  },
};
