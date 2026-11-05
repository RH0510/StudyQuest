// Login Interface (Section 4.7.3)
import { post } from '../api.js';
import { icon } from '../icons.js';
import { setBusy } from '../ui.js';
import { refreshSession } from '../store.js';
import { authLayout, inputRow, wirePasswordToggles } from '../components/authLayout.js';

export default {
  title: 'Log in',
  access: 'guest',
  async render(root, { navigate, params }) {
    root.innerHTML = authLayout(`
      <h1 class="auth-title">Welcome Back!</h1>
      <p class="auth-lead">Log in to continue your journey</p>
      <form class="auth-form" novalidate>
        ${inputRow({ id: 'email', type: 'email', placeholder: 'Email Address', iconName: 'mail', autocomplete: 'email' })}
        ${inputRow({ id: 'password', type: 'password', placeholder: 'Password', iconName: 'lock', autocomplete: 'current-password', toggle: true })}
        <p class="form-error" role="alert" data-error></p>
        <button class="btn btn-dark btn-block" type="submit">${icon('log-in')}Log in</button>
      </form>
      <div class="auth-or"><span>OR</span></div>
      <p class="auth-switch">Don't have an account?</p>
      <a class="btn btn-outline btn-block" href="/register">${icon('user-plus')}Register</a>
      <a class="auth-privacy" href="/privacy">${icon('shield-check', { size: 18 })}Privacy Policy</a>
    `);
    wirePasswordToggles(root);

    const form = root.querySelector('form');
    const error = root.querySelector('[data-error]');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      error.textContent = '';
      const email = form.email.value.trim();
      const password = form.password.value;
      if (!email || !password) {
        error.textContent = 'Please enter your email address and password.';
        return;
      }
      const button = form.querySelector('button[type=submit]');
      setBusy(button, true, 'Logging in…');
      try {
        await post('/auth/login', { email, password });
        await refreshSession();
        const next = params.get('next');
        navigate(next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard', { replace: true });
      } catch (err) {
        error.textContent = err.message;
        setBusy(button, false);
      }
    });
  },
};
