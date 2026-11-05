// Site header: top strip, main navigation, streak and level pills and the account menu (Section 4.7.2).
import { icon } from './icons.js';
import { escapeHtml, initials, flameSvg } from './ui.js';
import { store, owns } from './store.js';
import { timer, onTimerChange, formatClock } from './timerEngine.js';

const NAV = [
  ['/dashboard', 'Dashboard'],
  ['/tasks', 'Tasks'],
  ['/deadlines', 'Deadlines'],
  ['/timer', 'Study Timer'],
  ['/rewards', 'Rewards & Badges'],
];

export function avatarHtml(name, size = '') {
  const gold = owns('gold-frame') ? ' gold' : '';
  return `<span class="avatar ${size}${gold}" aria-hidden="true">${escapeHtml(initials(name))}</span>`;
}

function guestHeader() {
  return `
    <div class="topbar"><div class="container">
      <span></span>
      <nav class="topbar-links" aria-label="Account">
        <a href="/privacy">Privacy Policy</a>
        <a href="/login">Log in</a>
        <a href="/register" class="btn btn-gold">Register</a>
      </nav>
    </div></div>
    <div class="mainbar"><div class="container">
      <a class="brand" href="/login"><span class="brand-mark"><img src="/img/logo.svg" alt=""></span><span class="brand-name">Study<span class="q">Quest</span></span></a>
    </div></div>`;
}

function memberHeader(session, path) {
  const { user, stats } = session;
  const links = NAV.map(([href, label]) => `<a href="${href}"${path === href ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  return `
    <div class="topbar"><div class="container">
      <span class="signed-in"><span class="muted-light">Signed in as</span> <strong>${escapeHtml(user.name)}</strong></span>
      <nav class="topbar-links" aria-label="Account">
        <a href="/privacy">Privacy Policy</a>
        <button type="button" data-logout>Log out</button>
      </nav>
    </div></div>
    <div class="mainbar"><div class="container">
      <button class="menu-toggle" type="button" aria-label="Open menu" aria-expanded="false" data-menu-toggle>${icon('menu', { size: 26 })}</button>
      <a class="brand" href="/dashboard"><span class="brand-mark"><img src="/img/logo.svg" alt=""></span><span class="brand-name">Study<span class="q">Quest</span></span></a>
      <nav class="nav" aria-label="Main" data-nav>${links}</nav>
      <div class="header-right">
        <a class="timer-chip" href="/timer" data-timer-chip hidden>${icon('timer', { size: 16 })}<span></span></a>
        <span class="stat-pill streak" title="Current streak">${flameSvg(18)}${stats.currentStreak}</span>
        <span class="stat-pill level" title="Level">Lv ${stats.level}</span>
        <div class="user-menu">
          <button class="user-btn" type="button" aria-haspopup="menu" aria-expanded="false" data-user-btn>
            ${avatarHtml(user.name)}${icon('chevron-down', { size: 18 })}
          </button>
          <div class="dropdown" role="menu" data-dropdown hidden>
            <div class="dropdown-head">
              ${avatarHtml(user.name)}
              <div>
                <div class="name">${escapeHtml(user.name)}</div>
                <div class="email">${escapeHtml(user.email)}</div>
                <div class="meta">Level ${stats.level} · ${stats.pointsBalance} points</div>
              </div>
            </div>
            <a role="menuitem" href="/profile">${icon('user', { size: 18 })}My profile</a>
            <a role="menuitem" href="/settings?tab=profile">${icon('user-pen', { size: 18 })}Edit profile</a>
            <a role="menuitem" href="/settings?tab=password">${icon('key-round', { size: 18 })}Change password</a>
            <a role="menuitem" href="/settings?tab=preferences">${icon('settings', { size: 18 })}Settings</a>
            <hr>
            <a role="menuitem" href="/rewards">${icon('trophy', { size: 18 })}Rewards &amp; Badges</a>
            <a role="menuitem" href="/api/users/me/export" download>${icon('download', { size: 18 })}Download my data</a>
            <a role="menuitem" href="/privacy">${icon('shield', { size: 18 })}Privacy Policy</a>
            <hr>
            <button class="item logout" role="menuitem" type="button" data-logout>${icon('log-out', { size: 18 })}Log out</button>
          </div>
        </div>
      </div>
    </div></div>`;
}

let unsubscribeTimer = null;

function closeDropdown() {
  const dropdown = document.querySelector('[data-dropdown]');
  const userBtn = document.querySelector('[data-user-btn]');
  if (dropdown) dropdown.hidden = true;
  if (userBtn) userBtn.setAttribute('aria-expanded', 'false');
}

document.addEventListener('click', (e) => { if (!e.target.closest('.user-menu')) closeDropdown(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDropdown(); });

function updateTimerChip(header) {
  const chip = header.querySelector('[data-timer-chip]');
  if (!chip) return;
  const active = timer.state !== 'idle' && window.location.pathname !== '/timer';
  chip.hidden = !active;
  if (active) chip.querySelector('span').textContent = `${timer.mode === 'break' ? 'Break ' : ''}${formatClock(timer.remaining)}`;
}

export function renderHeader(path, { onLogout }) {
  const header = document.getElementById('site-header');
  const session = store.session;
  header.innerHTML = session ? memberHeader(session, path) : guestHeader();

  header.querySelectorAll('[data-logout]').forEach((b) => b.addEventListener('click', onLogout));

  const toggle = header.querySelector('[data-menu-toggle]');
  const nav = header.querySelector('[data-nav]');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  const userBtn = header.querySelector('[data-user-btn]');
  const dropdown = header.querySelector('[data-dropdown]');
  if (userBtn) {
    userBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.hidden = !dropdown.hidden;
      userBtn.setAttribute('aria-expanded', String(!dropdown.hidden));
    });
    dropdown.addEventListener('click', (e) => { if (e.target.closest('a')) closeDropdown(); });
  }

  if (unsubscribeTimer) unsubscribeTimer();
  unsubscribeTimer = onTimerChange(() => updateTimerChip(header));
  updateTimerChip(header);
}
