// backend/src/services/detector.js
const config = require('../config');
const Threat = require('../models/Threat');

/**
 * Detector — оценивает risk score и определяет вердикт.
 *
 * Статическая оценка: на основе сигнатурных находок FileAnalyzer
 * с мультипликаторами за множественные находки и корреляционными бонусами.
 *
 * Поведенческая оценка: на основе событий data-driven эмуляции.
 * Теперь события привязаны к реальному содержимому файла, поэтому
 * их тип и количество напрямую отражают опасность.
 *
 * Финальный скор: static × 0.40 + behavioral × 0.60
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
        // Мультипликаторы за множественные находки по тегам
        tagMultiplier: {
          process_injection: 1.5,
          command_execution: 1.5,
          exfiltration: 1.5,
          known_tool: 2.0,
        },

        // Корреляционные бонусы: если найдены НЕСКОЛЬКО категорий опасности
        // одновременно, это значительно повышает вероятность ВПО.
        correlationRules: [
          { tags: ['network', 'obfuscation', 'process_injection'], bonus: 15, description: 'Сеть + обфускация + инъекция' },
          { tags: ['network', 'command_execution'], bonus: 10, description: 'Сеть + исполнение команд' },
          { tags: ['keylogging', 'network'], bonus: 10, description: 'Кейлоггинг + сеть' },
          { tags: ['obfuscation', 'code_execution'], bonus: 8, description: 'Обфускация + исполнение кода' },
          { tags: ['crypto', 'data_access'], bonus: 12, description: 'Криптография + доступ к данным' },
        ],

        // Штраф за отсутствие сетевой активности при высоком риске
        noNetworkPenalty: 0.85,
      },

      // Веса для поведенческих событий (по eventType)
      behavioralWeights: {
        process_injection: 12,
        network_connection: 8,
        command_execution: 10,
        hook_install: 15,
        keystroke_capture: 12,
        code_decryption: 5,
        registry_modification: 6,
        data_access: 4,
        known_malware_tool: 15,
        api_call: 3,
        file_access: 2,
        process_spawn: 0,
        memory_allocation: 0,
        process_exit: 0,
        analysis_complete: 0,
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
   * Evaluate static analysis results.
   *
   * Базовый скор приходит от FileAnalyzer (сумма score по всем найденным паттернам).
   * Здесь мы применяем мультипликаторы за множественные находки и корреляционные бонусы.
   *
   * @param {Object} analysisResults - Results from fileAnalyzer
   * @returns {Object} Detection result
   */
  evaluateStatic(analysisResults) {
    let riskScore = analysisResults.riskScore || 0;
    const findings = analysisResults.findings || [];
    const indicators = analysisResults.indicators || {};

    // Подсчёт находок по тегам
    const tagCounts = {};
    for (const finding of findings) {
      const tag = finding.tag || finding.category;
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }

    // Мультипликаторы: множественные находки одного типа усиливают скор
    for (const [tag, count] of Object.entries(tagCounts)) {
      const multiplier = this.rules.modifiers.tagMultiplier[tag];
      if (multiplier && count > 1) {
        const tagFindings = findings.filter(f => (f.tag || f.category) === tag);
        const tagScore = tagFindings.reduce((sum, f) => sum + f.score, 0);
        riskScore += Math.round(tagScore * (multiplier - 1));
      }
    }

    // Корреляционные бонусы: комбинация нескольких типов угроз → повышение скора
    const presentTags = new Set(Object.keys(tagCounts));
    const appliedCorrelations = [];
    for (const rule of this.rules.modifiers.correlationRules) {
      if (rule.tags.every(t => presentTags.has(t))) {
        riskScore += rule.bonus;
        appliedCorrelations.push(rule.description);
      }
    }

    // Ограничение
    riskScore = Math.min(riskScore, 100);

    const verdict = this.getVerdict(riskScore);

    return {
      riskScore,
      verdict,
      staticFindings: findings.length,
      tags: [...presentTags],
      correlations: appliedCorrelations,
    };
  }

  /**
   * Evaluate behavioral emulation events.
   *
   * Теперь события привязаны к реальному содержимому файла,
   * поэтому их оценка основана на типе и severity.
   *
   * @param {Array} events - Behavioral events
   * @param {string} malwareType - Detected malware type
   * @returns {Object} Behavioral detection result
   */
  evaluateBehavioral(events, malwareType) {
    let riskScore = 0;
    const triggeredRules = [];

    // Подсчёт по типам событий
    const eventCounts = {};
    for (const e of events) {
      eventCounts[e.eventType] = (eventCounts[e.eventType] || 0) + 1;
    }

    // Начисляем баллы за каждый тип события
    for (const [eventType, count] of Object.entries(eventCounts)) {
      const weight = this.rules.behavioralWeights[eventType];
      if (weight !== undefined && weight > 0) {
        // Уменьшающаяся отдача: первое событие — полный вес,
        // последующие — по sqrt(count) для снижения влияния повторов
        const score = Math.round(weight * Math.sqrt(count));
        riskScore += score;
        triggeredRules.push({ rule: eventType, count, weight, score });
      }
    }

    // Бонус за количество CRITICAL событий
    const criticalEvents = events.filter(e => e.severity === 'CRITICAL').length;
    if (criticalEvents > 3) {
      const bonus = Math.min(15, Math.round(criticalEvents * 2));
      riskScore += bonus;
      triggeredRules.push({ rule: 'critical_event_density', count: criticalEvents, score: bonus });
    }

    // Сетевые события
    const networkEvents = events.filter(e =>
      e.eventType.includes('network') ||
      e.eventType.includes('connection') ||
      e.eventType.includes('exfiltration')
    ).length;

    if (networkEvents === 0 && riskScore > 30) {
      // Нет сетевой активности при высоком скоре — скорее безобидно
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