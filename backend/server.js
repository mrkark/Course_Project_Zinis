// backend/server.js
require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const config = require('./src/config');
const { requestLogger } = require('./src/middleware/logger');
const { errorHandler, notFoundHandler, asyncHandler } = require('./src/middleware/errorHandler');
const { attachUser, requireAuth } = require('./src/middleware/auth');
const { setupSocketHandlers } = require('./src/socket/handlers');
const ScanService = require('./src/services/scanService');

// Routes
const authRoutes = require('./src/routes/auth');
const uploadRoutes = require('./src/routes/upload');
const scansRoutes = require('./src/routes/scans');
const threatsRoutes = require('./src/routes/threats');
const adminRoutes = require('./src/routes/admin');
const sandboxRoutes = require('./src/routes/sandbox');

// Initialize Express app
console.log('🚀 Starting server initialization...');
const app = express();
const server = http.createServer(app);
console.log('✅ Express app created');

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: config.frontend.url,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: config.socket.pingTimeout,
  pingInterval: config.socket.pingInterval,
});

// Middleware
app.use(cors({
  origin: config.frontend.url,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(requestLogger);
app.use(attachUser); // кладёт req.user, если есть валидный JWT в cookie

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, config.upload.dir)));

// Initialize services
console.log('🔄 Initializing ScanService...');
const scanService = new ScanService(io);
app.set('scanService', scanService);
console.log('✅ ScanService initialized');

// Setup Socket.IO handlers
console.log('🔄 Setting up Socket.IO handlers...');
setupSocketHandlers(io, scanService);
console.log('✅ Socket.IO handlers setup');

// Health check (публичный)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// Auth — публичные роуты (свои проверки прав внутри, где нужно)
app.use('/api/auth', authRoutes);

// Защищённые API роуты — доступны только авторизованным пользователям.
// threats остаётся публичным справочником (не содержит персональных данных).
app.use('/api/threats', threatsRoutes);
app.use('/api/upload', requireAuth, uploadRoutes);
app.use('/api/scans', requireAuth, scansRoutes);
app.use('/api/sandbox', sandboxRoutes); // сам проверяет requireAuth внутри
app.use('/api/admin', adminRoutes); // сам проверяет requireAdmin внутри

// ========== Complete scan endpoint ==========
app.post('/api/upload/complete', requireAuth, asyncHandler(async (req, res) => {
  const scanService = req.app.get('scanService');
  const { tempScanId, staticResults, staticDetection, behavioralEvents, malwareType } = req.body;

  if (!tempScanId) {
    return res.status(400).json({ success: false, error: 'tempScanId required' });
  }

  try {
    const result = await scanService.completeScan(
      tempScanId,
      staticResults,
      staticDetection,
      behavioralEvents || [],
      malwareType,
      req.user.id
    );

    res.json({
      success: true,
      message: 'Scan completed and saved to database',
      data: result,
    });
  } catch (error) {
    console.error('❌ Failed to complete scan:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}));

// Admin monitor page — отдаём только администратору, иначе редирект на логин.
app.get('/admin', (req, res) => {
  if (!req.user) return res.redirect('/login.html?next=/admin');
  if (req.user.role !== 'admin') return res.status(403).send('Доступ только для администратора');
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
app.use('/admin', (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).end();
  next();
}, express.static(path.join(__dirname, 'public')));

// Frontend: обычные статические файлы (без Vite и сборки).
// Express отдаёт их напрямую — и в dev, и в prod это один и тот же код.
const frontendDir = path.resolve(__dirname, '..', 'frontend');

if (fs.existsSync(frontendDir)) {
  console.log(`📁 Serving frontend from: ${frontendDir}`);
  app.use(express.static(frontendDir));

  // Многостраничный сайт: каждая страница — отдельный .html файл,
  // SPA-fallback не нужен. Отдаём 404-страницу для неизвестных путей.
  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/uploads') ||
      req.path.startsWith('/socket.io') ||
      req.path.startsWith('/admin')
    ) {
      return next();
    }
    res.status(404).sendFile(path.join(frontendDir, '404.html'), (err) => {
      if (err) res.status(404).send('Страница не найдена');
    });
  });
} else {
  console.warn('⚠️ Папка frontend не найдена рядом с backend.');
}

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Graceful shutdown
async function shutdown() {
  console.log('🛑 Shutting down gracefully...');

  io.close(() => {
    console.log('🔌 Socket.IO closed');
  });

  server.close(async () => {
    console.log('🌐 HTTP server closed');

    const db = require('./src/config/database');
    await db.closePool();

    process.exit(0);
  });

  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
console.log('🔄 Starting HTTP server on port', config.port);
server.listen(config.port, () => {
  console.log(`
╔═════════════════════════════════════════════════════════════╗
║  🛡️  Malware Sandbox Platform - Backend Server            ║
╠══════════════════════════════════════════════════════════════╣
║  🌐  Server running on http://localhost:${config.port}              ║
║  🔌  Socket.IO enabled                                     ║
║  🗄️  Database: ${config.db.database} @ ${config.db.server}:${config.db.port}          ║
║  📁  Uploads: ${config.upload.dir}                              ║
║  🏗️  Environment: ${config.nodeEnv}                                  ║
║  📊  Admin Monitor: http://localhost:${config.port}/admin           ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
});

module.exports = { app, server, io };
