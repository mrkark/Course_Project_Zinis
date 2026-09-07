// backend/src/routes/threats.js
const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const Threat = require('../models/Threat');

const router = express.Router();

/**
 * GET /api/threats
 * Get all threats from library
 */
router.get('/', asyncHandler(async (req, res) => {
  const threats = await Threat.findAll();
  
  res.json({
    success: true,
    data: threats,
  });
}));

/**
 * GET /api/threats/:type
 * Get threat by type
 */
router.get('/:type', asyncHandler(async (req, res) => {
  const threat = await Threat.findByType(req.params.type);
  
  if (!threat) {
    return res.status(404).json({ success: false, error: 'Threat not found' });
  }
  
  res.json({
    success: true,
    data: threat,
  });
}));

module.exports = router;