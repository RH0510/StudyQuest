const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { collections } = require('../config/db');
const {
  MIN_PASSWORD_LENGTH, BCRYPT_ROUNDS, LIMITS, LOGIN_RATE_LIMIT, LOGIN_RATE_WINDOW_MINUTES,
} = require('../config/constants');
const { isValidEmail, cleanString, normaliseEmail } = require('../utils/validation');
const { asyncHandler, HttpError } = require('../utils/http');
const { issueCsrfToken } = require('../middleware/csrf');
const { authenticateRequest, setSessionCookie, clearSessionCookie } = require('../middleware/auth');
const { defaultPreferences, publicUser, createAccountDocuments, sessionSummary } = require('../services/account');
const { refreshStreak } = require('../services/streaks');

const router = express.Router();
const DUMMY_HASH = bcrypt.hashSync('studyquest-placeholder-password', BCRYPT_ROUNDS);

// Section 4.8: limit repeated failed logins per IP address. Successful logins are not counted.
const loginLimiter = rateLimit({
  windowMs: LOGIN_RATE_WINDOW_MINUTES * 60 * 1000,
  limit: LOGIN_RATE_LIMIT,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: `Too many failed login attempts. Please wait ${LOGIN_RATE_WINDOW_MINUTES} minutes and try again.` },
});

router.get('/csrf-token', issueCsrfToken);

// RegisterUser (Section 4.6.6)
router.post('/register', asyncHandler(async (req, res) => {
  const name = cleanString(req.body.name);
  const email = normaliseEmail(req.body.email);
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const confirmPassword = typeof req.body.confirmPassword === 'string' ? req.body.confirmPassword : '';

  if (!name || !email || !password) throw new HttpError(400, 'All fields are required');
  if (name.length > LIMITS.nameMax) throw new HttpError(400, 'Name is too long');
  if (!isValidEmail(email) || email.length > LIMITS.emailMax) throw new HttpError(400, 'Please enter a valid email address');
  if (password.length < MIN_PASSWORD_LENGTH) throw new HttpError(400, 'Password must be at least 8 characters');
  if (password !== confirmPassword) throw new HttpError(400, 'Passwords do not match');

  const { users } = collections();
  if (await users.findOne({ email }, { projection: { _id: 1 } })) {
    throw new HttpError(409, 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  let insertedId;
  try {
    ({ insertedId } = await users.insertOne({
      name,
      email,
      passwordHash,
      institution: '',
      course: '',
      yearOfStudy: '',
      bio: '',
      periodType: 'Semester',
      preferences: defaultPreferences(),
      createdAt: new Date(),
    }));
  } catch (err) {
    if (err.code === 11000) throw new HttpError(409, 'An account with this email already exists');
    throw err;
  }
  await createAccountDocuments(insertedId);
  res.status(201).json({ message: 'Account created. Please log in.' });
}));

// LoginUser (Section 4.6.6): the same message is shown for a wrong email or a wrong password.
router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const email = normaliseEmail(req.body.email);
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const user = email ? await collections().users.findOne({ email }) : null;
  // A hash is always compared so a missing account takes as long to reject as a wrong password.
  const valid = (await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH)) && Boolean(user);
  if (!valid) {
    console.warn(`[${new Date().toISOString()}] Failed login from ${req.ip}`);
    throw new HttpError(401, 'Incorrect email or password');
  }
  setSessionCookie(res, user._id);
  res.json({ user: publicUser(user) });
}));

// LogoutUser (Section 4.6.6): the server clears the HttpOnly cookie.
router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ message: 'Logged out' });
});

// Used by MAIN on every page load: confirms the session and runs RefreshStreak (FR-28).
router.get('/session', (req, res, next) => {
  if (!req.cookies || !req.cookies.session) return res.json({ authenticated: false });
  return next();
}, authenticateRequest, asyncHandler(async (req, res) => {
  const { reset } = await refreshStreak(req.userId);
  const summary = await sessionSummary(req.userId);
  res.json({ authenticated: true, ...summary, streakReset: reset });
}));

module.exports = router;
