// Game rules and limits from Section 4.6.4 (Table 4.6.2). Change values here only.

const toNumber = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const XP_TASK_ON_TIME = 20;
const XP_TASK_LATE = 10;
const XP_STUDY_SESSION = 10;
const XP_PER_LEVEL = 100;

const FOCUS_MINUTES = toNumber(process.env.FOCUS_MINUTES, 25);
const BREAK_MINUTES = toNumber(process.env.BREAK_MINUTES, 5);

const REMINDER_WINDOW_HOURS = 24;
const MIN_PASSWORD_LENGTH = 8;
const SESSION_LIFETIME_HOURS = 24;
const LOGIN_RATE_LIMIT = toNumber(process.env.LOGIN_RATE_LIMIT, 5);
const LOGIN_RATE_WINDOW_MINUTES = 15;
const BCRYPT_ROUNDS = 12;

const LIMITS = {
  nameMax: 80,
  emailMax: 120,
  titleMax: 100,
  descriptionMax: 500,
  profileFieldMax: 100,
  bioMax: 300,
  periodNameMax: 40,
  moduleCodeMax: 12,
  moduleNameMax: 80,
  lecturerMax: 60,
};

// Table 4.6.4: badge rules. Each badge is awarded once.
const BADGE_RULES = [
  { id: 'first-step', name: 'First Step', icon: 'footprints', requirement: 'Complete 1 task', test: (p) => p.completedTasks >= 1 },
  { id: 'task-master', name: 'Task Master', icon: 'list-checks', requirement: 'Complete 10 tasks', test: (p) => p.completedTasks >= 10 },
  { id: 'on-a-roll', name: 'On a Roll', icon: 'flame', requirement: 'Reach a 3-day streak', test: (p) => p.currentStreak >= 3 },
  { id: 'week-warrior', name: 'Week Warrior', icon: 'calendar-check', requirement: 'Reach a 7-day streak', test: (p) => p.currentStreak >= 7 },
  { id: 'focused-five', name: 'Focused Five', icon: 'timer', requirement: 'Finish 5 study sessions', test: (p) => p.sessionsCompleted >= 5 },
  { id: 'level-5-scholar', name: 'Level 5 Scholar', icon: 'graduation-cap', requirement: 'Reach level 5', test: (p, r) => r.level >= 5 },
];

// Table 4.6.5: reward catalogue, bought with pointsBalance.
const REWARD_CATALOGUE = [
  { id: 'dark-theme', name: 'Dark theme', icon: 'moon', cost: 150, description: 'Unlocks a dark colour theme toggle.' },
  { id: 'streak-flame', name: 'Streak flame colours', icon: 'flame', cost: 200, description: 'Your streak flame turns from orange to purple/blue.' },
  { id: 'gold-frame', name: 'Gold avatar frame', icon: 'sparkles', cost: 300, description: 'A gold ring around your profile avatar.' },
];

const TASK_STATUSES = ['pending', 'complete'];
const TASK_TYPES = ['task', 'assignment', 'test', 'exam', 'project'];
const PERIOD_TYPES = ['Semester', 'Quarter', 'Trimester', 'Term'];
const MODULE_COLOURS = ['#2D6FE7', '#F2B90A', '#16A34A', '#DC2626', '#7C3AED', '#0891B2', '#EA580C', '#DB2777'];
const THEMES = ['light', 'dark'];
const FLAME_STYLES = ['classic', 'cool'];

module.exports = {
  XP_TASK_ON_TIME,
  XP_TASK_LATE,
  XP_STUDY_SESSION,
  XP_PER_LEVEL,
  FOCUS_MINUTES,
  BREAK_MINUTES,
  REMINDER_WINDOW_HOURS,
  MIN_PASSWORD_LENGTH,
  SESSION_LIFETIME_HOURS,
  LOGIN_RATE_LIMIT,
  LOGIN_RATE_WINDOW_MINUTES,
  BCRYPT_ROUNDS,
  LIMITS,
  BADGE_RULES,
  REWARD_CATALOGUE,
  TASK_STATUSES,
  TASK_TYPES,
  PERIOD_TYPES,
  MODULE_COLOURS,
  THEMES,
  FLAME_STYLES,
};
