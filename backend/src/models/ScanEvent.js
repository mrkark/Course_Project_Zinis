// backend/src/models/ScanEvent.js
const db = require('../config/database');

/**
 * ScanEvent model for real-time emulation events - uses stored procedures
 */
class ScanEvent {
  /**
   * Create a new scan event
   * @param {Object} eventData - Event data
   * @returns {Promise<Object>} Created event
   */
  static async create(eventData) {
    const { scanId, eventType, severity, message, metadata } = eventData;
    
    const result = await db.query(`
      INSERT INTO ScanEvents (scan_id, event_type, severity, message, metadata)
      OUTPUT INSERTED.*
      VALUES (@scanId, @eventType, @severity, @message, @metadata)
    `, {
      scanId,
      eventType,
      severity,
      message,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });
    
    return this.formatEvent(result.recordset[0]);
  }

  /**
   * Bulk create scan events for performance during emulation
   * @param {number} scanId - Scan ID
   * @param {Array} events - Array of event objects
   * @returns {Promise<number>} Inserted count
   */
  static async bulkCreate(scanId, events) {
    if (!events || events.length === 0) return 0;
    
    const eventsJson = JSON.stringify(events.map(e => ({
      eventType: e.eventType,
      severity: e.severity,
      message: e.message,
      metadata: e.metadata,
      timestamp: e.timestamp || new Date().toISOString()
    })));
    
    await db.executeProcedure('sp_BulkInsertScanEvents', {
      scanId,
      events: eventsJson
    });
    
    return events.length;
  }

  /**
   * Get events for a scan using stored procedure
   * @param {number} scanId - Scan ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of events
   */
  static async findByScanId(scanId, filters = {}) {
    const result = await db.executeProcedure('sp_GetScanEvents', {
      scanId,
      severity: filters.severity || null,
      eventType: filters.eventType || null,
      limit: filters.limit || 1000
    });
    
    return result.recordset.map(this.formatEvent);
  }

  /**
   * Get event statistics for a scan using stored procedure
   * @param {number} scanId - Scan ID
   * @returns {Promise<Array>} Event statistics
   */
  static async getStats(scanId) {
    const result = await db.executeProcedure('sp_GetScanEventStats', { scanId });
    return result.recordset;
  }

  /**
   * Delete events for a scan (cascade on scan delete)
   * @param {number} scanId - Scan ID
   * @returns {Promise<number>} Deleted count
   */
  static async deleteByScanId(scanId) {
    const result = await db.query('DELETE FROM ScanEvents WHERE scan_id = @scanId', { scanId });
    return result.rowsAffected[0];
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

module.exports = ScanEvent;