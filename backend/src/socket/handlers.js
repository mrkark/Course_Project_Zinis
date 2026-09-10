// backend/src/socket/handlers.js
const ScanEvent = require('../models/ScanEvent');

// Store connected clients
const connectedClients = new Map();

// Store recent logs for admin
const recentLogs = [];
const MAX_LOGS = 500;

function addLog(level, message, meta = {}) {
  const log = { timestamp: new Date(), level, message, meta };
  recentLogs.unshift(log);
  if (recentLogs.length > MAX_LOGS) recentLogs.pop();
}

function broadcastLog(level, message, meta = {}) {
  addLog(level, message, meta);
  adminNamespace.emit('log', { level, message, meta, timestamp: new Date() });
}

let adminNamespace = null;
let scanServiceRef = null;

function setupSocketHandlers(io, scanService) {
  scanServiceRef = scanService;

  // ========== Admin Namespace ==========
  adminNamespace = io.of('/admin');
  
  adminNamespace.on('connection', (socket) => {
    console.log(`🔧 Admin connected: ${socket.id}`);
    
    // Send initial state
    socket.emit('initial:state', {
      clients: Array.from(connectedClients.values()).map(c => ({
        id: c.id,
        userAgent: c.userAgent,
        ip: c.ip,
        joinedAt: c.joinedAt,
        eventCount: c.eventCount,
      })),
      logs: recentLogs.slice(0, 100).reverse(),
      uptime: process.uptime() * 1000,
    });

    socket.on('admin:clearLogs', () => {
      recentLogs.length = 0;
      adminNamespace.emit('log', {
        level: 'info',
        message: 'Admin cleared in-memory server logs',
        meta: {},
        timestamp: new Date(),
      });
    });

    socket.on('admin:getState', () => {
      socket.emit('initial:state', {
        clients: Array.from(connectedClients.values()).map(c => ({
          id: c.id,
          userAgent: c.userAgent,
          ip: c.ip,
          joinedAt: c.joinedAt,
          eventCount: c.eventCount,
        })),
        logs: recentLogs.slice(0, 100).reverse(),
        uptime: process.uptime() * 1000,
      });
    });

    socket.on('disconnect', () => {
      console.log(`🔧 Admin disconnected: ${socket.id}`);
    });
  });

  // ========== Main Namespace ==========
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);
    
    // Track client connection
    const clientInfo = {
      id: socket.id,
      userAgent: socket.handshake.headers['user-agent'] || 'Unknown',
      ip: socket.handshake.address,
      connected: true,
      joinedAt: new Date(),
      eventCount: 0,
    };
    
    connectedClients.set(socket.id, clientInfo);
    
    // Notify admin
    broadcastLog('socket', `Client connected: ${socket.id}`);
    adminNamespace.emit('client:connected', clientInfo);

    // Scan room handling
    socket.on('scan:join', (scanId) => {
      const room = `scan:${scanId}`;
      socket.join(room);
      console.log(`📥 Socket ${socket.id} joined room ${room}`);
      socket.emit('scan:joined', { scanId, room });
    });

    socket.on('scan:leave', (scanId) => {
      const room = `scan:${scanId}`;
      socket.leave(room);
      console.log(`📤 Socket ${socket.id} left room ${room}`);
    });

    // Client reporting its info
    socket.on('client:info', (info) => {
      const client = connectedClients.get(socket.id);
      if (client) {
        Object.assign(client, info);
        adminNamespace.emit('client:info', { id: socket.id, ...info });
      }
    });

    // Client reporting events
    socket.on('client:event', (data) => {
      const client = connectedClients.get(socket.id);
      if (client) {
        client.eventCount = (client.eventCount || 0) + 1;
        client.lastEvent = new Date();
      }
      adminNamespace.emit('client:event', { clientId: socket.id, ...data });
    });

    // Scan events request
    socket.on('scan:events:request', async (scanId) => {
      try {
        const events = await ScanEvent.findByScanId(scanId);
        socket.emit('scan:events:response', { scanId, events });
      } catch (error) {
        console.error('Failed to fetch scan events:', error);
        socket.emit('scan:events:error', { scanId, error: error.message });
      }
    });

    // Alerts subscription
    socket.on('alerts:subscribe', () => {
      socket.join('alerts:global');
      socket.emit('alerts:subscribed', { success: true });
    });

    socket.on('alerts:unsubscribe', () => {
      socket.leave('alerts:global');
    });

    // Dashboard stats request
    socket.on('dashboard:stats:request', async () => {
      try {
        const stats = await scanServiceRef.getStats();
        socket.emit('dashboard:stats:response', { stats });
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
        socket.emit('dashboard:stats:error', { error: error.message });
      }
    });

    // Heartbeat
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Client disconnected: ${socket.id} - ${reason}`);
      
      const client = connectedClients.get(socket.id);
      if (client) {
        client.connected = false;
        client.disconnectedAt = new Date();
        client.disconnectReason = reason;
        adminNamespace.emit('client:disconnected', { id: socket.id, reason });
        broadcastLog('warning', `Client disconnected: ${socket.id}`, { reason });
      }
      
      connectedClients.delete(socket.id);
    });
  });

  // Export log function for other modules
  global.adminLog = broadcastLog;

  // Periodic stats broadcast
  setInterval(async () => {
    try {
      const stats = await scanServiceRef.getStats();
      io.emit('dashboard:stats:update', { stats, timestamp: new Date().toISOString() });
      adminNamespace.emit('dashboard:stats:update', { stats, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error('Failed to emit periodic stats:', error);
    }
  }, 30000);
}

function getAdminRuntimeState() {
  let connected = 0;
  let disconnected = 0;
  for (const client of connectedClients.values()) {
    if (client.connected) connected += 1;
    else disconnected += 1;
  }
  return {
    connected,
    disconnected,
    totalTracked: connectedClients.size,
    totalEvents: recentLogs.length,
    logs: recentLogs.slice(0, 100),
    clients: Array.from(connectedClients.values()),
  };
}

module.exports = {
  setupSocketHandlers,
  broadcastLog: (level, message, meta) => broadcastLog(level, message, meta),
  getAdminRuntimeState,
};