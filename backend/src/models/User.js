// backend/src/models/User.js
const db = require('../config/database');

// Никогда не отдаём password_hash наружу.
function toPublic(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    isBlocked: !!row.is_blocked,
    createdAt: row.created_at,
  };
}

class User {
  static async create({ email, passwordHash, role = 'user' }) {
    const result = await db.query(
      `INSERT INTO Users (email, password_hash, role)
       OUTPUT INSERTED.*
       VALUES (@email, @passwordHash, @role)`,
      { email: email.toLowerCase().trim(), passwordHash, role }
    );
    return toPublic(result.recordset[0]);
  }

  // Возвращает "сырую" строку (с password_hash) — только для проверки пароля при логине.
  static async findByEmailRaw(email) {
    const result = await db.query(
      `SELECT * FROM Users WHERE email = @email`,
      { email: email.toLowerCase().trim() }
    );
    return result.recordset[0] || null;
  }

  static async findById(id) {
    const result = await db.query(`SELECT * FROM Users WHERE id = @id`, { id });
    return toPublic(result.recordset[0]);
  }

  static async emailExists(email) {
    const result = await db.query(
      `SELECT id FROM Users WHERE email = @email`,
      { email: email.toLowerCase().trim() }
    );
    return result.recordset.length > 0;
  }

  static async list() {
    const result = await db.query(
      `SELECT u.*,
              (SELECT COUNT(*) FROM Scans s WHERE s.user_id = u.id) AS scan_count
       FROM Users u
       ORDER BY u.created_at DESC`
    );
    return result.recordset.map((row) => ({ ...toPublic(row), scanCount: row.scan_count }));
  }

  static async setBlocked(id, isBlocked) {
    const result = await db.query(
      `UPDATE Users SET is_blocked = @isBlocked, updated_at = SYSDATETIME()
       OUTPUT INSERTED.*
       WHERE id = @id`,
      { id, isBlocked: isBlocked ? 1 : 0 }
    );
    return toPublic(result.recordset[0]);
  }

  static async delete(id) {
    const result = await db.query(`DELETE FROM Users WHERE id = @id`, { id });
    return result.rowsAffected[0] > 0;
  }

  static async countAdmins() {
    const result = await db.query(`SELECT COUNT(*) AS cnt FROM Users WHERE role = 'admin'`);
    return result.recordset[0].cnt;
  }
}

module.exports = User;
