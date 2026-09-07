// backend/src/services/scanService.js
const fs = require('fs').promises;
const path = require('path');
const fileAnalyzer = require('./fileAnalyzer');
const BehavioralEmulator = require('./behavioralEmulator');
const Detector = require('./detector');
const Scan = require('../models/Scan');
const ScanEvent = require('../models/ScanEvent');
const config = require('../config');

/**
 * Scan Service - orchestrates the complete scanning pipeline
 */
class ScanService {
  constructor(io) {
    this.io = io;
    this.emulator = new BehavioralEmulator(io);
    this.detector = new Detector(io);
  }

  /**
   * Process a file through the complete scanning pipeline
   * @param {Object} file - Multer file object
   * @returns {Promise<Object>} Complete scan result
   */
  async processFile(file) {
    const scanId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // 1. Static Analysis
      console.log(`🔍 [${scanId}] Starting static analysis...`);
      this.emitProgress(scanId, 'static_analysis', 10, 'Analyzing file content...');
      
      const staticResults = await fileAnalyzer.analyze(
        file.path,
        file.originalname,
        file.mimetype
      );
      
      this.emitProgress(scanId, 'static_analysis', 40, 'Static analysis complete');
      
      // 2. Static Detection Evaluation
      const staticDetection = this.detector.evaluateStatic(staticResults);
      
      // 3. Start Behavioral Emulation
      console.log(`🎭 [${scanId}] Starting behavioral emulation...`);
      this.emitProgress(scanId, 'behavioral_emulation', 50, 'Starting behavioral emulation...');
      
      const emulationInfo = await this.emulator.startEmulation(scanId, staticResults);
      
      // Ждем завершения эмуляции (в реальности это асинхронно через сокеты)
      // Для API возвращаем сразу, а эмуляция идет в фоне
      
      // 4. Создаем предварительный результат сканирования
      const preliminaryResult = {
        scanId,
        fileInfo: staticResults.fileInfo,
        static: staticDetection,
        emulation: emulationInfo,
        status: 'emulating',
        message: 'Behavioral emulation in progress. Connect via WebSocket for real-time events.',
      };
      
      return preliminaryResult;
      
    } catch (error) {
      console.error(`❌ [${scanId}] Scan failed:`, error);
      throw error;
    }
  }

  /**
   * Complete scan after behavioral emulation finishes
   * @param {string} scanId - Scan ID
   * @param {Object} staticResults - Static analysis results
   * @param {Object} staticDetection - Static detection results
   * @param {Array} behavioralEvents - Events from emulation
   * @param {string} malwareType - Detected malware type
   * @returns {Promise<Object>} Final scan result
   */
  async completeScan(scanId, staticResults, staticDetection, behavioralEvents, malwareType) {
    try {
      // Оценка поведенческого анализа
      const behavioralDetection = this.detector.evaluateBehavioral(behavioralEvents, malwareType);
      
      // Комбинированный результат
      const finalResult = this.detector.combineResults(staticDetection, behavioralDetection);
      
      // Подготовка деталей для сохранения в БД
      const analysisDetails = {
        static: {
          findings: staticResults.findings,
          fileInfo: staticResults.fileInfo,
          detection: staticDetection,
        },
        behavioral: {
          malwareType,
          events: behavioralEvents,
          detection: behavioralDetection,
        },
        combined: finalResult,
      };
      
      // Сохранение в базу данных
      const scanRecord = await Scan.create({
        filename: staticResults.fileInfo.name,
        fileHash: staticResults.fileInfo.sha256,
        fileSize: staticResults.fileInfo.size,
        fileType: staticResults.fileInfo.fileType,
        mimeType: staticResults.fileInfo.mimeType,
        verdict: finalResult.verdict,
        riskScore: finalResult.riskScore,
        analysisDetails,
      });
      
      // Уведомляем фронтенд о завершении
      this.io.to(`scan:${scanId}`).emit('scan:complete', {
        scanId: scanRecord.id,
        ...finalResult,
        message: 'Analysis complete',
      });
      
      console.log(`✅ [${scanId}] Scan complete: ${finalResult.verdict} (${finalResult.riskScore})`);
      
      return {
        scan: scanRecord,
        result: finalResult,
      };
      
    } catch (error) {
      console.error(`❌ [${scanId}] Failed to complete scan:`, error);
      this.io.to(`scan:${scanId}`).emit('scan:error', {
        scanId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get scan history with filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Paginated scans
   */
  async getScans(filters = {}) {
    const scans = await Scan.findAll(filters);
    const total = await Scan.findAll({ ...filters, limit: 10000 }).then(s => s.length);
    
    return {
      scans,
      pagination: {
        limit: filters.limit || 50,
        offset: filters.offset || 0,
        total,
      },
    };
  }

  /**
   * Get scan by ID
   * @param {number} id - Scan ID
   * @returns {Promise<Object|null>} Scan with events
   */
  async getScanById(id) {
    const scan = await Scan.findById(id);
    if (!scan) return null;
    
    const events = await ScanEvent.findByScanId(id);
    return { ...scan, events };
  }

  /**
   * Delete scan
   * @param {number} id - Scan ID
   * @returns {Promise<boolean>} Success
   */
  async deleteScan(id) {
    return Scan.delete(id);
  }

  /**
   * Get dashboard statistics
   * @returns {Promise<Object>} Statistics
   */
  async getStats() {
    return Scan.getStats();
  }

  /**
   * Emit progress update via Socket.IO
   * @param {string} scanId - Scan ID
   * @param {string} stage - Current stage
   * @param {number} progress - Progress percentage
   * @param {string} message - Status message
   */
  emitProgress(scanId, stage, progress, message) {
    this.io.to(`scan:${scanId}`).emit('scan:progress', {
      scanId,
      stage,
      progress,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Cleanup uploaded file
   * @param {string} filePath - File path
   */
  async cleanupFile(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn('Failed to cleanup file:', filePath, error.message);
    }
  }
}

module.exports = ScanService;