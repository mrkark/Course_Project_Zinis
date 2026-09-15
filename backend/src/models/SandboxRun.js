// backend/src/models/SandboxRun.js
const db = require('../config/database');

class SandboxRun {
  static async create({ userId, sampleName, ruleCode, status, result, durationMs }) {
    const insertResult = await db.query(
      `INSERT INTO SandboxRuns (user_id, sample_name, rule_code, status, result, duration_ms)
       OUTPUT INSERTED.*
       VALUES (@userId, @sampleName, @ruleCode, @status, @result, @durationMs)`,
      {
        userId,
        sampleName,
        ruleCode,
        status,
        result: JSON.stringify(result || {}),
        durationMs: durationMs || 0,
      }
    );
    return SandboxRun._format(insertResult.recordset[0]);
  }

  static async listForUser(userId, limit = 50) {
    const result = await db.query(
      `SELECT TOP (@limit) * FROM SandboxRuns WHERE user_id = @userId ORDER BY created_at DESC`,
      { userId, limit }
    );
    return result.recordset.map(SandboxRun._format);
  }

  static _format(row) {
    if (!row) return null;
    let result = {};
    try { result = JSON.parse(row.result || '{}'); } catch (_) {}
    return {
      id: row.id,
      sampleName: row.sample_name,
      ruleCode: row.rule_code,
      status: row.status,
      result,
      durationMs: row.duration_ms,
      createdAt: row.created_at,
    };
  }
}

module.exports = SandboxRun;
