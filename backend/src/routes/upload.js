// backend/src/routes/upload.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const config = require('../config');
const { validateFileUpload } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.upload.dir);
  },
  filename: (req, file, cb) => {
    // Генерируем уникальное имя файла
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (config.upload.allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File extension ${ext} not allowed`), false);
    }
  },
});

/**
 * POST /api/upload
 * Upload a file for analysis
 */
router.post('/', upload.single('file'), validateFileUpload, asyncHandler(async (req, res) => {
  const scanService = req.app.get('scanService');
  
  try {
    const result = await scanService.processFile(req.file);
    
    res.json({
      success: true,
      message: 'File uploaded and static analysis complete. Behavioral emulation started.',
      data: result,
    });
  } catch (error) {
    // Очистка файла при ошибке
    await scanService.cleanupFile(req.file.path);
    throw error;
  }
}));

/**
 * GET /api/upload/config
 * Get upload configuration
 */
router.get('/config', (req, res) => {
  res.json({
    maxFileSize: config.upload.maxFileSize,
    allowedExtensions: config.upload.allowedExtensions,
    allowedMimeTypes: config.upload.allowedMimeTypes,
  });
});

module.exports = router;