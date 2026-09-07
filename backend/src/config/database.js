// backend/src/config/database.js
const sql = require('mssql');
const config = require('./index');

let pool = null;

/**
 * Get or create database connection pool
 * @returns {Promise<sql.ConnectionPool>}
 */
async function getPool() {
  if (pool && pool.connected) {
    return pool;
  }

  try {
    pool = new sql.ConnectionPool(config.db);
    await pool.connect();
    console.log('✅ Connected to MSSQL database');
    
    pool.on('error', (err) => {
      console.error('❌ Database pool error:', err);
      pool = null;
    });
    
    return pool;
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
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
 * @param {string} procedureName - Stored procedure name
 * @param {Object} params - Procedure parameters (input and output)
 *   Input: { key: value }
 *   Output: { key: { type: sql.Type, output: true } }
 * @returns {Promise<{ recordset: Array, recordsets: Array, output: Object }>}
 */
async function executeProcedure(procedureName, params = {}) {
  const pool = await getPool();
  const request = pool.request();
  
  const outputParams = {};
  
  Object.entries(params).forEach(([key, value]) => {
    if (value && typeof value === 'object' && value.output === true) {
      // Output parameter
      request.output(key, value.type);
      outputParams[key] = key;
    } else {
      // Input parameter
      request.input(key, value);
    }
  });
  
  const result = await request.execute(procedureName);
  
  // Extract output parameters
  const output = {};
  Object.keys(outputParams).forEach(key => {
    output[key] = result.output[key];
  });
  
  return {
    recordset: result.recordset,
    recordsets: result.recordsets,
    output,
    rowsAffected: result.rowsAffected
  };
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
    if (value && typeof value === 'object' && value.output === true) {
      request.output(key, value.type);
    } else {
      request.input(key, value);
    }
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