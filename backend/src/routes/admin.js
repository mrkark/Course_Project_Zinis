const express = require('express');
const os = require('os');
const db = require('../config/database');
const { getAdminRuntimeState } = require('../socket/handlers');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAdmin } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Все роуты в этом файле — только для администратора.
router.use(requireAdmin);

router.get('/status', asyncHandler(async (req, res) => {
  const startedAt = process.env.SERVER_STARTED_AT ? Number(process.env.SERVER_STARTED_AT) : Date.now() - process.uptime() * 1000;
  const runtime = getAdminRuntimeState();

  let database = { status: 'offline' };
  try {
    const pool = await db.getPool();
    const result = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM dbo.Scans) AS scan_count,
        (SELECT COUNT(*) FROM dbo.ScanEvents) AS event_count
    `);
    database = {
      status: 'online',
      scans: Number(result.recordset[0]?.scan_count || 0),
      events: Number(result.recordset[0]?.event_count || 0),
    };
  } catch (error) {
    database = { status: 'offline', error: error.message };
  }

  const memory = process.memoryUsage();
  const cpu = process.cpuUsage();

  res.json({
    success: true,
    data: {
      status: 'ok',
      startedAt: new Date(startedAt).toISOString(),
      uptime: process.uptime() * 1000,
      node: process.version,
      platform: process.platform,
      hostname: os.hostname(),
      pid: process.pid,
      cpu: {
        user: cpu.user,
        system: cpu.system,
        loadAverage: os.loadavg(),
        cores: os.cpus().length,
      },
      memory: {
        rss: memory.rss,
        heapTotal: memory.heapTotal,
        heapUsed: memory.heapUsed,
        external: memory.external,
      },
      systemMemory: {
        total: os.totalmem(),
        free: os.freemem(),
      },
      sockets: runtime,
      database,
      timestamp: new Date().toISOString(),
    },
  });
}));

/**
 * GET /api/admin/users
 * Список всех пользователей с числом их сканирований.
 */
router.get('/users', asyncHandler(async (req, res) => {
  const users = await User.list();
  res.json({ success: true, data: users });
}));

/**
 * PATCH /api/admin/users/:id/block
 * body: { blocked: boolean }
 */
router.patch('/users/:id/block', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ success: false, error: 'Некорректный id' });
  }
  if (id === req.user.id) {
    return res.status(400).json({ success: false, error: 'Нельзя заблокировать самого себя' });
  }
  const blocked = !!req.body?.blocked;
  const user = await User.setBlocked(id, blocked);
  if (!user) {
    return res.status(404).json({ success: false, error: 'Пользователь не найден' });
  }
  res.json({ success: true, data: user });
}));

/**
 * DELETE /api/admin/users/:id
 */
router.delete('/users/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ success: false, error: 'Некорректный id' });
  }
  if (id === req.user.id) {
    return res.status(400).json({ success: false, error: 'Нельзя удалить самого себя' });
  }
  const deleted = await User.delete(id);
  if (!deleted) {
    return res.status(404).json({ success: false, error: 'Пользователь не найден' });
  }
  res.json({ success: true });
}));

module.exports = router;
