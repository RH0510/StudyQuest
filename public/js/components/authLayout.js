// Shared layout for the Login and Register screens: brand panel on the left, form card on the right.
import { icon } from '../icons.js';

export function authLayout(formHtml) {
  const features = [
    ['circle-check', 'Track Tasks'],
    ['trophy', 'Earn Rewards'],
    ['chart-column', 'Monitor Progress'],
    ['star', 'Stay Motivated'],
  ].map(([name, label]) => `<li><span class="feature-icon">${icon(name, { size: 26 })}</span><span>${label}</span></li>`).join('');

  return `
    <div class="container page auth-page">
      <section class="auth-panel">
        <div class="auth-brand">
          <div class="auth-logo"><img src="/img/logo.svg" alt="StudyQuest logo"></div>
          <div class="auth-wordmark">Study<span>Quest</span></div>
          <p class="auth-tagline">Plan <span>•</span> Study <span>•</span> Achieve</p>
          <p class="auth-sub">Turn your academic goals into achievements!</p>
          <ul class="auth-features">${features}</ul>
        </div>
        <div class="auth-card">${formHtml}</div>
      </section>
    </div>`;
}

export function inputRow({ id, type = 'text', placeholder, iconName, autocomplete, toggle = false, maxlength }) {
  return `
    <div class="auth-input">
      <span class="auth-input-icon">${icon(iconName)}</span>
      <input id="${id}" name="${id}" type="${type}" placeholder="${placeholder}" aria-label="${placeholder}"
        ${autocomplete ? `autocomplete="${autocomplete}"` : ''} ${maxlength ? `maxlength="${maxlength}"` : ''} required>
      ${toggle ? `<button type="button" class="auth-eye" data-toggle="${id}" aria-label="Show password">${icon('eye')}</button>` : ''}
    </div>`;
}

export function wirePasswordToggles(root) {
  root.querySelectorAll('[data-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = root.querySelector(`#${btn.dataset.toggle}`);
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.innerHTML = icon(show ? 'eye-off' : 'eye');
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
  });
}
