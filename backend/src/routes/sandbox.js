// backend/src/routes/sandbox.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const SandboxRun = require('../models/SandboxRun');

const router = express.Router();

// Всё в этом файле требует авторизации — песочница привязана к аккаунту.
router.use(requireAuth);

fs.mkdirSync(config.sandbox.samplesDir, { recursive: true });

// Разрешаем только простое безопасное имя файла: буквы/цифры/._-
const SAFE_NAME_RE = /^[a-zA-Z0-9._-]{1,80}$/;

/**
 * GET /api/sandbox/samples
 * Список инертных тестовых образцов (имя + содержимое как текст).
 * Файлы никогда не исполняются — читаются только как строки.
 */
router.get('/samples', asyncHandler(async (req, res) => {
  const dir = config.sandbox.samplesDir;
  const files = fs.readdirSync(dir).filter((f) => f.toLowerCase() !== 'readme.md');

  const samples = files.map((name) => {
    const content = fs.readFileSync(path.join(dir, name), 'utf8');
    return { name, content, size: Buffer.byteLength(content, 'utf8') };
  });

  res.json({ success: true, data: samples });
}));

/**
 * POST /api/sandbox/samples
 * body: { name, content }
 * Добавляет новый инертный текстовый образец в общую библиотеку.
 */
router.post('/samples', asyncHandler(async (req, res) => {
  const { name, content } = req.body || {};

  if (!name || !SAFE_NAME_RE.test(name)) {
    return res.status(400).json({
      success: false,
      error: 'Имя файла должно содержать только латинские буквы, цифры, точку, "_" или "-" (до 80 символов)',
    });
  }
  if (typeof content !== 'string' || content.length === 0) {
    return res.status(400).json({ success: false, error: 'Содержимое образца не может быть пустым' });
  }
  if (Buffer.byteLength(content, 'utf8') > config.sandbox.maxSampleSize) {
    return res.status(400).json({ success: false, error: 'Образец слишком большой (макс. 64KB)' });
  }

  const filePath = path.join(config.sandbox.samplesDir, name);
  fs.writeFileSync(filePath, content, 'utf8');

  res.status(201).json({ success: true, data: { name, content } });
}));

/**
 * POST /api/sandbox/runs
 * Сохранить результат запуска правила (выполнялось в Web Worker на клиенте).
 * body: { sampleName, ruleCode, status, result, durationMs }
 */
router.post('/runs', asyncHandler(async (req, res) => {
  const { sampleName, ruleCode, status, result, durationMs } = req.body || {};

  const allowedStatuses = ['match', 'no_match', 'error', 'timeout'];
  if (!sampleName || typeof ruleCode !== 'string' || !allowedStatuses.includes(status)) {
    return res.status(400).json({ success: false, error: 'Некорректные данные запуска' });
  }

  const run = await SandboxRun.create({
    userId: req.user.id,
    sampleName,
    ruleCode,
    status,
    result,
    durationMs: Number(durationMs) || 0,
  });

  res.status(201).json({ success: true, data: run });
}));

/**
 * GET /api/sandbox/runs
 * История запусков текущего пользователя.
 */
router.get('/runs', asyncHandler(async (req, res) => {
  const runs = await SandboxRun.listForUser(req.user.id);
  res.json({ success: true, data: runs });
}));

module.exports = router;
