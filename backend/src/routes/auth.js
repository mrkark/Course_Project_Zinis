// backend/src/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const config = require('../config');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const { signToken, setAuthCookie, clearAuthCookie, requireAuth } = require('../middleware/auth');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateCredentials(email, password) {
  if (!email || !EMAIL_RE.test(String(email))) {
    return 'Некорректный email';
  }
  if (!password || String(password).length < 8) {
    return 'Пароль должен быть не короче 8 символов';
  }
  return null;
}

/**
 * POST /api/auth/register
 * Регистрация обычного пользователя (role всегда 'user' — админку так не получить).
 */
router.post('/register', asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  const validationError = validateCredentials(email, password);
  if (validationError) {
    return res.status(400).json({ success: false, error: validationError });
  }

  if (await User.emailExists(email)) {
    return res.status(409).json({ success: false, error: 'Пользователь с таким email уже существует' });
  }

  const passwordHash = await bcrypt.hash(password, config.auth.bcryptRounds);
  const user = await User.create({ email, passwordHash, role: 'user' });

  const token = signToken(user);
  setAuthCookie(res, token);

  res.status(201).json({ success: true, data: user });
}));

/**
 * POST /api/auth/login
 * Единая форма для user и admin — роль определяется записью в БД.
 */
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Введите email и пароль' });
  }

  const row = await User.findByEmailRaw(email);
  if (!row) {
    return res.status(401).json({ success: false, error: 'Неверный email или пароль' });
  }

  if (row.is_blocked) {
    return res.status(403).json({ success: false, error: 'Аккаунт заблокирован администратором' });
  }

  const passwordMatches = await bcrypt.compare(password, row.password_hash);
  if (!passwordMatches) {
    return res.status(401).json({ success: false, error: 'Неверный email или пароль' });
  }

  const user = { id: row.id, email: row.email, role: row.role, isBlocked: false, createdAt: row.created_at };
  const token = signToken(user);
  setAuthCookie(res, token);

  res.json({ success: true, data: user });
}));

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ success: true });
});

/**
 * GET /api/auth/me
 * Текущий пользователь по cookie (или null, если не авторизован).
 */
router.get('/me', (req, res) => {
  res.json({ success: true, data: req.user || null });
});

/**
 * POST /api/auth/bootstrap-admin
 * Одноразовое создание первого администратора. Работает только если:
 *  - в БД ещё нет ни одного администратора, И
 *  - передан правильный BOOTSTRAP_ADMIN_KEY (задаётся в .env, не хранится в коде).
 * После создания первого админа рекомендуется очистить BOOTSTRAP_ADMIN_KEY в .env.
 */
router.post('/bootstrap-admin', asyncHandler(async (req, res) => {
  const { email, password, key } = req.body || {};

  if (!config.auth.bootstrapAdminKey) {
    return res.status(403).json({ success: false, error: 'Bootstrap отключён (BOOTSTRAP_ADMIN_KEY не задан)' });
  }
  if (key !== config.auth.bootstrapAdminKey) {
    return res.status(403).json({ success: false, error: 'Неверный ключ' });
  }

  const adminCount = await User.countAdmins();
  if (adminCount > 0) {
    return res.status(409).json({ success: false, error: 'Администратор уже существует' });
  }

  const validationError = validateCredentials(email, password);
  if (validationError) {
    return res.status(400).json({ success: false, error: validationError });
  }
  if (await User.emailExists(email)) {
    return res.status(409).json({ success: false, error: 'Пользователь с таким email уже существует' });
  }

  const passwordHash = await bcrypt.hash(password, config.auth.bcryptRounds);
  const user = await User.create({ email, passwordHash, role: 'admin' });

  res.status(201).json({ success: true, data: user });
}));

module.exports = router;
