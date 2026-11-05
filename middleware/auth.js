const jwt = require('jsonwebtoken');
const { collections } = require('../config/db');
const { toObjectId } = require('../utils/validation');
const { SESSION_LIFETIME_HOURS } = require('../config/constants');

const COOKIE_NAME = 'session';

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  };
}

// LoginUser (Section 4.6.6): the signed JWT is held in an HttpOnly cookie (Section 4.8).
function setSessionCookie(res, userId) {
  const token = jwt.sign({ userId: String(userId) }, process.env.JWT_SECRET, {
    expiresIn: `${SESSION_LIFETIME_HOURS}h`,
  });
  res.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: SESSION_LIFETIME_HOURS * 60 * 60 * 1000 });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
}

// AuthenticateRequest (Section 4.6.6): runs before every protected route.
// The user ID always comes from the verified token, never from the request body or URL.
async function authenticateRequest(req, res, next) {
  try {
    const token = req.cookies ? req.cookies[COOKIE_NAME] : null;
    if (!token) return res.status(401).json({ error: 'Please log in again' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const userId = toObjectId(payload.userId);
    if (!userId) return res.status(401).json({ error: 'Please log in again' });
    const exists = await collections().users.findOne({ _id: userId }, { projection: { _id: 1 } });
    if (!exists) {
      clearSessionCookie(res);
      return res.status(401).json({ error: 'Please log in again' });
    }
    req.userId = userId;
    return next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Please log in again' });
    }
    return next(err);
  }
}

module.exports = { authenticateRequest, setSessionCookie, clearSessionCookie, COOKIE_NAME };
