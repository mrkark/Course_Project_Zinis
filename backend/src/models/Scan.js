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
    const { filename, fileHash, fileSize, fileType, mimeType, riskScore, analysisDetails } = scanData;
    
    // Calculate verdict from risk score
    let verdict = 'CLEAN';
    if (riskScore >= 80) verdict = 'CRITICAL';
    else if (riskScore >= 50) verdict = 'HIGH';
    else if (riskScore >= 30) verdict = 'MEDIUM';
    else if (riskScore > 0) verdict = 'LOW';
    
    const query = `
      INSERT INTO dbo.Scans (filename, file_hash, file_size, file_type, mime_type, verdict, risk_score, analysis_details)
      VALUES (@filename, @fileHash, @fileSize, @fileType, @mimeType, @verdict, @riskScore, @analysisDetails);
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
      analysisDetails: JSON.stringify(analysisDetails)
    };
    
    const result = await db.query(query, params);
    const scanId = result.recordset[0]?.scanId;
    if (!scanId) throw new Error('Failed to create scan record');
    return this.findById(Number(scanId));
  }

  /**
   * Get all scans with optional filters using direct query
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} { scans, pagination }
   */
  static async findAll(filters = {}) {
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    
    console.log('Scan.findAll called with filters:', filters);
    try {
      // Build WHERE clause
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
      
      const whereClause = whereConditions.join(' AND ');
      
      // Get total count
      const countQuery = `SELECT COUNT(*) as totalCount FROM dbo.Scans WHERE ${whereClause}`;
      const countResult = await db.query(countQuery, params);
      const totalCount = countResult.recordset[0]?.totalCount || 0;
      
      // Get paginated data
      const dataQuery = `
        SELECT id, filename, file_hash, file_size, file_type, mime_type, verdict, risk_score, analysis_details, created_at, updated_at
        FROM dbo.Scans
        WHERE ${whereClause}
        ORDER BY created_at DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `;
      const dataResult = await db.query(dataQuery, params);
      
      console.log('Scan.findAll result:', { count: dataResult.recordset.length, total: totalCount });
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
    
    // Use the overall counters for the KPI cards. Recent activity is grouped
    // by date + verdict and must not be used as the all-time total.
    const byVerdict = {
      CRITICAL: Number(overall.critical_count) || 0,
      HIGH: Number(overall.high_count) || 0,
      MEDIUM: Number(overall.medium_count) || 0,
      LOW: Number(overall.low_count) || 0,
      CLEAN: Number(overall.clean_count) || 0,
    };
    
    return {
      total: Number(overall.total_scans) || 0,
      byVerdict,
      averageRiskScore: Number(overall.avg_risk_score) || 0,
      maxRiskScore: Number(overall.max_risk_score) || 0,
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