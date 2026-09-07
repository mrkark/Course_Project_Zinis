// backend/src/models/Threat.js
const db = require('../config/database');

/**
 * Threat model for database operations - uses stored procedures
 */
class Threat {
  /**
   * Get all threats using stored procedure
   * @returns {Promise<Array>} List of threats
   */
  static async findAll() {
    const result = await db.executeProcedure('sp_GetAllThreats');
    return result.recordset.map(this.formatThreat);
  }

  /**
   * Get threat by type using function
   * @param {string} type - Threat type
   * @returns {Promise<Object|null>} Threat or null
   */
  static async findByType(type) {
    const result = await db.query('SELECT * FROM dbo.fn_GetThreatByType(@type)', { type });
    return result.recordset[0] ? this.formatThreat(result.recordset[0]) : null;
  }

  /**
   * Create or update threat using stored procedure
   * @param {Object} threatData - Threat data
   * @returns {Promise<Object>} Created/updated threat
   */
  static async upsert(threatData) {
    const { type, name, description, characteristics, scoreWeights, severity } = threatData;
    
    await db.executeProcedure('sp_UpsertThreat', {
      type,
      name,
      description,
      characteristics: JSON.stringify(characteristics),
      scoreWeights: JSON.stringify(scoreWeights),
      severity
    });
    
    return this.findByType(type);
  }

  /**
   * Get threat statistics using stored procedure
   * @returns {Promise<Array>} Threat stats by severity
   */
  static async getStats() {
    const result = await db.executeProcedure('sp_GetThreatStats');
    return result.recordset;
  }

  /**
   * Format threat record from database
   * @param {Object} row - Database row
   * @returns {Object} Formatted threat
   */
  static formatThreat(row) {
    return {
      id: row.id,
      type: row.type,
      name: row.name,
      description: row.description,
      characteristics: row.characteristics ? JSON.parse(row.characteristics) : [],
      scoreWeights: row.score_weights ? JSON.parse(row.score_weights) : {},
      severity: row.severity,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

module.exports = Threat;