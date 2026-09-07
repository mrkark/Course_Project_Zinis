// backend/src/middleware/logger.js
const config = require('../config');

/**
 * Request logging middleware
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  const { method, url, ip, headers } = req;
  
  // Логируем входящий запрос
  console.log(`📥 ${method} ${url} - ${ip} - ${headers['user-agent']?.substring(0, 50)}`);
  
  // Перехватываем завершение ответа
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    const statusIcon = statusCode >= 400 ? '❌' : statusCode >= 300 ? '⚠️' : '✅';
    
    console.log(`${statusIcon} ${method} ${url} - ${statusCode} - ${duration}ms`);
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