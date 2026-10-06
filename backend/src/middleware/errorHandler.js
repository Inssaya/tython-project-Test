const ApiError = require('../utils/ApiError');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message,
      details: err.details,
    });
  }

  // Postgres unique violation that slipped past app-level checks
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Resource already exists.' });
  }

  console.error(err);
  return res.status(500).json({ error: 'Internal server error.' });
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found.` });
}

module.exports = { errorHandler, notFoundHandler };
