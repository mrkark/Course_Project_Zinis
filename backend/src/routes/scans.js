// backend/src/routes/scans.js
const express = require('express');
const { validateScanId, validatePagination, validateDates } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * GET /api/scans
 * Get list of scans with filters
 */
router.get('/', validatePagination, validateDates, asyncHandler(async (req, res) => {
  const scanService = req.app.get('scanService');
  
  const filters = {
    ...req.filters,
    verdict: req.query.verdict,
    search: req.query.search,
    limit: req.pagination.limit,
    offset: req.pagination.offset,
  };
  
  const result = await scanService.getScans(filters);
  
  res.json({
    success: true,
    data: result.scans,
    pagination: result.pagination,
  });
}));

/**
 * GET /api/scans/stats
 * Get dashboard statistics
 */
router.get('/stats', asyncHandler(async (req, res) => {
  const scanService = req.app.get('scanService');
  const stats = await scanService.getStats();
  
  res.json({
    success: true,
    data: stats,
  });
}));

/**
 * GET /api/scans/:id
 * Get scan details by ID
 */
router.get('/:id', validateScanId, asyncHandler(async (req, res) => {
  const scanService = req.app.get('scanService');
  const scan = await scanService.getScanById(req.scanId);
  
  if (!scan) {
    return res.status(404).json({ success: false, error: 'Scan not found' });
  }
  
  res.json({
    success: true,
    data: scan,
  });
}));

/**
 * DELETE /api/scans/:id
 * Delete a scan
 */
router.delete('/:id', validateScanId, asyncHandler(async (req, res) => {
  const scanService = req.app.get('scanService');
  const deleted = await scanService.deleteScan(req.scanId);
  
  if (!deleted) {
    return res.status(404).json({ success: false, error: 'Scan not found' });
  }
  
  res.json({
    success: true,
    message: 'Scan deleted successfully',
  });
}));

module.exports = router;