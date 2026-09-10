// backend/src/config/database.js
const sql = require('mssql');
const config = require('./index');

let pool = null;
let isPoolClosing = false;

/**
 * Get or create database connection pool
 * @returns {Promise<sql.ConnectionPool>}
 */
async function getPool() {
  if (pool && pool.connected && !isPoolClosing) {
    return pool;
  }

  if (pool) {
    try { await pool.close(); } catch {}
    pool = null;
  }

  try {
    pool = new sql.ConnectionPool(config.db);
    await pool.connect();
    console.log('✅ Connected to MSSQL database');
    
    pool.on('error', (err) => {
      console.error('❌ Database pool error:', err.message);
      if (!isPoolClosing) {
        pool = null; // Will recreate on next request
      }
    });
    
    return pool;
  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message);
    pool = null;
    throw error;
  }
}

/**
 * Execute a query with parameters
 * @param {string} query - SQL query
 * @param {Object} params - Query parameters
 * @returns {Promise<sql.IResult<any>>}
 */
async function query(query, params = {}) {
  const pool = await getPool();
  const request = pool.request();
  
  Object.entries(params).forEach(([key, value]) => {
    request.input(key, value);
  });
  
  return request.query(query);
}

/**
 * Execute a stored procedure with support for output parameters
 * Uses RPC (request.execute) with all parameters declared
 * @param {string} procedureName - Stored procedure name
 * @param {Object} params - Procedure parameters (input and output)
 *   Input: { key: value }
 *   Output: { key: { type: sql.Type, output: true } }
 * @returns {Promise<{ recordset: Array, recordsets: Array, output: Object }>}
 */
async function executeProcedure(procedureName, params = {}) {
  const pool = await getPool();
  const request = pool.request();
  
  // Separate input and output parameters
  const inputParams = {};
  const outputParamKeys = [];
  
  Object.entries(params).forEach(([key, value]) => {
    if (value && typeof value === 'object' && value.output === true) {
      outputParamKeys.push(key);
    } else {
      inputParams[key] = value;
    }
  });
  
  try {
    // For sp_GetScans, declare all possible parameters with defaults
    if (procedureName === 'sp_GetScans') {
      request.input('verdict', inputParams.verdict || null);
      request.input('dateFrom', inputParams.dateFrom || null);
      request.input('dateTo', inputParams.dateTo || null);
      request.input('search', inputParams.search || null);
      request.input('limit', inputParams.limit || 50);
      request.input('offset', inputParams.offset || 0);
    } else {
      // Set input parameters normally
      Object.entries(inputParams).forEach(([key, value]) => {
        request.input(key, value);
      });
    }
    
    // Execute stored procedure using RPC (no output params declared - they're in result sets)
    const result = await request.execute(procedureName);
    
    // Extract output parameters from the last recordset
    const output = {};
    if (result.recordsets && result.recordsets.length > 0 && outputParamKeys.length > 0) {
      const lastRecordset = result.recordsets[result.recordsets.length - 1];
      if (lastRecordset && lastRecordset.length > 0) {
        const outputRow = lastRecordset[0];
        outputParamKeys.forEach(key => {
          output[key] = outputRow[key];
        });
      }
    }
    
    // The actual data is in the recordset before the last one (or first if only one)
    const dataRecordset = result.recordsets.length > 1 ? result.recordsets[result.recordsets.length - 2] : result.recordset;
    
    return {
      recordset: dataRecordset || [],
      recordsets: result.recordsets || [dataRecordset || []],
      output,
      rowsAffected: result.rowsAffected
    };
  } catch (error) {
    console.error('❌ Database error in ' + procedureName + ':', error.message || error);
    console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    throw error;
  }
}

/**
 * Execute a stored procedure with multiple recordsets (for dashboard stats)
 * @param {string} procedureName - Stored procedure name
 * @param {Object} params - Procedure parameters
 * @returns {Promise<{ recordsets: Array, output: Object }>}
 */
async function executeProcedureMulti(procedureName, params = {}) {
  const pool = await getPool();
  const request = pool.request();
  
  Object.entries(params).forEach(([key, value]) => {
    request.input(key, value);
  });
  
  const result = await request.execute(procedureName);
  
  return {
    recordsets: result.recordsets,
    output: result.output,
    rowsAffected: result.rowsAffected
  };
}

/**
 * Close database connection pool
 */
async function closePool() {
  isPoolClosing = true;
  if (pool) {
    await pool.close();
    pool = null;
    console.log('🔌 Database connection closed');
  }
}

module.exports = {
  getPool,
  query,
  executeProcedure,
  executeProcedureMulti,
  closePool,
  sql,
};