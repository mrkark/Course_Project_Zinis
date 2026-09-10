// backend/src/services/detector.js
const config = require('../config');
const Threat = require('../models/Threat');

/**
 * Detector - evaluates risk score and determines verdict
 * Applies detection rules and emits alerts
 */
class Detector {
  constructor(io) {
    this.io = io;
    this.threatCache = null;
    this.rules = this.loadRules();
  }

  /**
   * Load detection rules
   * @returns {Object} Detection rules
   */
  loadRules() {
    return {
      // Пороговые значения вердиктов
      thresholds: config.analysis.riskScores,
      
      // Правила бонусов/штрафов
      modifiers: {
        // Бонусы за множественные находки в одной категории
        categoryMultiplier: {
          crypto_operation: 1.5,
          data_exfiltration: 1.5,
          command_execution: 1.5,
          exploit_attempt: 2.0,
          ransom_note: 2.0,
        },
        
        // Штрафы за отсутствие сетевой активности при высоком риске
        noNetworkPenalty: 0.8,
        
        // Бонус за известные_IOC
        knownIOCBonus: 20,
      },
      
      // Правила для динамического анализа (behavioral)
      behavioralRules: {
        ransomware: {
          massFileModification: { threshold: 10, score: 25 },
          ransomNoteCreation: { threshold: 1, score: 30 },
          shadowCopyDeletion: { threshold: 1, score: 20 },
        },
        keylogger: {
          keystrokeCapture: { threshold: 5, score: 25 },
          clipboardMonitor: { threshold: 3, score: 15 },
          periodicExfiltration: { threshold: 1, score: 20 },
        },
        backdoor: {
          c2Connection: { threshold: 1, score: 30 },
          commandExecution: { threshold: 3, score: 25 },
          persistenceMechanism: { threshold: 1, score: 15 },
        },
        worm: {
          networkScan: { threshold: 10, score: 20 },
          exploitAttempt: { threshold: 1, score: 30 },
          lateralMovement: { threshold: 1, score: 25 },
        },
      },
    };
  }

  /**
   * Load threat library into cache
   */
  async loadThreats() {
    if (!this.threatCache) {
      this.threatCache = await Threat.findAll();
    }
    return this.threatCache;
  }

  /**
   * Evaluate static analysis results
   * @param {Object} analysisResults - Results from fileAnalyzer
   * @returns {Object} Detection result
   */
  evaluateStatic(analysisResults) {
    let riskScore = analysisResults.riskScore || 0;
    const findings = analysisResults.findings || [];
    
    // Применяем модификаторы по категориям
    const categoryCounts = {};
    for (const finding of findings) {
      categoryCounts[finding.category] = (categoryCounts[finding.category] || 0) + 1;
    }
    
    for (const [category, count] of Object.entries(categoryCounts)) {
      const multiplier = this.rules.modifiers.categoryMultiplier[category];
      if (multiplier && count > 1) {
        const categoryFindings = findings.filter(f => f.category === category);
        const categoryScore = categoryFindings.reduce((sum, f) => sum + f.score, 0);
        riskScore += Math.round(categoryScore * (multiplier - 1));
      }
    }
    
    // Проверка на известные IOC
    const knownIOC = findings.some(f => 
      f.description.toLowerCase().includes('metasploit') ||
      f.description.toLowerCase().includes('mimikatz') ||
      f.description.toLowerCase().includes('cobalt strike')
    );
    if (knownIOC) {
      riskScore += this.rules.modifiers.knownIOCBonus;
    }
    
    // Ограничение максимального скора
    riskScore = Math.min(riskScore, 100);
    
    const verdict = this.getVerdict(riskScore);
    
    return {
      riskScore,
      verdict,
      staticFindings: findings.length,
      categories: Object.keys(categoryCounts),
      modifiersApplied: Object.keys(categoryCounts).filter(c => this.rules.modifiers.categoryMultiplier[c]),
    };
  }

  /**
   * Evaluate behavioral emulation events
   * @param {Array} events - Behavioral events
   * @param {string} malwareType - Detected malware type
   * @returns {Object} Behavioral detection result
   */
  evaluateBehavioral(events, malwareType) {
    let riskScore = 0;
    const triggeredRules = [];
    
    const rules = this.rules.behavioralRules[malwareType] || {};
    const eventTypes = events.map(e => e.eventType);
    const eventCounts = {};
    
    for (const type of eventTypes) {
      eventCounts[type] = (eventCounts[type] || 0) + 1;
    }
    
    for (const [ruleName, rule] of Object.entries(rules)) {
      const count = eventCounts[ruleName] || 0;
      if (count >= rule.threshold) {
        riskScore += rule.score;
        triggeredRules.push({
          rule: ruleName,
          count,
          threshold: rule.threshold,
          score: rule.score,
        });
      }
    }
    
    // Общие поведенческие правила
    const criticalEvents = events.filter(e => e.severity === 'CRITICAL').length;
    if (criticalEvents > 5) {
      riskScore += 15;
      triggeredRules.push({ rule: 'high_critical_event_count', count: criticalEvents, score: 15 });
    }
    
    const networkEvents = events.filter(e => 
      e.eventType.includes('network') || 
      e.eventType.includes('c2') || 
      e.eventType.includes('connection') ||
      e.eventType.includes('exfiltration')
    ).length;
    
    if (networkEvents === 0 && riskScore > 30) {
      // Штраф за отсутствие сетевой активности при подозрительном поведении
      riskScore = Math.round(riskScore * this.rules.modifiers.noNetworkPenalty);
    }
    
    riskScore = Math.min(riskScore, 100);
    
    return {
      riskScore,
      verdict: this.getVerdict(riskScore),
      eventCount: events.length,
      criticalEvents,
      networkEvents,
      triggeredRules,
      eventTypeCounts: eventCounts,
    };
  }

  /**
   * Combine static and behavioral results
   * @param {Object} staticResult - Static analysis result
   * @param {Object} behavioralResult - Behavioral analysis result
   * @returns {Object} Combined result
   */
  combineResults(staticResult, behavioralResult) {
    // Взвешенная комбинация: 40% статический, 60% поведенческий
    const combinedScore = Math.round(
      staticResult.riskScore * 0.4 + behavioralResult.riskScore * 0.6
    );
    
    const verdict = this.getVerdict(combinedScore);
    
    // Эмитим алерт если вердикт HIGH или CRITICAL
    if (verdict === 'HIGH' || verdict === 'CRITICAL') {
      this.emitAlert({
        verdict,
        riskScore: combinedScore,
        staticScore: staticResult.riskScore,
        behavioralScore: behavioralResult.riskScore,
        timestamp: new Date().toISOString(),
      });
    }
    
    return {
      riskScore: combinedScore,
      verdict,
      static: staticResult,
      behavioral: behavioralResult,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get verdict from risk score
   * @param {number} score - Risk score
   * @returns {string} Verdict
   */
  getVerdict(score) {
    const { critical, high, medium } = this.rules.thresholds;
    if (score >= critical) return 'CRITICAL';
    if (score >= high) return 'HIGH';
    if (score >= medium) return 'MEDIUM';
    if (score > 0) return 'LOW';
    return 'CLEAN';
  }

  /**
   * Emit alert via Socket.IO
   * @param {Object} alertData - Alert data
   */
  emitAlert(alertData) {
    this.io.emit('detector:alert', alertData);
    console.log(`🚨 ALERT: ${alertData.verdict} - Risk Score: ${alertData.riskScore}`);
  }

  /**
   * Get threat info by type
   * @param {string} type - Threat type
   * @returns {Promise<Object|null>} Threat info
   */
  async getThreatInfo(type) {
    const threats = await this.loadThreats();
    return threats.find(t => t.type.toLowerCase() === type.toLowerCase()) || null;
  }

  /**
   * Clear threat cache
   */
  clearCache() {
    this.threatCache = null;
  }
}

module.exports = Detector;