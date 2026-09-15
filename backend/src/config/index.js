// backend/src/config/index.js
require('dotenv').config();
const path = require('path');

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
    dir: path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    allowedExtensions: (process.env.ALLOWED_EXTENSIONS || '.exe,.pdf,.js,.txt,.docx,.zip,.apk,.dll').split(',').map(v => v.trim().toLowerCase()).filter(Boolean),
    allowedMimeTypes: (process.env.ALLOWED_MIME_TYPES || 'application/octet-stream,application/pdf,application/javascript,text/javascript,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip,application/vnd.android.package-archive,application/x-msdownload,application/x-msdos-program,application/x-dosexec').split(','),
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

  auth: {
    jwtSecret: process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    cookieMaxAgeMs: parseInt(process.env.JWT_COOKIE_MAX_AGE_MS) || 7 * 24 * 60 * 60 * 1000,
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 10,
    // Секретный ключ для одноразового создания первого администратора через
    // POST /api/auth/bootstrap-admin (см. backend/README.md).
    bootstrapAdminKey: process.env.BOOTSTRAP_ADMIN_KEY || '',
  },

  sandbox: {
    // Только инертные текстовые файлы-образцы для клиентской песочницы.
    // Никогда не исполняются на сервере.
    samplesDir: path.resolve(__dirname, '..', '..', 'sandbox_samples'),
    maxSampleSize: 64 * 1024, // 64KB достаточно для текстового образца
  },
};