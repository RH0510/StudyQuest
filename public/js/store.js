// Holds the logged-in student's session summary and applies their unlocked preferences.
import { get } from './api.js';

export const store = { session: null };
const listeners = new Set();

export function onSessionChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach((fn) => fn(store.session));
}

export function owns(rewardId) {
  return Boolean(store.session && store.session.stats.redeemedRewards.includes(rewardId));
}

export function applyPreferences() {
  const root = document.documentElement;
  const prefs = store.session ? store.session.user.preferences : null;
  root.dataset.theme = prefs && prefs.theme === 'dark' && owns('dark-theme') ? 'dark' : 'light';
  root.dataset.flame = prefs && prefs.flameStyle === 'cool' && owns('streak-flame') ? 'cool' : 'classic';
}

export async function refreshSession() {
  try {
    const data = await get('/auth/session');
    store.session = data.authenticated ? data : null;
  } catch (err) {
    if (err.status !== 401) throw err;
    store.session = null;
  }
  applyPreferences();
  notify();
  return store.session;
}

export function clearSession() {
  store.session = null;
  applyPreferences();
  notify();
}
