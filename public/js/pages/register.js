// Registration Interface (Section 4.7.3). The server repeats every check; these give instant feedback.
import { post } from '../api.js';
import { icon } from '../icons.js';
import { setBusy, toast } from '../ui.js';
import { authLayout, inputRow, wirePasswordToggles } from '../components/authLayout.js';

function clientCheck({ name, email, password, confirmPassword }) {
  if (!name || !email || !password || !confirmPassword) return 'All fields are required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (password !== confirmPassword) return 'Passwords do not match';
  return '';
}

export default {
  title: 'Register',
  access: 'guest',
  async render(root, { navigate }) {
    root.innerHTML = authLayout(`
      <h1 class="auth-title">Start Your Quest</h1>
      <p class="auth-lead">Create an account to track your XP, streaks and badges</p>
      <form class="auth-form" novalidate>
        ${inputRow({ id: 'name', placeholder: 'Full Name', iconName: 'user', autocomplete: 'name', maxlength: 80 })}
        ${inputRow({ id: 'email', type: 'email', placeholder: 'Email Address', iconName: 'mail', autocomplete: 'email', maxlength: 120 })}
        ${inputRow({ id: 'password', type: 'password', placeholder: 'Password', iconName: 'lock', autocomplete: 'new-password', toggle: true })}
        <p class="hint auth-hint">At least 8 characters.</p>
        ${inputRow({ id: 'confirmPassword', type: 'password', placeholder: 'Confirm Password', iconName: 'lock', autocomplete: 'new-password', toggle: true })}
        <p class="form-error" role="alert" data-error></p>
        <button class="btn btn-dark btn-block" type="submit">${icon('user-plus')}Register</button>
      </form>
      <div class="auth-or"><span>OR</span></div>
      <p class="auth-switch">Already have an account?</p>
      <a class="btn btn-outline btn-block" href="/login">${icon('log-in')}Log in</a>
      <a class="auth-privacy" href="/privacy">${icon('shield-check', { size: 18 })}Privacy Policy</a>
    `);
    wirePasswordToggles(root);

    const form = root.querySelector('form');
    const error = root.querySelector('[data-error]');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const values = {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        password: form.password.value,
        confirmPassword: form.confirmPassword.value,
      };
      error.textContent = clientCheck(values);
      if (error.textContent) return;
      const button = form.querySelector('button[type=submit]');
      setBusy(button, true, 'Creating account…');
      try {
        const result = await post('/auth/register', values);
        toast(result.message);
        navigate('/login', { replace: true });
      } catch (err) {
        error.textContent = err.message;
        setBusy(button, false);
      }
    });
  },
};
