// NoSQL injection guard (Section 4.8): every request field must be a plain value.
// Objects, and keys that start with "$" or contain ".", are rejected before any route runs.
function hasUnsafeValue(value) {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.some((item) => typeof item === 'object' && item !== null);
  return typeof value === 'object';
}

function hasUnsafeKey(source) {
  return Object.keys(source).some((key) => key.startsWith('$') || key.includes('.'));
}

function rejectMongoOperators(req, res, next) {
  for (const source of [req.body, req.query, req.params]) {
    if (!source || typeof source !== 'object') continue;
    if (hasUnsafeKey(source) || Object.values(source).some(hasUnsafeValue)) {
      return res.status(400).json({ error: 'Invalid request.' });
    }
  }
  return next();
}

module.exports = { rejectMongoOperators };
