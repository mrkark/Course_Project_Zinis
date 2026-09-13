const crypto = require('crypto');
const sessions = new Map();

function createSession(user) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { user, createdAt: Date.now() });
  return token;
}

function getSession(req) {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : req.headers['x-session-token'];
  return token ? sessions.get(token) : null;
}

function requireAuth(req, res, next) {
  const session = getSession(req);
  if (!session || session.user.is_blocked) return res.status(401).json({ success: false, error: 'Требуется вход' });
  req.user = session.user;
  next();
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ success: false, error: 'Недостаточно прав' });
  next();
}

function destroySession(token) { sessions.delete(token); }
module.exports = { createSession, getSession, requireAuth, requireAdmin, destroySession };
