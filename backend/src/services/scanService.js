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
    // Store behavioral events per temp scanId
    this.behavioralEventsStore = new Map();
  }

  /**
   * Process multiple files through the complete scanning pipeline
   * @param {Array} files - Array of Multer file objects
   * @returns {Promise<Array>} Array of scan results
   */
  async processMultipleFiles(files, userId = null) {
    const results = [];
    for (const file of files) {
      const result = await this.processFile(file, userId);
      results.push({ filename: file.originalname, ...result });
    }
    return results;
  }

  /**
   * Process a file through the complete scanning pipeline
   * @param {Object} file - Multer file object
   * @returns {Promise<Object>} Scan result
   */
  async processFile(file, userId = null) {
    const tempScanId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const scanId = tempScanId;
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
      
      // Initialize event store for this scan
      this.behavioralEventsStore.set(scanId, []);
      
      // Capture behavioral events in memory. They are persisted only after
      // the final scan record exists, so ScanEvents uses the real Scans.id.
      const onBehaviorEvent = async (eventData) => {
        const events = this.behavioralEventsStore.get(scanId) || [];
        events.push({
          eventType: eventData.eventType,
          severity: eventData.severity,
          message: eventData.message,
          metadata: { stage: eventData.stage },
          timestamp: eventData.timestamp,
        });
        this.behavioralEventsStore.set(scanId, events);
      };

      // Start emulation and get malware type - returns a Promise that resolves when emulation completes
      const { malwareType, profileName, estimatedDuration, completionPromise } = await this.emulator.startEmulation(scanId, staticResults, onBehaviorEvent);
      const emulationInfo = { malwareType, profileName, estimatedDuration };
      
      // Wait for emulation to complete
      const emulationResult = await completionPromise;
      
      // Complete the scan with behavioral results and persist the final result.
      const storedEvents = this.behavioralEventsStore.get(scanId) || [];
      const completed = await this.completeScan(
        scanId,
        staticResults,
        staticDetection,
        storedEvents,
        malwareType,
        userId
      );

      // Return the persisted result so the upload page/dashboard always has
      // the same final data that was written to the database.
      return {
        scanId: completed.scan.id,
        tempScanId,
        fileInfo: staticResults.fileInfo,
        static: staticDetection,
        behavioral: completed.result.behavioral,
        emulation: emulationInfo,
        riskScore: completed.result.riskScore,
        verdict: completed.result.verdict,
        result: completed.result,
        scan: completed.scan,
        status: 'complete',
        message: 'Analysis complete. Result saved to database.',
      };
      
    } catch (error) {
      console.error(`❌ [${tempScanId}] Scan failed:`, error);
      this.behavioralEventsStore.delete(tempScanId);
      throw error;
    }
  }

  /**
   * Complete scan after behavioral emulation finishes
   * @param {string} scanId - Temp Scan ID
   * @param {Object} staticResults - Static analysis results
   * @param {Object} staticDetection - Static detection results
   * @param {Array} behavioralEvents - Events from emulation (deprecated, using store)
   * @param {string} malwareType - Detected malware type
   * @returns {Promise<Object>} Final scan result
   */
  async completeScan(scanId, staticResults, staticDetection, behavioralEvents, malwareType, userId = null) {
    try {
      // Get stored behavioral events
      const storedEvents = this.behavioralEventsStore.get(scanId) || behavioralEvents || [];
      this.behavioralEventsStore.delete(scanId);
      
      // Оценка поведенческого анализа
      const behavioralDetection = this.detector.evaluateBehavioral(storedEvents, malwareType);
      
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
          events: storedEvents,
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
        userId,
      });
      
      // Bulk insert behavioral events with REAL scan ID
      if (storedEvents.length > 0) {
        await ScanEvent.bulkCreate(scanRecord.id, storedEvents);
      }
      
      // Уведомляем фронтенд о завершении с REAL scan ID
      const completionPayload = {
        scanId: scanRecord.id,
        ...finalResult,
        scan: scanRecord,
        message: 'Analysis complete and saved to database',
      };

      this.io.to(`scan:${scanId}`).emit('scan:complete', completionPayload);
      // Also publish globally so Dashboard/History refresh immediately even if
      // the uploader did not join the temporary scan room.
      this.io.emit('scan:complete', completionPayload);
      
      console.log(`✅ [${scanId}] Scan complete: ${finalResult.verdict} (${finalResult.riskScore}) -> DB ID: ${scanRecord.id}`);
      
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
    // Scan.findAll already performs both COUNT(*) and paginated selection.
    // Returning that object directly fixes the history response shape.
    return Scan.findAll(filters);
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
  async getStats(userId = null) {
    return Scan.getStats(userId);
  }

  /**
   * Emit progress update via Socket.IO
   * @param {string} scanId - Scan ID
   * @param {string} stage - Current stage
   * @param {number} progress - Progress percentage
   * @param {string} message - Status message
   */
  emitProgress(scanId, stage, progress, message) {
    const payload = {
      scanId,
      stage,
      progress,
      message,
      timestamp: new Date().toISOString(),
    };
    this.io.to(`scan:${scanId}`).emit('scan:progress', payload);
    this.io.emit('scan:progress', payload);
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