// MAIN (Section 4.6.5): confirms the session, then routes the student between pages
// without reloading. Each page module exports { title, access, render(root, ctx) }.
import { post } from './api.js';
import { store, refreshSession, clearSession, onSessionChange } from './store.js';
import { renderHeader } from './layout.js';
import { toast } from './ui.js';
import { stopTimerOnLogout, resetToFocus, timer } from './timerEngine.js';

const PAGES = {
  '/login': () => import('./pages/login.js'),
  '/register': () => import('./pages/register.js'),
  '/dashboard': () => import('./pages/dashboard.js'),
  '/tasks': () => import('./pages/tasks.js'),
  '/deadlines': () => import('./pages/deadlines.js'),
  '/timer': () => import('./pages/timer.js'),
  '/rewards': () => import('./pages/rewards.js'),
  '/profile': () => import('./pages/profile.js'),
  '/settings': () => import('./pages/settings.js'),
  '/privacy': () => import('./pages/privacy.js'),
};

const root = document.getElementById('app');
let cleanup = null;
let renderId = 0;

export function navigate(url, { replace = false } = {}) {
  if (replace) window.history.replaceState({}, '', url);
  else window.history.pushState({}, '', url);
  route();
}

async function logout() {
  try { await post('/auth/logout'); } catch { /* the cookie is cleared server-side; continue either way */ }
  stopTimerOnLogout();
  clearSession();
  toast('You have been logged out.', 'info');
  navigate('/login', { replace: true });
}

async function route() {
  const id = ++renderId;
  let path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (path === '/') path = store.session ? '/dashboard' : '/login';

  const loader = PAGES[path];
  if (!loader) {
    renderHeader(path, { onLogout: logout });
    root.innerHTML = `<div class="container page"><div class="empty"><h2>Page not found</h2><p class="muted" style="margin:8px 0 18px">That page does not exist.</p><a class="btn btn-primary" href="/">Go home</a></div></div>`;
    return;
  }

  const page = (await loader()).default;
  if (id !== renderId) return;
  if (page.access === 'member' && !store.session) return navigate(`/login?next=${encodeURIComponent(path + window.location.search)}`, { replace: true });
  if (page.access === 'guest' && store.session) return navigate('/dashboard', { replace: true });
  if (window.location.pathname !== path) window.history.replaceState({}, '', path + window.location.search);

  if (typeof cleanup === 'function') cleanup();
  cleanup = null;
  document.title = `${page.title} | StudyQuest`;
  renderHeader(path, { onLogout: logout });
  root.innerHTML = '<div class="spinner" role="status" aria-label="Loading"></div>';
  window.scrollTo(0, 0);
  try {
    cleanup = await page.render(root, { navigate, params: new URLSearchParams(window.location.search) });
  } catch (err) {
    if (err.status === 401) return;
    root.innerHTML = `<div class="container page"><div class="empty"><h2>Could not load this page</h2><p class="muted" style="margin-top:8px">${err.message || 'Please refresh and try again.'}</p></div></div>`;
  }
}

// Internal links are handled here so the page does not reload.
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href]');
  if (!link || link.target || link.hasAttribute('download') || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
  const url = new URL(link.href, window.location.origin);
  if (url.origin !== window.location.origin || url.pathname.startsWith('/api/')) return;
  e.preventDefault();
  navigate(url.pathname + url.search);
});

window.addEventListener('popstate', route);
window.addEventListener('sq:logout', logout);

// A request answered 401 means the session expired: go back to the login page.
window.addEventListener('sq:unauthorised', () => {
  if (!store.session) return;
  stopTimerOnLogout();
  clearSession();
  toast('Please log in again', 'error');
  navigate('/login', { replace: true });
});

// Header pills (streak, level, points) update whenever the session summary is refreshed.
onSessionChange(() => renderHeader(window.location.pathname, { onLogout: logout }));

(async () => {
  try {
    const session = await refreshSession();
    if (session && session.streakReset) toast('Your streak was reset. Complete a task today to start a new one.', 'info', 6000);
    if (timer.state === 'idle') resetToFocus();
  } catch {
    toast('Could not reach StudyQuest. Check your connection and refresh.', 'error', 8000);
  }
  route();
})();
