// backend/src/middleware/validation.js
const config = require('../config');

/**
 * Validate file upload (single or multiple)
 */
function validateFileUpload(req, res, next) {
  const files = req.files || (req.file ? [req.file] : []);
  
  if (files.length === 0) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  for (const file of files) {
    const { originalname, mimetype, size } = file;
    const ext = originalname.substring(originalname.lastIndexOf('.')).toLowerCase();
    
    // Проверка расширения
    if (!config.upload.allowedExtensions.includes(ext)) {
      return res.status(400).json({ 
        error: `File extension ${ext} not allowed`,
        allowed: config.upload.allowedExtensions,
      });
    }
    
    // Проверка MIME типа
    if (!config.upload.allowedMimeTypes.includes(mimetype)) {
      return res.status(400).json({ 
        error: `MIME type ${mimetype} not allowed`,
        allowed: config.upload.allowedMimeTypes,
      });
    }
    
    // Проверка размера
    if (size > config.upload.maxFileSize) {
      return res.status(400).json({ 
        error: `File size ${size} exceeds limit of ${config.upload.maxFileSize} bytes`,
        maxSize: config.upload.maxFileSize,
      });
    }
  }
  
  next();
}

/**
 * Validate scan ID parameter
 */
function validateScanId(req, res, next) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid scan ID' });
  }
  req.scanId = id;
  next();
}

/**
 * Validate pagination query params
 */
function validatePagination(req, res, next) {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  
  req.pagination = { limit, offset };
  next();
}

/**
 * Validate date query params
 */
function validateDates(req, res, next) {
  const { dateFrom, dateTo } = req.query;
  
  if (dateFrom && isNaN(Date.parse(dateFrom))) {
    return res.status(400).json({ error: 'Invalid dateFrom format. Use ISO 8601.' });
  }
  
  if (dateTo && isNaN(Date.parse(dateTo))) {
    return res.status(400).json({ error: 'Invalid dateTo format. Use ISO 8601.' });
  }
  
  req.filters = {
    ...req.filters,
    dateFrom: dateFrom ? new Date(dateFrom) : undefined,
    dateTo: dateTo ? new Date(dateTo) : undefined,
  };
  
  next();
}

module.exports = {
  validateFileUpload,
  validateScanId,
  validatePagination,
  validateDates,
};