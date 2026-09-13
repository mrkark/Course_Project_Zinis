const express = require('express');
const db = require('../config/database');
const { hashPassword, verifyPassword } = require('../auth/password');
const { createSession, getSession, destroySession } = require('../middleware/auth');
const router = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) return res.status(400).json({ success:false, error:'Введите корректный email и пароль не короче 8 символов' });
    const pool = await db.getPool();
    const exists = await pool.request().input('email', email).query('SELECT id FROM Users WHERE email=@email');
    if (exists.recordset.length) return res.status(409).json({ success:false, error:'Пользователь уже существует' });
    const passwordHash = await hashPassword(password);
    const result = await pool.request().input('email', email).input('password_hash', passwordHash).query("INSERT INTO Users(email,password_hash) OUTPUT INSERTED.id, INSERTED.email, INSERTED.role, INSERTED.is_blocked VALUES(@email,@password_hash)");
    const user = result.recordset[0];
    const token = createSession(user);
    res.status(201).json({ success:true, data:{ user, token } });
  } catch (e) { next(e); }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const pool = await db.getPool();
    const result = await pool.request().input('email', email).query('SELECT id,email,password_hash,role,is_blocked FROM Users WHERE email=@email');
    const user = result.recordset[0];
    if (!user || user.is_blocked || !(await verifyPassword(password, user.password_hash))) return res.status(401).json({ success:false, error:'Неверный email или пароль' });
    delete user.password_hash;
    const token = createSession(user);
    res.json({ success:true, data:{ user, token } });
  } catch (e) { next(e); }
});

router.get('/me', (req,res) => { const s=getSession(req); res.json({ success:true, data:s?.user || null }); });
router.post('/logout', (req,res) => { const token=req.headers.authorization?.replace(/^Bearer /,'') || req.headers['x-session-token']; if(token) destroySession(token); res.json({success:true}); });
module.exports = router;
