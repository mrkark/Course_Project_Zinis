// backend/src/routes/upload.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const config = require('../config');
const { validateFileUpload } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();
// Нормализация имени файла: некоторые версии Multer получают UTF-8 имя как Latin-1.
function decodeOriginalFilename(filename) {
  if (!filename) return filename;
  if (/[А-Яа-яЁё]/.test(filename)) return filename;
  try {
    const decoded = Buffer.from(filename, 'latin1').toString('utf8');
    if (decoded && !decoded.includes('\uFFFD') && /[А-Яа-яЁё]/.test(decoded)) return decoded;
  } catch (_) {}
  return filename;
}

function normalizeUploadedFile(file) {
  if (file) file.originalname = decodeOriginalFilename(file.originalname);
  return file;
}


// Ensure the upload directory exists before multer receives the file.
const fs = require('fs');
fs.mkdirSync(config.upload.dir, { recursive: true });

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
      const error = new Error(`Расширение файла ${ext || '(нет)'} не поддерживается`);
      error.status = 400;
      error.code = 'INVALID_FILE_TYPE';
      cb(error, false);
    }
  },
});

/**
 * POST /api/upload
 * Upload a single file for analysis
 */
router.post('/', upload.single('file'), validateFileUpload, asyncHandler(async (req, res) => {
  normalizeUploadedFile(req.file);
  const scanService = req.app.get('scanService');
  
  try {
    const result = await scanService.processFile(req.file, req.user.id);
    
    res.json({
      success: true,
      message: 'Файл загружен. Статический анализ завершён, поведенческая эмуляция запущена.',
      data: result,
    });
  } catch (error) {
    // Очистка файла при ошибке
    await scanService.cleanupFile(req.file.path);
    throw error;
  }
}));

/**
 * POST /api/upload/multiple
 * Upload multiple files for analysis
 */
router.post('/multiple', upload.array('files', 10), validateFileUpload, asyncHandler(async (req, res) => {
  req.files?.forEach(normalizeUploadedFile);
  const scanService = req.app.get('scanService');
  
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'Файлы не загружены' });
    }
    
    const results = [];
    for (const file of files) {
      const result = await scanService.processFile(file, req.user.id);
      results.push({ filename: file.originalname, ...result });
    }
    
    res.json({
      success: true,
      message: `Загружено файлов: ${files.length}. Статический анализ завершён, поведенческая эмуляция запущена.`,
      data: results,
    });
  } catch (error) {
    // Очистка файлов при ошибке
    if (req.files) {
      for (const file of req.files) {
        await scanService.cleanupFile(file.path);
      }
    }
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