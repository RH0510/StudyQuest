# StudyQuest

**Plan • Study • Achieve.** A gamified student productivity web application built for the 3rd Year IT Project (Phase 5: Implementation).

Students track tasks, assignments and tests, organise their modules by semester (or quarter, trimester or term), run Pomodoro study sessions, and earn XP, levels, streaks, badges and rewards for completing real academic work.

## Technology

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS and JavaScript (ES modules, no framework) |
| Backend | Node.js 20+ with Express |
| Database | MongoDB Atlas, using the official MongoDB Node.js driver |
| Security | bcrypt password hashing, JWT in an HttpOnly cookie, CSRF tokens, Helmet headers, login rate limiting |

## Quick start (Windows)

1. Install **Node.js 22 LTS** from https://nodejs.org.
2. Open the project folder `C:\StudyQuest` in VS Code, then open a terminal (**Terminal › New Terminal**).
3. Install packages:
   ```
   npm install
   ```
4. Copy `.env.example` to `.env` and fill in `MONGODB_URI` and `JWT_SECRET`. To make a secret:
   ```
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
5. Create the collections and indexes:
   ```
   npm run init-db
   ```
6. Start the app and open http://localhost:3000:
   ```
   npm start
   ```

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Runs the server |
| `npm run dev` | Runs the server and restarts it when a file changes |
| `npm run init-db` | Creates the six collections and their indexes |
| `npm test` | Runs the unit and API tests against `TEST_MONGODB_URI` |
| `npm run backup` | Exports every collection to `backups/backup-<date>` (kept for 30 days) |
| `npm run restore -- backups/<folder>` | Replaces the database with a backup |

## Project structure

```
StudyQuest/
├── server.js              Starts the app (BEGIN SERVER, Section 4.6.5)
├── app.js                 Express app: security middleware, API routes, static files
├── config/                Database connection and game rules (Table 4.6.2)
├── middleware/            Authentication, CSRF, input checks, error handling
├── services/              XP, streaks, badges, rewards, tasks, accounts
├── routes/                REST API: auth, users, tasks, deadlines, sessions,
│                          rewards, dashboard, periods, modules
├── scripts/               init-db, backup, restore
├── tests/                 node:test unit and API tests
└── public/                Browser app: index.html, css/, js/, img/
```

## Database collections

| Collection | Purpose |
|---|---|
| `users` | Account, profile and preferences |
| `tasks` | Tasks and module assessments (assignments, tests, exams, projects) |
| `rewards` | One per student: XP, level, points, badges, redeemed rewards |
| `progress` | One per student: completed tasks, study time, streaks |
| `periods` | Academic periods: semesters, quarters, trimesters or terms |
| `modules` | Modules within a period |

## API overview

All routes are under `/api`. Every route except `auth/*` needs a logged-in session; every `POST`, `PUT` and `DELETE` needs the `X-CSRF-Token` header.

| Method and path | Purpose |
|---|---|
| `GET auth/csrf-token` · `POST auth/register` · `POST auth/login` · `POST auth/logout` · `GET auth/session` | Accounts and sessions |
| `GET/PUT users/me` · `PUT users/me/password` · `PUT users/me/preferences` · `GET users/me/export` · `DELETE users/me` | Profile and settings |
| `GET/POST tasks` · `PUT/DELETE tasks/:id` · `POST tasks/:id/complete` | Tasks and assessments |
| `GET deadlines` · `GET deadlines/reminders` | Deadline groups and 24-hour reminders |
| `POST sessions/start` · `POST sessions/cancel` · `POST sessions/complete` | Pomodoro study sessions |
| `GET rewards` · `POST rewards/redeem` | Badges and rewards store |
| `GET dashboard` | Dashboard summary |
| `GET/POST periods` · `PUT/DELETE periods/:id` | Academic periods |
| `GET/POST modules` · `PUT/DELETE modules/:id` | Modules |

## Team

Savannah, Tamsin, Lerato, Rohin, Mike and Thato. Supervisor: Miss Pam.
