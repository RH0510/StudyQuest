// Settings: Edit profile, Password, Preferences and Account tabs.
import { put, del } from '../api.js';
import { icon } from '../icons.js';
import {
  escapeHtml, toast, setBusy, openModal, initials,
} from '../ui.js';
import {
  store, owns, refreshSession, clearSession, applyPreferences,
} from '../store.js';
import { stopTimerOnLogout } from '../timerEngine.js';

const TABS = [
  ['profile', 'Edit profile'],
  ['password', 'Password'],
  ['preferences', 'Preferences'],
  ['account', 'Account'],
];

function profileTab(user) {
  return `
    <section class="card settings-card">
      <h2 class="card-title">${icon('user-pen', { size: 22 })}Edit profile</h2>
      <div class="avatar-note"><span class="avatar lg${owns('gold-frame') ? ' gold' : ''}">${escapeHtml(initials(user.name))}</span>
        <p class="muted">Your initials are used as your profile picture. Unlock a gold frame in the Rewards store.</p></div>
      <form novalidate data-form="profile">
        <div class="grid-2">
          <div class="field"><label for="s-name">Full name</label><input class="input" id="s-name" name="name" maxlength="80" value="${escapeHtml(user.name)}"></div>
          <div class="field"><label for="s-email">Email</label><input class="input" id="s-email" name="email" type="email" maxlength="120" value="${escapeHtml(user.email)}"></div>
          <div class="field"><label for="s-inst">Institution</label><input class="input" id="s-inst" name="institution" maxlength="100" value="${escapeHtml(user.institution)}" placeholder="e.g. University of Johannesburg"></div>
          <div class="field"><label for="s-course">Course</label><input class="input" id="s-course" name="course" maxlength="100" value="${escapeHtml(user.course)}" placeholder="e.g. Diploma in IT"></div>
          <div class="field"><label for="s-year">Year of study</label><input class="input" id="s-year" name="yearOfStudy" maxlength="100" value="${escapeHtml(user.yearOfStudy)}" placeholder="e.g. 2nd year"></div>
        </div>
        <div class="field"><label for="s-bio">Bio</label><textarea class="textarea" id="s-bio" name="bio" maxlength="300" placeholder="A line about your study goals">${escapeHtml(user.bio)}</textarea>
          <span class="hint" data-count>${user.bio.length}/300</span></div>
        <p class="form-error" role="alert" data-error></p>
        <div class="form-actions"><button class="btn btn-primary" type="submit">Save changes</button><a class="btn btn-light" href="/profile">View profile</a></div>
      </form>
    </section>`;
}

function passwordTab() {
  return `
    <section class="card settings-card">
      <h2 class="card-title">${icon('key-round', { size: 22 })}Change password</h2>
      <form novalidate data-form="password" class="narrow-form">
        <div class="field"><label for="p-current">Current password</label><input class="input" id="p-current" name="currentPassword" type="password" autocomplete="current-password"></div>
        <div class="field"><label for="p-new">New password</label><input class="input" id="p-new" name="newPassword" type="password" autocomplete="new-password"><span class="hint">At least 8 characters.</span></div>
        <div class="field"><label for="p-confirm">Confirm new password</label><input class="input" id="p-confirm" name="confirmPassword" type="password" autocomplete="new-password"></div>
        <p class="form-error" role="alert" data-error></p>
        <button class="btn btn-primary" type="submit">Update password</button>
      </form>
    </section>`;
}

function choice(name, value, label, checked, locked) {
  return `<label class="choice${locked ? ' locked' : ''}">
    <input type="radio" name="${name}" value="${value}" ${checked ? 'checked' : ''} ${locked ? 'disabled' : ''}>
    <span>${label}${locked ? ` ${icon('lock', { size: 14 })}` : ''}</span></label>`;
}

function preferencesTab(user) {
  const p = user.preferences;
  const darkLocked = !owns('dark-theme');
  const flameLocked = !owns('streak-flame');
  return `
    <section class="card settings-card">
      <h2 class="card-title">${icon('settings', { size: 22 })}Preferences</h2>
      <form novalidate data-form="preferences">
        <fieldset class="pref"><legend>Theme</legend>
          <div class="choices">${choice('theme', 'light', `${icon('sun', { size: 16 })}Light`, p.theme !== 'dark' || darkLocked, false)}${choice('theme', 'dark', `${icon('moon', { size: 16 })}Dark`, p.theme === 'dark' && !darkLocked, darkLocked)}</div>
          ${darkLocked ? '<p class="hint">Redeem <a href="/rewards">Dark theme</a> in the Rewards store to unlock.</p>' : ''}
        </fieldset>
        <fieldset class="pref"><legend>Streak flame</legend>
          <div class="choices">${choice('flameStyle', 'classic', 'Orange', p.flameStyle !== 'cool' || flameLocked, false)}${choice('flameStyle', 'cool', 'Purple/blue', p.flameStyle === 'cool' && !flameLocked, flameLocked)}</div>
          ${flameLocked ? '<p class="hint">Redeem <a href="/rewards">Streak flame colours</a> in the Rewards store to unlock.</p>' : ''}
        </fieldset>
        <fieldset class="pref"><legend>Study timer</legend>
          <label class="switch"><input type="checkbox" name="sound" ${p.sound !== false ? 'checked' : ''}><span>Play a sound when a session ends</span></label>
        </fieldset>
        <fieldset class="pref"><legend>Academic calendar</legend>
          <label class="inline-select"><span>Organise my modules by</span>
            <select class="select" name="periodType">${['Semester', 'Quarter', 'Trimester', 'Term'].map((t) => `<option value="${t}"${user.periodType === t ? ' selected' : ''}>${t}s</option>`).join('')}</select></label>
        </fieldset>
        <p class="form-error" role="alert" data-error></p>
        <button class="btn btn-primary" type="submit">Save preferences</button>
      </form>
    </section>`;
}

function accountTab(user) {
  return `
    <section class="card settings-card">
      <h2 class="card-title">${icon('download', { size: 22 })}Your data</h2>
      <p class="muted section-text">Download your profile, tasks, modules, XP, badges and study progress as a file.</p>
      <a class="btn btn-light" href="/api/users/me/export" download>${icon('download', { size: 18 })}Download my data</a>
    </section>
    <section class="card settings-card">
      <h2 class="card-title">${icon('log-out', { size: 22 })}Session</h2>
      <p class="muted section-text">You're logged in as ${escapeHtml(user.email)}.</p>
      <button class="btn btn-light" type="button" data-logout-here>${icon('log-out', { size: 18 })}Log out</button>
    </section>
    <section class="card settings-card danger-zone">
      <h2 class="card-title">${icon('trash-2', { size: 22 })}Danger zone</h2>
      <p class="muted section-text">Deleting your account permanently removes your tasks, modules, XP, badges and rewards. This can't be undone.</p>
      <button class="btn btn-danger" type="button" data-delete-account>${icon('trash-2', { size: 18 })}Delete account</button>
    </section>`;
}

export default {
  title: 'Settings',
  access: 'member',
  async render(root, { navigate, params }) {
    const tab = TABS.some(([key]) => key === params.get('tab')) ? params.get('tab') : 'profile';
    const user = store.session.user;
    const views = {
      profile: profileTab, password: passwordTab, preferences: preferencesTab, account: accountTab,
    };
    root.innerHTML = `
      <div class="container page page-narrow">
        <h1 class="page-title settings-title">${icon('settings', { size: 32 })}Settings</h1>
        <p class="page-sub">Manage your profile, password and how StudyQuest works for you.</p>
        <nav class="tabs" role="tablist" aria-label="Settings sections">
          ${TABS.map(([key, label]) => `<a role="tab" href="/settings?tab=${key}" aria-selected="${key === tab}">${label}</a>`).join('')}
        </nav>
        <div class="settings-body">${views[tab](user)}</div>
      </div>`;

    const form = root.querySelector('[data-form]');
    const error = root.querySelector('[data-error]');

    if (tab === 'profile') {
      const bio = form.bio;
      bio.addEventListener('input', () => { root.querySelector('[data-count]').textContent = `${bio.value.length}/300`; });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        error.textContent = '';
        const button = form.querySelector('button[type=submit]');
        let body;
        if (tab === 'profile') {
          body = Object.fromEntries(['name', 'email', 'institution', 'course', 'yearOfStudy', 'bio'].map((k) => [k, form[k].value.trim()]));
          if (!body.name) { error.textContent = 'Full name is required'; return; }
        } else if (tab === 'password') {
          body = { currentPassword: form.currentPassword.value, newPassword: form.newPassword.value, confirmPassword: form.confirmPassword.value };
          if (body.newPassword.length < 8) { error.textContent = 'Password must be at least 8 characters'; return; }
          if (body.newPassword !== body.confirmPassword) { error.textContent = 'Passwords do not match'; return; }
        } else {
          body = {
            theme: form.querySelector('input[name=theme]:checked').value,
            flameStyle: form.querySelector('input[name=flameStyle]:checked').value,
            sound: form.sound.checked,
            periodType: form.periodType.value,
          };
        }
        setBusy(button, true, 'Saving…');
        try {
          const path = { profile: '/users/me', password: '/users/me/password', preferences: '/users/me/preferences' }[tab];
          const result = await put(path, body);
          toast(result.message);
          if (tab === 'password') form.reset();
          await refreshSession();
          applyPreferences();
        } catch (err) {
          error.textContent = err.message;
        } finally {
          setBusy(button, false);
        }
      });
    }

    if (tab === 'account') {
      root.querySelector('[data-logout-here]').addEventListener('click', () => window.dispatchEvent(new CustomEvent('sq:logout')));
      root.querySelector('[data-delete-account]').addEventListener('click', () => {
        const { modal, close } = openModal({
          title: 'Delete your account?',
          body: `<form novalidate>
              <p style="margin-bottom:16px">This permanently removes your account and everything in it. Enter your password to confirm.</p>
              <div class="field"><label for="d-pass">Password</label><input class="input" id="d-pass" type="password" name="password" autocomplete="current-password"></div>
              <p class="form-error" role="alert" data-error></p>
              <div class="modal-foot"><button type="button" class="btn btn-light" data-close>Cancel</button><button type="submit" class="btn btn-danger">Delete account</button></div>
            </form>`,
        });
        const f = modal.querySelector('form');
        f.addEventListener('submit', async (e) => {
          e.preventDefault();
          const button = f.querySelector('button[type=submit]');
          setBusy(button, true, 'Deleting…');
          try {
            await del('/users/me', { password: f.password.value });
            close();
            stopTimerOnLogout();
            clearSession();
            toast('Your account has been deleted.', 'info');
            navigate('/register', { replace: true });
          } catch (err) {
            modal.querySelector('[data-error]').textContent = err.message;
            setBusy(button, false);
          }
        });
      });
    }
  },
};
