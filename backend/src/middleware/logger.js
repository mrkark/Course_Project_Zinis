// backend/src/middleware/logger.js
const config = require('../config');

/**
 * Request logging middleware
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  const { method, url, ip, headers } = req;
  
  // Логируем входящий запрос
  const requestMessage = `${method} ${url} - ${ip} - ${headers['user-agent']?.substring(0, 50) || 'Unknown'}`;
  console.log(`📥 ${requestMessage}`);
  if (typeof global.adminLog === 'function' && !url.startsWith('/api/admin')) {
    global.adminLog('info', requestMessage, { method, url, ip });
  }
  
  // Перехватываем завершение ответа
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    const statusIcon = statusCode >= 400 ? '❌' : statusCode >= 300 ? '⚠️' : '✅';
    
    const responseMessage = `${method} ${url} - ${statusCode} - ${duration}ms`;
    console.log(`${statusIcon} ${responseMessage}`);
    if (typeof global.adminLog === 'function' && !url.startsWith('/api/admin')) {
      global.adminLog(statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warning' : 'success', responseMessage, { statusCode, duration });
    }
  });
  
  next();
}

/**
 * Socket.IO connection logger
 */
function socketLogger(socket, next) {
  const { id, handshake } = socket;
  console.log(`🔌 Socket connected: ${id} from ${handshake.address}`);
  
  socket.on('disconnect', (reason) => {
    console.log(`🔌 Socket disconnected: ${id} - ${reason}`);
  });
  
  next();
}

module.exports = {
  requestLogger,
  socketLogger,
};