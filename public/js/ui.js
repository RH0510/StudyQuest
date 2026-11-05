// Shared interface helpers: escaping, SAST date formatting, toasts, modals and confetti.
import { icon } from './icons.js';

const TIME_ZONE = 'Africa/Johannesburg';

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[1][0] : '')).toUpperCase();
}

function parts(date, options) {
  return Object.fromEntries(
    new Intl.DateTimeFormat('en-ZA', { timeZone: TIME_ZONE, ...options })
      .formatToParts(new Date(date))
      .map((p) => [p.type, p.value]),
  );
}

// "Mon 9 Nov 2026, 14:00"
export function formatDateTime(date) {
  const p = parts(date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return `${p.weekday} ${Number(p.day)} ${p.month} ${p.year}, ${p.hour}:${p.minute}`;
}

// "9 Nov 2026"
export function formatDate(date) {
  const p = parts(date, { day: 'numeric', month: 'short', year: 'numeric' });
  return `${Number(p.day)} ${p.month} ${p.year}`;
}

export function formatMonthYear(date) {
  const p = parts(date, { month: 'long', year: 'numeric' });
  return `${p.month} ${p.year}`;
}

// "in 5 hours", "in 3 days", "2 days overdue"
export function relativeDue(date) {
  const diff = new Date(date).getTime() - Date.now();
  const abs = Math.abs(diff);
  const hours = Math.floor(abs / 3600000);
  const days = Math.floor(abs / 86400000);
  const amount = days >= 1 ? `${days} day${days === 1 ? '' : 's'}` : hours >= 1 ? `${hours} hour${hours === 1 ? '' : 's'}` : `${Math.max(1, Math.floor(abs / 60000))} min`;
  return diff >= 0 ? `in ${amount}` : `${amount} overdue`;
}

// Converts a stored date to the value a <input type="datetime-local"> expects, in SAST.
export function toLocalInput(date) {
  const p = parts(date, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export function toDateInput(date) {
  const p = parts(date, { year: 'numeric', month: '2-digit', day: '2-digit' });
  return `${p.year}-${p.month}-${p.day}`;
}

// datetime-local values have no time zone; they are read as SAST (UTC+2).
export function fromLocalInput(value) {
  return value ? new Date(`${value}:00+02:00`).toISOString() : '';
}

export function flameSvg(size = 22) {
  return `<svg class="flame" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">
    <path class="f-outer" d="M12 2c1 3.2-.6 5-2.2 6.7C8.2 10.4 6.5 12.2 6.5 15A5.5 5.5 0 0 0 12 20.5 5.5 5.5 0 0 0 17.5 15c0-2.4-1.1-4.2-2.4-5.6-.2 1.3-.8 2.3-1.8 2.9.4-3.6-.4-7.6-1.3-10.3Z"/>
    <path class="f-inner" d="M12 12.2c.4 1.5-.3 2.3-1 3-.6.6-1.2 1.3-1.2 2.4a2.2 2.2 0 0 0 4.4 0c0-1-.4-1.7-.9-2.3-.1.5-.4.9-.8 1.1.2-1.4-.1-3-.5-4.2Z"/>
  </svg>`;
}

/* Toasts */
function toastHost() {
  let host = document.querySelector('.toasts');
  if (!host) {
    host = document.createElement('div');
    host.className = 'toasts';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
  }
  return host;
}

export function toast(message, type = 'success', duration = 3500) {
  const icons = { success: 'circle-check', error: 'circle-alert', xp: 'star', badge: 'award', info: 'info' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `${icon(icons[type] || 'info', { size: 20 })}<span>${escapeHtml(message)}</span>`;
  const host = toastHost();
  while (host.children.length >= 4) host.firstElementChild.remove();
  host.appendChild(el);
  setTimeout(() => {
    el.classList.add('leaving');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, duration);
}

/* Modals */
export function openModal({ title, body, footer = '', className = '', onOpen } = {}) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal ${className}" role="dialog" aria-modal="true" aria-label="${escapeHtml(title || 'Dialog')}">
      ${title ? `<div class="modal-head"><h2>${escapeHtml(title)}</h2><button class="icon-btn" data-close aria-label="Close">${icon('x')}</button></div>` : ''}
      <div class="modal-body">${body}</div>
      ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
    </div>`;
  const previousFocus = document.activeElement;
  const close = () => {
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
    if (previousFocus && previousFocus.focus) previousFocus.focus();
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) close(); });
  backdrop.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  document.addEventListener('keydown', onKey);
  document.body.appendChild(backdrop);
  const modal = backdrop.querySelector('.modal');
  const first = modal.querySelector('input, select, textarea, button:not([data-close])');
  if (first) first.focus();
  if (onOpen) onOpen(modal, close);
  return { modal, close };
}

export function confirmDialog({ title, message, confirmText = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    let answered = false;
    const { modal, close } = openModal({
      title,
      body: `<p>${escapeHtml(message)}</p>`,
      footer: `<button class="btn btn-light" data-no>Cancel</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-yes>${escapeHtml(confirmText)}</button>`,
    });
    const finish = (value) => { if (!answered) { answered = true; close(); resolve(value); } };
    modal.querySelector('[data-yes]').addEventListener('click', () => finish(true));
    modal.querySelector('[data-no]').addEventListener('click', () => finish(false));
    const observer = new MutationObserver(() => {
      if (!document.body.contains(modal)) { observer.disconnect(); if (!answered) { answered = true; resolve(false); } }
    });
    observer.observe(document.body, { childList: true });
  });
}

export function setBusy(button, busy, busyText) {
  if (!button) return;
  if (busy) {
    button.dataset.label = button.innerHTML;
    button.disabled = true;
    if (busyText) button.textContent = busyText;
  } else {
    button.disabled = false;
    if (button.dataset.label) button.innerHTML = button.dataset.label;
  }
}

/* Confetti for level-ups and badges */
export function confetti() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const colours = ['#F2B90A', '#2D6FE7', '#16A34A', '#E6682B', '#7C3AED', '#FFFFFF'];
  const pieces = Array.from({ length: 140 }, () => ({
    x: canvas.width / 2 + (Math.random() - 0.5) * 200,
    y: canvas.height * 0.35,
    vx: (Math.random() - 0.5) * 14,
    vy: Math.random() * -14 - 4,
    size: 5 + Math.random() * 6,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    colour: colours[Math.floor(Math.random() * colours.length)],
  }));
  const start = performance.now();
  const frame = (t) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of pieces) {
      p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.colour; ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }
    if (t - start < 2600) requestAnimationFrame(frame); else canvas.remove();
  };
  requestAnimationFrame(frame);
}

export function celebrateLevel(level) {
  confetti();
  openModal({
    className: 'celebrate',
    body: `<div class="burst">${escapeHtml(level)}</div>
      <h2>Level up!</h2>
      <p class="muted" style="margin:8px 0 22px">You are now level ${escapeHtml(level)}. Keep going!</p>
      <button class="btn btn-primary" data-close>Awesome</button>`,
  });
}
