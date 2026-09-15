// backend/src/models/Scan.js
const db = require('../config/database');

/**
 * Scan model for database operations - uses stored procedures
 */
class Scan {
  /**
   * Create a new scan record using direct query
   * @param {Object} scanData - Scan data
   * @returns {Promise<Object>} Created scan
   */
  static async create(scanData) {
    const { filename, fileHash, fileSize, fileType, mimeType, riskScore, analysisDetails, userId } = scanData;

    // Вердикт приходит уже посчитанным из Detector (там же учитываются пороги из config),
    // но на случай прямого вызова модели оставляем пересчёт как fallback.
    const cfg = require('../config');
    const { critical, high, medium } = cfg.analysis.riskScores;
    let verdict = scanData.verdict;
    if (!verdict) {
      verdict = 'CLEAN';
      if (riskScore >= critical) verdict = 'CRITICAL';
      else if (riskScore >= high) verdict = 'HIGH';
      else if (riskScore >= medium) verdict = 'MEDIUM';
      else if (riskScore > 0) verdict = 'LOW';
    }

    const query = `
      INSERT INTO dbo.Scans (filename, file_hash, file_size, file_type, mime_type, verdict, risk_score, analysis_details, user_id)
      VALUES (@filename, @fileHash, @fileSize, @fileType, @mimeType, @verdict, @riskScore, @analysisDetails, @userId);
      SELECT SCOPE_IDENTITY() as scanId;
    `;

    const params = {
      filename,
      fileHash,
      fileSize,
      fileType,
      mimeType,
      verdict,
      riskScore,
      analysisDetails: JSON.stringify(analysisDetails),
      userId: userId || null,
    };

    const result = await db.query(query, params);
    const scanId = result.recordset[0]?.scanId;
    if (!scanId) throw new Error('Failed to create scan record');
    return this.findById(Number(scanId));
  }

  /**
   * Get all scans with optional filters using direct query
   * @param {Object} filters - Filter options (verdict, dateFrom, dateTo, search, userId, limit, offset)
   * @returns {Promise<Object>} { scans, pagination }
   */
  static async findAll(filters = {}) {
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    try {
      const whereConditions = ['1=1'];
      const params = { limit, offset };
      let paramIndex = 0;

      if (filters.verdict) {
        paramIndex++;
        whereConditions.push(`verdict = @verdict${paramIndex}`);
        params[`verdict${paramIndex}`] = filters.verdict;
      }

      if (filters.dateFrom) {
        paramIndex++;
        whereConditions.push(`created_at >= @dateFrom${paramIndex}`);
        params[`dateFrom${paramIndex}`] = filters.dateFrom;
      }

      if (filters.dateTo) {
        paramIndex++;
        whereConditions.push(`created_at <= @dateTo${paramIndex}`);
        params[`dateTo${paramIndex}`] = filters.dateTo;
      }

      if (filters.search) {
        paramIndex++;
        whereConditions.push(`(filename LIKE @search${paramIndex} OR file_hash LIKE @search${paramIndex})`);
        params[`search${paramIndex}`] = `%${filters.search}%`;
      }

      // Обычный пользователь видит только свои сканы; когда userId не передан
      // (запрос от имени администратора) — возвращаются все сканы.
      if (filters.userId) {
        paramIndex++;
        whereConditions.push(`user_id = @userId${paramIndex}`);
        params[`userId${paramIndex}`] = filters.userId;
      }

      const whereClause = whereConditions.join(' AND ');

      const countQuery = `SELECT COUNT(*) as totalCount FROM dbo.Scans WHERE ${whereClause}`;
      const countResult = await db.query(countQuery, params);
      const totalCount = countResult.recordset[0]?.totalCount || 0;

      const dataQuery = `
        SELECT id, filename, file_hash, file_size, file_type, mime_type, verdict, risk_score, analysis_details, user_id, created_at, updated_at
        FROM dbo.Scans
        WHERE ${whereClause}
        ORDER BY created_at DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `;
      const dataResult = await db.query(dataQuery, params);

      return {
        scans: dataResult.recordset.map(this.formatScan),
        pagination: {
          limit,
          offset,
          total: totalCount
        }
      };
    } catch (error) {
      console.error('Scan.findAll error:', error);
      throw error;
    }
  }

  /**
   * Get scan by ID with events using stored procedure
   * @param {number} id - Scan ID
   * @returns {Promise<Object|null>} Scan with events or null
   */
  static async findById(id) {
    const result = await db.executeProcedure('sp_GetScanById', { scanId: id });

    if (!result.recordsets[0] || result.recordsets[0].length === 0) {
      return null;
    }

    const scan = this.formatScan(result.recordsets[0][0]);
    scan.events = (result.recordsets[1] || []).map(this.formatEvent);

    return scan;
  }

  /**
   * Get scan by file hash using stored procedure
   * @param {string} fileHash - File SHA256 hash
   * @returns {Promise<Object|null>} Scan or null
   */
  static async findByHash(fileHash) {
    const result = await db.executeProcedure('sp_GetScanByHash', { fileHash });
    return result.recordset[0] ? this.formatScan(result.recordset[0]) : null;
  }

  /**
   * Delete scan by ID using stored procedure
   * @param {number} id - Scan ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id) {
    const result = await db.executeProcedure('sp_DeleteScan', {
      scanId: id,
      rowsAffected: { type: db.sql.Int, output: true }
    });

    return result.output.rowsAffected > 0;
  }

  /**
   * Get scan statistics. Uses plain parameterised queries (rather than the
   * SQL stored procs) specifically so the 30-day activity series can be
   * pivoted by verdict and zero-filled for days with no scans in JS, and so
   * the same code path can be scoped to a single user (userId) or return
   * global stats for admins (userId omitted).
   * @param {number|null} userId
   * @returns {Promise<Object>} Statistics
   */
  static async getStats(userId = null) {
    const params = { userId: userId || null };

    const overallResult = await db.query(
      `SELECT
         COUNT(*) AS total_scans,
         SUM(CASE WHEN verdict = 'CRITICAL' THEN 1 ELSE 0 END) AS critical_count,
         SUM(CASE WHEN verdict = 'HIGH' THEN 1 ELSE 0 END) AS high_count,
         SUM(CASE WHEN verdict = 'MEDIUM' THEN 1 ELSE 0 END) AS medium_count,
         SUM(CASE WHEN verdict = 'LOW' THEN 1 ELSE 0 END) AS low_count,
         SUM(CASE WHEN verdict = 'CLEAN' THEN 1 ELSE 0 END) AS clean_count,
         AVG(CAST(risk_score AS FLOAT)) AS avg_risk_score,
         MAX(risk_score) AS max_risk_score
       FROM dbo.Scans
       WHERE (@userId IS NULL OR user_id = @userId)`,
      params
    );

    const recentResult = await db.query(
      `SELECT CAST(created_at AS DATE) AS scan_date, verdict, COUNT(*) AS scan_count
       FROM dbo.Scans
       WHERE created_at >= DATEADD(day, -29, CAST(SYSDATETIME() AS DATE))
         AND (@userId IS NULL OR user_id = @userId)
       GROUP BY CAST(created_at AS DATE), verdict`,
      params
    );

    const distributionResult = await db.query(
      `SELECT
         CASE
           WHEN risk_score >= 80 THEN 'CRITICAL'
           WHEN risk_score >= 50 THEN 'HIGH'
           WHEN risk_score >= 30 THEN 'MEDIUM'
           ELSE 'LOW/CLEAN'
         END AS score_range,
         COUNT(*) AS scan_count
       FROM dbo.Scans
       WHERE (@userId IS NULL OR user_id = @userId)
       GROUP BY
         CASE
           WHEN risk_score >= 80 THEN 'CRITICAL'
           WHEN risk_score >= 50 THEN 'HIGH'
           WHEN risk_score >= 30 THEN 'MEDIUM'
           ELSE 'LOW/CLEAN'
         END`,
      params
    );

    const overall = overallResult.recordset[0] || {};
    const byVerdict = {
      CRITICAL: Number(overall.critical_count) || 0,
      HIGH: Number(overall.high_count) || 0,
      MEDIUM: Number(overall.medium_count) || 0,
      LOW: Number(overall.low_count) || 0,
      CLEAN: Number(overall.clean_count) || 0,
    };

    // Пивот "дата+вердикт -> счётчик" в карту для быстрого поиска.
    const byDateVerdict = new Map();
    for (const row of recentResult.recordset) {
      const dateKey = new Date(row.scan_date).toISOString().slice(0, 10);
      if (!byDateVerdict.has(dateKey)) byDateVerdict.set(dateKey, {});
      byDateVerdict.get(dateKey)[row.verdict] = Number(row.scan_count) || 0;
    }

    // Строим ровно 30 точек (последние 30 дней, включая сегодня), заполняя
    // отсутствующие дни нулями, чтобы линия на графике не обрывалась.
    const recentActivity = [];
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - i);
      const dateKey = d.toISOString().slice(0, 10);
      const counts = byDateVerdict.get(dateKey) || {};
      recentActivity.push({
        date: dateKey,
        clean: counts.CLEAN || 0,
        low: counts.LOW || 0,
        medium: counts.MEDIUM || 0,
        high: counts.HIGH || 0,
        critical: counts.CRITICAL || 0,
        total: Object.values(counts).reduce((sum, v) => sum + v, 0),
      });
    }

    return {
      total: Number(overall.total_scans) || 0,
      byVerdict,
      averageRiskScore: Number(overall.avg_risk_score) || 0,
      maxRiskScore: Number(overall.max_risk_score) || 0,
      recentActivity,
      scoreDistribution: distributionResult.recordset.map((d) => ({
        range: d.score_range,
        count: d.scan_count,
      })),
    };
  }

  /**
   * Get verdict counts for chart
   * @returns {Promise<Array>} Verdict counts
   */
  static async getVerdictCounts() {
    const result = await db.executeProcedure('sp_GetVerdictCounts');
    return result.recordset;
  }

  /**
   * Clean old scans (retention policy)
   * @param {number} retentionDays - Days to retain
   * @returns {Promise<number>} Deleted count
   */
  static async cleanOld(retentionDays = 90) {
    const result = await db.executeProcedure('sp_CleanOldScans', {
      retentionDays,
      deletedCount: { type: db.sql.Int, output: true }
    });
    return result.output.deletedCount;
  }

  /**
   * Format scan record from database
   * @param {Object} row - Database row
   * @returns {Object} Formatted scan
   */
  static formatScan(row) {
    return {
      id: row.id,
      filename: row.filename,
      fileHash: row.file_hash,
      fileSize: row.file_size,
      fileType: row.file_type,
      mimeType: row.mime_type,
      verdict: row.verdict,
      riskScore: row.risk_score,
      analysisDetails: row.analysis_details ? JSON.parse(row.analysis_details) : null,
      userId: row.user_id ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Format event record from database
   * @param {Object} row - Database row
   * @returns {Object} Formatted event
   */
  static formatEvent(row) {
    return {
      id: row.id,
      scanId: row.scan_id,
      eventType: row.event_type,
      severity: row.severity,
      message: row.message,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      timestamp: row.timestamp,
    };
  }
}

module.exports = Scan;
