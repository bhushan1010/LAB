const config = require('../config/env');

function errorHandler(err, req, res, next) {
  console.error('Unhandled Error:', {
    message: err.message,
    stack: config.env === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
  });

  // Handle JSON parse errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'Malformed JSON payload in request body',
    });
  }

  // Handle PostgreSQL specific errors
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique constraint violation
        return res.status(409).json({
          success: false,
          error: 'Conflict: A record with this unique value already exists',
          detail: err.detail,
        });
      case '23503': // Foreign key violation
        return res.status(400).json({
          success: false,
          error: 'Referential integrity error: Referenced record does not exist',
          detail: err.detail,
        });
      case '23514': // Check constraint violation
        return res.status(400).json({
          success: false,
          error: 'Check constraint violation: Invalid field value supplied',
          detail: err.detail,
        });
      case '22P02': // Invalid text representation (e.g. invalid UUID format)
        return res.status(400).json({
          success: false,
          error: 'Invalid input format (e.g., malformed UUID or numeric value)',
        });
    }
  }

  // Default server error
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    error: err.message || 'Internal Server Error',
    ...(config.env === 'development' && { stack: err.stack }),
  });
}

module.exports = errorHandler;
