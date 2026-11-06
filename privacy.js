// Privacy Policy, written for the Protection of Personal Information Act 4 of 2013 (POPIA).
import { icon } from '../icons.js';

export default {
  title: 'Privacy Policy',
  access: 'any',
  async render(root) {
    root.innerHTML = `
      <div class="container page page-narrow">
        <h1 class="page-title settings-title">${icon('shield-check', { size: 32 })}Privacy Policy</h1>
        <p class="page-sub">How StudyQuest collects, uses and protects your personal information.</p>
        <article class="card prose">
          <h2>1. Who we are</h2>
          <p>StudyQuest is a student productivity application built as a 3rd Year IT Project at Richfield Graduate Institute of Technology. We process personal information in line with the Protection of Personal Information Act 4 of 2013 (POPIA).</p>

          <h2>2. What we collect</h2>
          <ul>
            <li><strong>Account details:</strong> your name, email address and a securely hashed password. We never store your password in plain text.</li>
            <li><strong>Profile details you choose to add:</strong> institution, course, year of study and bio.</li>
            <li><strong>Study data:</strong> your tasks, modules, assignment and test dates, study sessions, XP, level, streaks, badges and rewards.</li>
          </ul>

          <h2>3. Why we collect it</h2>
          <p>We use your information only to run the app for you: to log you in, show your tasks and deadlines, remind you of work that is due, and calculate your XP, streaks and badges. We do not sell your information or use it for advertising.</p>

          <h2>4. Who can see it</h2>
          <p>Only you can see your account and study data. Every request is checked against your logged-in account, so other students cannot read or change your records. Your data is stored in a MongoDB Atlas database with access limited to the StudyQuest application.</p>

          <h2>5. How we protect it</h2>
          <ul>
            <li>Passwords are hashed with bcrypt.</li>
            <li>Your login session is kept in a secure, HttpOnly cookie that expires after 24 hours.</li>
            <li>The live site uses HTTPS, and repeated failed logins are limited.</li>
            <li>Backups are stored separately with restricted access and kept for 30 days.</li>
          </ul>

          <h2>6. Your rights</h2>
          <p>Under POPIA you may access, correct or delete your personal information. In StudyQuest you can:</p>
          <ul>
            <li>update your details under <a href="/settings?tab=profile">Settings › Edit profile</a>;</li>
            <li>download a copy of all your data under <a href="/settings?tab=account">Settings › Account</a>;</li>
            <li>permanently delete your account and all its data under <a href="/settings?tab=account">Settings › Account</a>.</li>
          </ul>
          <p>If you believe your information has been mishandled, you may lodge a complaint with the Information Regulator (South Africa).</p>

          <h2>7. Contact</h2>
          <p>For privacy questions, contact the StudyQuest project team through your module supervisor.</p>
          <p class="muted small">Last updated: November 2026</p>
        </article>
      </div>`;
  },
};
