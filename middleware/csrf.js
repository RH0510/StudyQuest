const crypto = require('crypto');

// Double-submit CSRF protection (Section 4.8): the token is stored in a readable cookie
// and must be echoed back in the X-CSRF-Token header on every request that changes data.
const CSRF_COOKIE = 'csrf';
const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function issueCsrfToken(req, res) {
  const existing = req.cookies ? req.cookies[CSRF_COOKIE] : null;
  const token = existing && /^[a-f0-9]{64}$/.test(existing) ? existing : crypto.randomBytes(32).toString('hex');
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
  res.json({ csrfToken: token });
}

function verifyCsrf(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  const cookieToken = req.cookies ? req.cookies[CSRF_COOKIE] : '';
  const headerToken = req.get(CSRF_HEADER) || '';
  const valid = typeof cookieToken === 'string'
    && cookieToken.length === 64
    && headerToken.length === 64
    && crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken));
  if (!valid) return res.status(403).json({ error: 'Your session expired. Please refresh the page and try again.' });
  return next();
}

module.exports = { issueCsrfToken, verifyCsrf };
