// backend/server.js
require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const config = require('./src/config');
const { requestLogger } = require('./src/middleware/logger');
const { errorHandler, notFoundHandler, asyncHandler } = require('./src/middleware/errorHandler');
const { setupSocketHandlers } = require('./src/socket/handlers');
const ScanService = require('./src/services/scanService');

// Routes
const uploadRoutes = require('./src/routes/upload');
const scansRoutes = require('./src/routes/scans');
const threatsRoutes = require('./src/routes/threats');

// Initialize Express app
const app = express();
const server = http.createServer(app);

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
app.use(requestLogger);

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, config.upload.dir)));

// Initialize services
const scanService = new ScanService(io);
app.set('scanService', scanService);

// Setup Socket.IO handlers
setupSocketHandlers(io, scanService);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// API Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/scans', scansRoutes);
app.use('/api/threats', threatsRoutes);

// Serve frontend build in production
if (config.nodeEnv === 'production') {
  const frontendDist = path.resolve(__dirname, '../frontend/dist');
  console.log(`📁 Serving frontend from: ${frontendDist}`);
  console.log(`📁 Exists: ${require('fs').existsSync(frontendDist)}`);
  console.log(`📁 index.html exists: ${require('fs').existsSync(path.join(frontendDist, 'index.html'))}`);
  
  app.use(express.static(frontendDist));
  
  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
      if (err) {
        console.error('❌ sendFile error:', err);
        res.status(404).send('Frontend not found. Run "npm run build" in frontend folder.');
      }
    });
  });
} else {
  // Development: proxy API requests to Vite dev server is handled by Vite config
  // But we can add a helpful message for non-API routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.status(404).json({ 
      error: 'Frontend not built. Run "npm run build" in frontend folder, or use Vite dev server at http://localhost:5173' 
    });
  });
}

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Graceful shutdown
async function shutdown() {
  console.log('🛑 Shutting down gracefully...');
  
  // Close Socket.IO
  io.close(() => {
    console.log('🔌 Socket.IO closed');
  });
  
  // Close HTTP server
  server.close(async () => {
    console.log('🌐 HTTP server closed');
    
    // Close database pool
    const db = require('./src/config/database');
    await db.closePool();
    
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
server.listen(config.port, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  🛡️  Malware Sandbox Platform - Backend Server            ║
╠═══════════════════════════════════════════════════════════╣
║  🌐  Server running on http://localhost:${config.port}              ║
║  🔌  Socket.IO enabled                                     ║
║  🗄️  Database: ${config.db.database} @ ${config.db.server}:${config.db.port}          ║
║  📁  Uploads: ${config.upload.dir}                              ║
║  🌍  Frontend: ${config.frontend.url}                            ║
║  🏗️  Environment: ${config.nodeEnv}                                  ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

module.exports = { app, server, io };