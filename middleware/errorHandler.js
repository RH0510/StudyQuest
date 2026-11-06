function apiNotFound(req, res) {
  res.status(404).json({ error: 'Not found.' });
}

// Shows the user a safe message only; technical details stay in the server log (Section 4.8).
// Express recognises an error handler by its four parameters, so "next" must stay.
function errorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid request.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request is too large.' });
  if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message });
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, err);
  return res.status(500).json({ error: 'Something went wrong. Please try again.' });
}

module.exports = { apiNotFound, errorHandler };
