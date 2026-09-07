// backend/src/socket/handlers.js
const ScanEvent = require('../models/ScanEvent');

/**
 * Socket.IO event handlers
 */
function setupSocketHandlers(io, scanService) {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);
    
    // Присоединение к комнате сканирования
    socket.on('scan:join', (scanId) => {
      const room = `scan:${scanId}`;
      socket.join(room);
      console.log(`📥 Socket ${socket.id} joined room ${room}`);
      
      // Отправляем текущее состояние если сканирование активно
      socket.emit('scan:joined', { scanId, room });
    });
    
    // Покидание комнаты сканирования
    socket.on('scan:leave', (scanId) => {
      const room = `scan:${scanId}`;
      socket.leave(room);
      console.log(`📤 Socket ${socket.id} left room ${room}`);
    });
    
    // Запрос истории событий для сканирования
    socket.on('scan:events:request', async (scanId) => {
      try {
        const events = await ScanEvent.findByScanId(scanId);
        socket.emit('scan:events:response', { scanId, events });
      } catch (error) {
        console.error('Failed to fetch scan events:', error);
        socket.emit('scan:events:error', { scanId, error: error.message });
      }
    });
    
    // Подписка на глобальные алерты
    socket.on('alerts:subscribe', () => {
      socket.join('alerts:global');
      socket.emit('alerts:subscribed', { success: true });
    });
    
    socket.on('alerts:unsubscribe', () => {
      socket.leave('alerts:global');
    });
    
    // Запрос статистики дашборда
    socket.on('dashboard:stats:request', async () => {
      try {
        const stats = await scanService.getStats();
        socket.emit('dashboard:stats:response', { stats });
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
        socket.emit('dashboard:stats:error', { error: error.message });
      }
    });
    
    // Heartbeat для поддержания соединения
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });
    
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Client disconnected: ${socket.id} - ${reason}`);
    });
  });
  
  // Периодическая отправка статистики всем подключенным клиентам
  setInterval(async () => {
    try {
      const stats = await scanService.getStats();
      io.emit('dashboard:stats:update', { stats, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error('Failed to emit periodic stats:', error);
    }
  }, 30000); // Каждые 30 секунд
}

module.exports = { setupSocketHandlers };