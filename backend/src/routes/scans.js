// backend/src/routes/scans.js
const express = require('express');
const { validateScanId, validatePagination, validateDates } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Обычный пользователь видит только свои сканы; администратор — все.
function scopeToOwner(req) {
  return req.user.role === 'admin' ? null : req.user.id;
}

function scanBelongsToRequester(req, scan) {
  return req.user.role === 'admin' || scan.userId === req.user.id;
}

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
    userId: scopeToOwner(req),
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
 * Get dashboard statistics (scoped to the current user unless admin)
 */
router.get('/stats', asyncHandler(async (req, res) => {
  const scanService = req.app.get('scanService');
  const stats = await scanService.getStats(scopeToOwner(req));

  res.json({
    success: true,
    data: stats,
  });
}));

/**
 * GET /api/scans/export?format=json|csv
 * Экспорт списка сканирований (с теми же фильтрами, что и история).
 */
router.get('/export', validateDates, asyncHandler(async (req, res) => {
  const scanService = req.app.get('scanService');
  const format = (req.query.format || 'json').toLowerCase();

  const filters = {
    ...req.filters,
    verdict: req.query.verdict,
    search: req.query.search,
    limit: 5000,
    offset: 0,
    userId: scopeToOwner(req),
  };

  const { scans } = await scanService.getScans(filters);

  if (format === 'csv') {
    const header = ['id', 'filename', 'file_hash', 'file_size', 'file_type', 'verdict', 'risk_score', 'created_at'];
    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [header.join(',')];
    for (const s of scans) {
      lines.push([s.id, s.filename, s.fileHash, s.fileSize, s.fileType, s.verdict, s.riskScore, s.createdAt]
        .map(escape).join(','));
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="scans-report.csv"');
    return res.send('\uFEFF' + lines.join('\r\n'));
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="scans-report.json"');
  res.json({ success: true, exportedAt: new Date().toISOString(), count: scans.length, data: scans });
}));

/**
 * GET /api/scans/:id
 * Get scan details by ID
 */
router.get('/:id', validateScanId, asyncHandler(async (req, res) => {
  const scanService = req.app.get('scanService');
  const scan = await scanService.getScanById(req.scanId);

  if (!scan || !scanBelongsToRequester(req, scan)) {
    return res.status(404).json({ success: false, error: 'Scan not found' });
  }

  res.json({
    success: true,
    data: scan,
  });
}));

/**
 * GET /api/scans/:id/export?format=json|csv
 * Детальный отчёт по одному сканированию: найденные сигнатуры, offset'ы, категории.
 */
router.get('/:id/export', validateScanId, asyncHandler(async (req, res) => {
  const scanService = req.app.get('scanService');
  const scan = await scanService.getScanById(req.scanId);

  if (!scan || !scanBelongsToRequester(req, scan)) {
    return res.status(404).json({ success: false, error: 'Scan not found' });
  }

  const format = (req.query.format || 'json').toLowerCase();
  const findings = scan.analysisDetails?.static?.findings || [];

  if (format === 'csv') {
    const header = ['category', 'description', 'matches', 'offset', 'score'];
    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [header.join(',')];
    for (const f of findings) {
      lines.push([f.category, f.description, f.matches, f.offset, f.score].map(escape).join(','));
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="scan-${scan.id}-report.csv"`);
    return res.send('\uFEFF' + lines.join('\r\n'));
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="scan-${scan.id}-report.json"`);
  res.json({ success: true, data: scan });
}));

/**
 * DELETE /api/scans/:id
 * Delete a scan
 */
router.delete('/:id', validateScanId, asyncHandler(async (req, res) => {
  const scanService = req.app.get('scanService');
  const existing = await scanService.getScanById(req.scanId);

  if (!existing || !scanBelongsToRequester(req, existing)) {
    return res.status(404).json({ success: false, error: 'Scan not found' });
  }

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
