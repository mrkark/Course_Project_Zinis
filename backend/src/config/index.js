// backend/src/config/index.js
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  db: {
    server: process.env.DB_SERVER || 'localhost',
    port: parseInt(process.env.DB_PORT) || 1433,
    database: process.env.DB_DATABASE || 'MalwareSandbox',
    user: process.env.DB_USER || 'mrkark',
    password: process.env.DB_PASSWORD || 'mrkark9000',
    options: {
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
      enableArithAbort: true,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  },

  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    allowedExtensions: (process.env.ALLOWED_EXTENSIONS || '.exe,.pdf,.js,.txt,.docx,.zip,.apk').split(','),
    allowedMimeTypes: (process.env.ALLOWED_MIME_TYPES || 'application/octet-stream,application/pdf,application/javascript,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip,application/vnd.android.package-archive').split(','),
  },

  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:5173',
  },

  socket: {
    pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT) || 60000,
    pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL) || 25000,
  },

  analysis: {
    entropyThreshold: parseFloat(process.env.ENTROPY_THRESHOLD) || 7.0,
    riskScores: {
      critical: parseInt(process.env.RISK_SCORE_CRITICAL) || 80,
      high: parseInt(process.env.RISK_SCORE_HIGH) || 50,
      medium: parseInt(process.env.RISK_SCORE_MEDIUM) || 30,
    },
  },
};