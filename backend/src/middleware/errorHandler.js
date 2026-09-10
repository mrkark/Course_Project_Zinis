// backend/src/middleware/errorHandler.js
const config = require('../config');

/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, next) {
  console.error('❌ Error:', err.message);
  console.error(err.stack);
  
  // Multer errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'File too large',
        maxSize: config.upload.maxFileSize,
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected file field' });
    }
    return res.status(400).json({ error: err.message });
  }
  
  if (err.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      error: err.message,
      allowed: config.upload.allowedExtensions,
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  
  // Database errors
  if (err.name === 'RequestError' || err.code) {
    console.error('DB Error caught:', err.name, err.code, err.message, err.originalError?.message);
    return res.status(500).json({ 
      error: 'Database error',
      message: config.nodeEnv === 'development' ? (err.message || err.originalError?.message || 'No message') : 'Internal server error',
    });
  }
  
  // Default error
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  });
}

/**
 * 404 handler
 */
function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Endpoint not found' });
}

/**
 * Async wrapper for route handlers
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
};