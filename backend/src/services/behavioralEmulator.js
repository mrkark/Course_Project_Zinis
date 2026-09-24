// backend/src/services/behavioralEmulator.js
const config = require('../config');

/**
 * Behavioral emulator — симулирует исполнение файла в изолированной среде.
 *
 * В отличие от предыдущей версии, эмуляция **управляется содержимым файла**:
 * индикаторы, извлечённые статическим анализатором (URL, IP, пути, API-вызовы),
 * используются для генерации реалистичных событий «исполнения».
 *
 * Файл по-прежнему НЕ исполняется на сервере — это симуляция,
 * но она привязана к тому, что реально найдено в файле.
 */
class BehavioralEmulator {
  constructor(io) {
    this.io = io;
    this.activeEmulations = new Map(); // scanId -> emulation state
  }

  /**
   * Start behavioral emulation for a scan.
   * @param {string} scanId - Temp Scan ID
   * @param {Object} analysisResults - Static analysis results (with indicators)
   * @param {Function|null} onEvent - Event collector callback
   * @returns {Promise<Object>} Emulation info with completionPromise
   */
  async startEmulation(scanId, analysisResults, onEvent = null) {
    const indicators = analysisResults.indicators || {};
    const findings = analysisResults.findings || [];
    const malwareType = this.determineMalwareType(analysisResults);

    // Строим план исполнения на основе реальных индикаторов
    const executionPlan = this.buildExecutionPlan(indicators, findings, malwareType);

    console.log(`🎭 [${scanId}] Starting data-driven emulation: type=${malwareType}, stages=${executionPlan.length}`);

    const emulationState = {
      scanId,
      malwareType,
      executionPlan,
      currentStageIdx: 0,
      currentEventIdx: 0,
      totalRiskIncrement: 0,
      startTime: Date.now(),
      intervalId: null,
      stageTimeoutId: null,
      isRunning: true,
      onEvent,
      completionResolver: null,
      completionRejecter: null,
    };

    const completionPromise = new Promise((resolve, reject) => {
      emulationState.completionResolver = resolve;
      emulationState.completionRejecter = reject;

      // Таймаут 2 минуты
      setTimeout(() => {
        if (emulationState.isRunning) {
          reject(new Error('Emulation timeout'));
        }
      }, 120000);
    });

    this.activeEmulations.set(scanId, emulationState);
    this.runEmulation(scanId, emulationState);

    return {
      malwareType,
      profileName: this.getMalwareDisplayName(malwareType),
      estimatedDuration: executionPlan.reduce((sum, s) => sum + s.duration, 0),
      completionPromise,
    };
  }

  /**
   * Determine malware type from static analysis findings.
   * Эвристика основана на тегах, присвоенных каждому паттерну в FileAnalyzer.
   * @param {Object} analysisResults - Static analysis results
   * @returns {string} Malware type
   */
  determineMalwareType(analysisResults) {
    const findings = analysisResults.findings || [];
    if (findings.length === 0) return 'clean';
    const tags = new Set(findings.map(f => f.tag).filter(Boolean));
    const descriptions = findings.map(f => f.description).join(' ').toLowerCase();

    // Ранжирование по характерным комбинациям тегов
    if (tags.has('keylogging')) return 'keylogger';
    if ((tags.has('crypto') || descriptions.includes('encrypt') || descriptions.includes('aes'))
        && tags.has('data_access')) return 'ransomware';
    if (tags.has('process_injection') && tags.has('network')) return 'backdoor';
    if (descriptions.includes('exploit') || descriptions.includes('eternalblue')
        || descriptions.includes('worm')) return 'worm';
    if (descriptions.includes('adware') || descriptions.includes('ad_inject')
        || descriptions.includes('browser helper')) return 'adware';
    if (tags.has('network') && tags.has('command_execution')) return 'backdoor';
    if (tags.has('exfiltration')) return 'trojan';

    // По умолчанию — троян
    return 'trojan';
  }

  /**
   * Build an execution plan from extracted indicators.
   *
   * Каждая «стадия» плана соответствует фазе исполнения вредоноса.
   * События внутри стадии генерируются из **реальных данных** файла:
   *   - найденные URL → сетевые подключения к этим URL
   *   - найденные API → вызовы этих API
   *   - найденные ключи реестра → модификация реестра
   *   - найденные команды → исполнение команд
   *
   * Если файл чистый (нет индикаторов), план содержит короткую стадию
   * «запуск и завершение без подозрительной активности».
   */
  buildExecutionPlan(indicators, findings, malwareType) {
    const tags = new Set((indicators.tags || []).concat(findings.map(f => f.tag).filter(Boolean)));
    const plan = [];

    // ────────────────── Фаза 1: Запуск процесса ──────────────────
    const launchEvents = [
      { eventType: 'process_spawn', severity: 'INFO', message: 'Процесс создан, начата инициализация' },
      { eventType: 'memory_allocation', severity: 'INFO', message: 'Выделена память, загрузка модулей' },
    ];
    plan.push({ name: 'process_launch', duration: 1500, events: launchEvents, riskIncrement: 0 });

    // Если файл чистый — завершаем после короткого запуска
    if (findings.length === 0) {
      plan.push({
        name: 'clean_exit',
        duration: 1000,
        events: [
          { eventType: 'process_exit', severity: 'INFO', message: 'Процесс завершился штатно, подозрительной активности не обнаружено' },
        ],
        riskIncrement: 0,
      });
      return plan;
    }

    // ────────────────── Фаза 2: Обфускация / распаковка ──────────────────
    if (tags.has('obfuscation')) {
      const obfEvents = [
        { eventType: 'memory_allocation', severity: 'WARNING', message: 'Выделена дополнительная память для распаковки' },
        { eventType: 'code_decryption', severity: 'WARNING', message: 'Обнаружена декодировка встроенных данных (возможный payload)' },
      ];
      // Добавляем конкретные примеры найденной обфускации
      const obfFindings = findings.filter(f => f.tag === 'obfuscation');
      for (const f of obfFindings.slice(0, 3)) {
        obfEvents.push({
          eventType: 'code_decryption',
          severity: 'WARNING',
          message: `Распаковка: ${f.description}`,
        });
      }
      plan.push({ name: 'unpacking', duration: 2000, events: obfEvents, riskIncrement: 10 });
    }

    // ────────────────── Фаза 3: Исполнение кода ──────────────────
    if (tags.has('code_execution') || tags.has('command_execution')) {
      const execEvents = [];

      // Конкретные команды из файла
      const commands = indicators.commands || [];
      for (const cmd of commands.slice(0, 5)) {
        execEvents.push({
          eventType: 'command_execution',
          severity: 'CRITICAL',
          message: `Исполнение команды: ${cmd.slice(0, 120)}`,
        });
      }

      // API-вызовы исполнения
      const execApis = (indicators.apiCalls?.command_execution || []).concat(
        indicators.apiCalls?.code_execution || [],
        indicators.apiCalls?.process_creation || [],
      );
      for (const api of [...new Set(execApis)].slice(0, 4)) {
        execEvents.push({
          eventType: 'api_call',
          severity: 'WARNING',
          message: `Вызов API: ${api}`,
        });
      }

      if (execEvents.length === 0) {
        execEvents.push({ eventType: 'code_execution', severity: 'WARNING', message: 'Обнаружено динамическое исполнение кода' });
      }

      plan.push({ name: 'code_execution', duration: 3000, events: execEvents, riskIncrement: 20 });
    }

    // ────────────────── Фаза 4: Инъекция в процесс ──────────────────
    if (tags.has('process_injection')) {
      const targetProcesses = ['explorer.exe', 'svchost.exe', 'lsass.exe', 'csrss.exe'];
      const target = targetProcesses[Math.floor(Math.random() * targetProcesses.length)];

      const injectionApis = indicators.apiCalls?.process_injection || [];
      const injEvents = [
        { eventType: 'process_injection', severity: 'CRITICAL', message: `Открыт handle на процесс ${target} (OpenProcess)` },
      ];
      for (const api of injectionApis.slice(0, 3)) {
        injEvents.push({ eventType: 'process_injection', severity: 'CRITICAL', message: `Инъекция: ${api}` });
      }
      injEvents.push({ eventType: 'process_injection', severity: 'CRITICAL', message: `Код внедрён в процесс ${target}` });

      plan.push({ name: 'process_injection', duration: 2500, events: injEvents, riskIncrement: 25 });
    }

    // ────────────────── Фаза 5: Сетевая активность ──────────────────
    if (tags.has('network') || indicators.urls.length > 0 || indicators.ipAddresses.length > 0) {
      const netEvents = [];

      // Подключения к найденным URL
      for (const url of indicators.urls.slice(0, 5)) {
        netEvents.push({
          eventType: 'network_connection',
          severity: 'CRITICAL',
          message: `Исходящее подключение: ${url.slice(0, 100)}`,
        });
      }

      // Подключения к найденным IP
      for (const ip of indicators.ipAddresses.slice(0, 5)) {
        const port = [80, 443, 4444, 8080, 8443][Math.floor(Math.random() * 5)];
        netEvents.push({
          eventType: 'network_connection',
          severity: 'CRITICAL',
          message: `TCP-подключение к ${ip}:${port}`,
        });
      }

      // Сетевые API-вызовы
      const netApis = indicators.apiCalls?.network || [];
      for (const api of netApis.slice(0, 3)) {
        netEvents.push({ eventType: 'api_call', severity: 'WARNING', message: `Сеть: ${api}` });
      }

      if (netEvents.length === 0) {
        netEvents.push({ eventType: 'network_connection', severity: 'WARNING', message: 'Обнаружена попытка сетевого подключения' });
      }

      plan.push({ name: 'network_activity', duration: 3000, events: netEvents, riskIncrement: 20 });
    }

    // ────────────────── Фаза 6: Модификация реестра / персистентность ──────────────────
    if (tags.has('registry') || indicators.registryKeys.length > 0) {
      const regEvents = [];

      for (const key of indicators.registryKeys.slice(0, 5)) {
        regEvents.push({
          eventType: 'registry_modification',
          severity: 'WARNING',
          message: `Запись в реестр: ${key.slice(0, 100)}`,
        });
      }

      if (regEvents.length === 0) {
        regEvents.push({ eventType: 'registry_modification', severity: 'WARNING', message: 'Модификация ключей реестра' });
      }

      plan.push({ name: 'persistence', duration: 1500, events: regEvents, riskIncrement: 10 });
    }

    // ────────────────── Фаза 7: Доступ к данным / кейлоггинг ──────────────────
    if (tags.has('keylogging')) {
      const keylogApis = indicators.apiCalls?.keylogging || [];
      const klEvents = [
        { eventType: 'hook_install', severity: 'CRITICAL', message: 'Установлен перехватчик клавиатуры (SetWindowsHookEx WH_KEYBOARD_LL)' },
      ];
      for (const api of keylogApis.slice(0, 3)) {
        klEvents.push({ eventType: 'keystroke_capture', severity: 'CRITICAL', message: `Перехват: ${api}` });
      }
      klEvents.push({ eventType: 'keystroke_capture', severity: 'CRITICAL', message: 'Перехвачены нажатия клавиш, данные буферизуются' });

      plan.push({ name: 'keylogging', duration: 3000, events: klEvents, riskIncrement: 25 });
    }

    if (tags.has('data_access') || tags.has('exfiltration')) {
      const dataEvents = [];
      const dataApis = (indicators.apiCalls?.data_access || []).concat(indicators.apiCalls?.exfiltration || []);
      for (const api of dataApis.slice(0, 4)) {
        dataEvents.push({ eventType: 'data_access', severity: 'WARNING', message: `Доступ к данным: ${api}` });
      }
      if (dataEvents.length === 0) {
        dataEvents.push({ eventType: 'data_access', severity: 'WARNING', message: 'Обнаружен доступ к пользовательским данным' });
      }
      plan.push({ name: 'data_collection', duration: 2000, events: dataEvents, riskIncrement: 10 });
    }

    // ────────────────── Фаза 8: Файловая активность ──────────────────
    if (indicators.filePaths.length > 0) {
      const fileEvents = [];
      for (const fp of indicators.filePaths.slice(0, 5)) {
        fileEvents.push({
          eventType: 'file_access',
          severity: 'WARNING',
          message: `Обращение к файлу: ${fp.slice(0, 100)}`,
        });
      }
      plan.push({ name: 'file_activity', duration: 2000, events: fileEvents, riskIncrement: 5 });
    }

    // ────────────────── Фаза 9: Известные инструменты ──────────────────
    if (tags.has('known_tool')) {
      const toolFindings = findings.filter(f => f.tag === 'known_tool');
      const toolEvents = [];
      for (const f of toolFindings.slice(0, 3)) {
        toolEvents.push({
          eventType: 'known_malware_tool',
          severity: 'CRITICAL',
          message: `Обнаружен известный инструмент: ${f.description}`,
        });
      }
      plan.push({ name: 'known_tools_detected', duration: 1000, events: toolEvents, riskIncrement: 15 });
    }

    // ────────────────── Фаза 10: Завершение ──────────────────
    plan.push({
      name: 'execution_complete',
      duration: 800,
      events: [
        { eventType: 'analysis_complete', severity: 'INFO', message: 'Эмуляция исполнения завершена, результаты собраны' },
      ],
      riskIncrement: 0,
    });

    return plan;
  }

  /**
   * Run the emulation according to the execution plan.
   */
  runEmulation(scanId, state) {
    const runStage = () => {
      if (!state.isRunning || state.currentStageIdx >= state.executionPlan.length) {
        this.finishEmulation(scanId, state);
        return;
      }

      const stage = state.executionPlan[state.currentStageIdx];
      const interval = Math.max(200, Math.floor(stage.duration / Math.max(stage.events.length, 1)));

      let eventIdx = 0;

      const emitNext = () => {
        if (!state.isRunning || eventIdx >= stage.events.length) {
          if (state.intervalId) {
            clearInterval(state.intervalId);
            state.intervalId = null;
          }
          state.totalRiskIncrement += (stage.riskIncrement || 0);
          state.currentStageIdx++;
          state.currentEventIdx = 0;
          if (state.isRunning) {
            state.stageTimeoutId = setTimeout(runStage, 300);
          }
          return;
        }

        const event = stage.events[eventIdx];
        this.emitEvent(scanId, {
          eventType: event.eventType,
          severity: event.severity,
          message: event.message,
          stage: stage.name,
          timestamp: new Date().toISOString(),
        }, state.onEvent);

        eventIdx++;
        state.currentEventIdx++;
      };

      state.intervalId = setInterval(emitNext, interval);

      // Таймер завершения стадии (гарантия перехода, даже если события закончились раньше)
      state.stageTimeoutId = setTimeout(() => {
        if (state.intervalId) {
          clearInterval(state.intervalId);
          state.intervalId = null;
        }
        state.totalRiskIncrement += (stage.riskIncrement || 0);
        state.currentStageIdx++;
        state.currentEventIdx = 0;
        if (state.isRunning) {
          state.stageTimeoutId = setTimeout(runStage, 300);
        }
      }, stage.duration);
    };

    runStage();
  }

  /**
   * Emit event to frontend and optionally pass it to ScanService for persistence
   */
  async emitEvent(scanId, eventData, onEvent = null) {
    this.io.to(`scan:${scanId}`).emit('analysis:event', {
      scanId,
      ...eventData,
    });

    if (typeof onEvent === 'function') {
      await onEvent(eventData);
    }
  }

  /**
   * Finish an emulation and resolve its completion promise.
   */
  finishEmulation(scanId, state) {
    if (!state || !state.isRunning) return;

    state.isRunning = false;
    if (state.intervalId) clearInterval(state.intervalId);
    if (state.stageTimeoutId) clearTimeout(state.stageTimeoutId);
    state.intervalId = null;
    state.stageTimeoutId = null;
    this.activeEmulations.delete(scanId);

    const result = {
      scanId,
      malwareType: state.malwareType,
      eventCount: state.currentEventIdx,
      riskIncrement: state.totalRiskIncrement,
      duration: Date.now() - state.startTime,
    };

    if (state.completionResolver) state.completionResolver(result);
    state.completionResolver = null;
    state.completionRejecter = null;

    this.io.emit('scan:emulation:complete', {
      scanId,
      malwareType: this.getMalwareDisplayName(state.malwareType),
      duration: result.duration,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Stop emulation for a scan
   */
  stopEmulation(scanId) {
    const state = this.activeEmulations.get(scanId);
    if (state) {
      state.isRunning = false;
      if (state.intervalId) clearInterval(state.intervalId);
      if (state.stageTimeoutId) clearTimeout(state.stageTimeoutId);
      this.activeEmulations.delete(scanId);
      console.log(`🛑 Emulation stopped for scan ${scanId}`);

      if (state.completionRejecter) {
        state.completionRejecter(new Error('Emulation stopped'));
      }
    }
  }

  /**
   * Get display name for malware type
   */
  getMalwareDisplayName(type) {
    const names = {
      clean: 'Чистый файл',
      ransomware: 'Ransomware',
      keylogger: 'Keylogger',
      backdoor: 'Backdoor',
      worm: 'Worm',
      trojan: 'Trojan',
      adware: 'Adware',
    };
    return names[type] || 'Trojan';
  }

  /**
   * Get active emulations count
   */
  getActiveCount() {
    return this.activeEmulations.size;
  }
}

module.exports = BehavioralEmulator;