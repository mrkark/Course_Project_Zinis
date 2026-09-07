// backend/src/models/Scan.js
const db = require('../config/database');

/**
 * Scan model for database operations - uses stored procedures
 */
class Scan {
  /**
   * Create a new scan record using stored procedure
   * @param {Object} scanData - Scan data
   * @returns {Promise<Object>} Created scan
   */
  static async create(scanData) {
    const { filename, fileHash, fileSize, fileType, mimeType, riskScore, analysisDetails } = scanData;
    
    const result = await db.executeProcedure('sp_CreateScan', {
      filename,
      fileHash,
      fileSize,
      fileType,
      mimeType,
      riskScore,
      analysisDetails: JSON.stringify(analysisDetails),
      scanId: { type: db.sql.Int, output: true }
    });
    
    const scanId = result.output.scanId;
    return this.findById(scanId);
  }

  /**
   * Get all scans with optional filters using stored procedure
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} { scans, pagination }
   */
  static async findAll(filters = {}) {
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    
    const result = await db.executeProcedure('sp_GetScans', {
      verdict: filters.verdict || null,
      dateFrom: filters.dateFrom || null,
      dateTo: filters.dateTo || null,
      search: filters.search || null,
      limit,
      offset,
      totalCount: { type: db.sql.Int, output: true }
    });
    
    return {
      scans: result.recordset.map(this.formatScan),
      pagination: {
        limit,
        offset,
        total: result.output.totalCount
      }
    };
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
   * Get scan statistics using stored procedure
   * @returns {Promise<Object>} Statistics
   */
  static async getStats() {
    const result = await db.executeProcedure('sp_GetDashboardStats');
    
    // Result contains multiple recordsets:
    // 0: overall stats (fn_GetScanStats)
    // 1: recent activity (fn_GetRecentActivity)
    // 2: score distribution (fn_GetScoreDistribution)
    
    const overall = result.recordsets[0]?.[0] || {};
    const recent = result.recordsets[1] || [];
    const distribution = result.recordsets[2] || [];
    
    // Convert recent activity to by-verdict format for compatibility
    const byVerdict = {};
    for (const row of recent) {
      if (!byVerdict[row.verdict]) byVerdict[row.verdict] = 0;
      byVerdict[row.verdict] += row.scan_count;
    }
    
    return {
      total: overall.total_scans || 0,
      byVerdict,
      recentActivity: recent.map(r => ({
        date: r.scan_date,
        count: r.scan_count,
        avgScore: r.avg_risk_score
      })),
      scoreDistribution: distribution.map(d => ({
        range: d.score_range,
        count: d.scan_count
      }))
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