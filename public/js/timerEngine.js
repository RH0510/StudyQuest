// Pomodoro timer state (Section 4.6.9). It lives outside the Study Timer page, so a running session
// keeps counting while the student visits other pages and is still logged when it finishes.
import { post } from './api.js';
import { store } from './store.js';
import { toast } from './ui.js';
import { showCompletionFeedback } from './components/feedback.js';

const listeners = new Set();

export const timer = {
  mode: 'focus',
  state: 'idle',
  remaining: 25 * 60,
  endsAt: null,
  message: '',
};

let interval = null;

function focusSeconds() { return Math.round((store.session ? store.session.timer.focusMinutes : 25) * 60); }
function breakSeconds() { return Math.round((store.session ? store.session.timer.breakMinutes : 5) * 60); }

function emit() { listeners.forEach((fn) => fn(timer)); }

export function onTimerChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function resetToFocus() {
  timer.mode = 'focus';
  timer.state = 'idle';
  timer.remaining = focusSeconds();
  timer.endsAt = null;
}

function beep() {
  if (store.session && store.session.user.preferences.sound === false) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.35, 0.7].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.32);
    });
  } catch {
    // Sound is optional; some browsers block audio until the page is clicked.
  }
}

async function finish() {
  clearInterval(interval);
  interval = null;
  timer.state = 'idle';
  timer.remaining = 0;
  timer.endsAt = null;
  beep();
  if (timer.mode === 'focus') {
    timer.message = `Time's up! Take a ${Math.round(breakSeconds() / 60)}-minute break. Press Start when ready.`;
    timer.mode = 'break';
    timer.remaining = breakSeconds();
    emit();
    toast("Time's up!", 'info');
    try {
      const result = await post('/sessions/complete');
      await showCompletionFeedback(result);
    } catch (err) {
      toast(err.message, 'error');
    }
  } else {
    timer.message = 'Break over. Ready for another focus session?';
    resetToFocus();
    toast('Break over. Ready for another focus session?', 'info');
  }
  emit();
}

function tick() {
  timer.remaining = Math.max(0, Math.round((timer.endsAt - Date.now()) / 1000));
  if (timer.remaining <= 0) finish();
  else emit();
}

// StartTimer: ignores double clicks. The server records when a focus session started.
export async function start() {
  if (timer.state === 'running') return;
  if (timer.mode === 'focus' && timer.state === 'idle') {
    timer.remaining = focusSeconds();
    try {
      await post('/sessions/start');
    } catch (err) {
      toast(err.message, 'error');
      return;
    }
  }
  timer.message = '';
  timer.state = 'running';
  timer.endsAt = Date.now() + timer.remaining * 1000;
  clearInterval(interval);
  interval = setInterval(tick, 250);
  emit();
}

// PauseTimer: remaining time is kept.
export function pause() {
  if (timer.state !== 'running') return;
  clearInterval(interval);
  interval = null;
  timer.remaining = Math.max(0, Math.round((timer.endsAt - Date.now()) / 1000));
  timer.state = 'paused';
  timer.endsAt = null;
  emit();
}

// ResetTimer: a reset session earns nothing.
export async function reset() {
  const wasFocus = timer.mode === 'focus' && timer.state !== 'idle';
  clearInterval(interval);
  interval = null;
  timer.message = '';
  resetToFocus();
  emit();
  if (wasFocus) {
    try { await post('/sessions/cancel'); } catch { /* the next start replaces the old session anyway */ }
  }
}

export function formatClock(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function stopTimerOnLogout() {
  clearInterval(interval);
  interval = null;
  resetToFocus();
  timer.message = '';
  emit();
}
