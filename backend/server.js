// backend/server.js
require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const config = require('./src/config');
const { requestLogger } = require('./src/middleware/logger');
const { errorHandler, notFoundHandler, asyncHandler } = require('./src/middleware/errorHandler');
const { setupSocketHandlers } = require('./src/socket/handlers');
const ScanService = require('./src/services/scanService');

// Routes
const uploadRoutes = require('./src/routes/upload');
const scansRoutes = require('./src/routes/scans');
const threatsRoutes = require('./src/routes/threats');
const adminRoutes = require('./src/routes/admin');

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
app.use(requestLogger);

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
app.use('/api/admin', adminRoutes);

// Admin monitor page - serve at /admin on port 3000
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Admin page assets
app.use('/admin', express.static(path.join(__dirname, 'public')));

// ========== NEW: Complete scan endpoint ==========
app.post('/api/upload/complete', asyncHandler(async (req, res) => {
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
      malwareType
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

// Serve frontend - different for dev vs prod
const isProduction = config.nodeEnv === 'production';
const frontendDist = path.resolve(__dirname, '..', 'frontend', 'dist');

if (isProduction) {
  // Production: serve built React app from dist/
  console.log(`📁 Serving frontend from: ${frontendDist}`);
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    
    // SPA fallback - serve index.html for all non-API routes
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/socket.io') || req.path.startsWith('/admin')) {
        return next();
      }
      res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
        if (err) {
          console.error('❌ sendFile error:', err);
          res.status(404).send('Frontend not built. Run "npm run build" in frontend folder.');
        }
      });
    });
  } else {
    console.warn('⚠️ Frontend dist not found. Run "npm run build" in frontend folder.');
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/socket.io') || req.path.startsWith('/admin')) {
        return next();
      }
      res.status(404).send('Frontend not built. Run "npm run build" in frontend folder.');
    });
  }
} else {
  // Development: redirect to Vite dev server
  console.log('🔧 Development mode: Frontend served by Vite at http://localhost:5173');
  
  app.get('/', (req, res) => {
    res.redirect('http://localhost:5173');
  });
  
  // Redirect non-API routes to Vite dev server
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/socket.io') || req.path.startsWith('/admin')) {
      return next();
    }
    res.redirect('http://localhost:5173' + req.path);
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
║  🌍  Frontend: ${config.frontend.url}                            ║
║  🏗️  Environment: ${config.nodeEnv}                                  ║
║  📊  Admin Monitor: http://localhost:${config.port}/admin           ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
});

module.exports = { app, server, io };