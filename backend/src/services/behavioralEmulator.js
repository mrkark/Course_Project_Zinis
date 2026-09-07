// backend/src/services/behavioralEmulator.js
const config = require('../config');
const ScanEvent = require('../models/ScanEvent');

/**
 * Behavioral emulator - simulates malware behavior in real-time
 * Generates events sent via Socket.IO to frontend
 */
class BehavioralEmulator {
  constructor(io) {
    this.io = io;
    this.activeEmulations = new Map(); // scanId -> emulation state
    
    // Профили поведения для разных типов вредоносов
    this.behaviorProfiles = {
      ransomware: {
        name: 'Ransomware',
        stages: [
          { name: 'initial_access', duration: 1000, events: ['process_spawn', 'file_read'] },
          { name: 'reconnaissance', duration: 2000, events: ['directory_enumeration', 'file_enumeration'] },
          { name: 'encryption_prep', duration: 1500, events: ['crypto_api_init', 'key_generation'] },
          { name: 'mass_encryption', duration: 5000, events: ['file_read', 'file_write', 'file_rename'], intensity: 'high' },
          { name: 'ransom_note', duration: 1000, events: ['file_create_ransom_note'] },
          { name: 'cleanup', duration: 1000, events: ['delete_shadow_copies', 'disable_recovery'] },
        ],
        eventTemplates: {
          process_spawn: { type: 'process_spawn', severity: 'WARNING', msgs: ['cmd.exe spawned', 'powershell.exe spawned', 'vssadmin.exe spawned'] },
          file_read: { type: 'file_access', severity: 'INFO', msgs: ['Reading document.docx', 'Reading image.png', 'Reading database.db'] },
          file_write: { type: 'file_modification', severity: 'WARNING', msgs: ['Encrypting document.docx', 'Encrypting image.png', 'Encrypting database.db'] },
          file_rename: { type: 'file_rename', severity: 'CRITICAL', msgs: ['document.docx -> document.docx.encrypted', 'image.png -> image.png.locked', 'database.db -> database.db.ransom'] },
          directory_enumeration: { type: 'directory_scan', severity: 'INFO', msgs: ['Scanning C:\\Users\\Documents', 'Scanning D:\\Data', 'Scanning network shares'] },
          file_enumeration: { type: 'file_enumeration', severity: 'INFO', msgs: ['Found 1,234 files', 'Found 567 images', 'Found 89 documents'] },
          crypto_api_init: { type: 'crypto_operation', severity: 'WARNING', msgs: ['Initializing AES-256', 'Generating RSA key pair', 'Loading encryption library'] },
          key_generation: { type: 'crypto_operation', severity: 'CRITICAL', msgs: ['Generated encryption key', 'Exported public key to C&C'] },
          file_create_ransom_note: { type: 'file_creation', severity: 'CRITICAL', msgs: ['Created README_DECRYPT.txt', 'Created HOW_TO_RECOVER.html', 'Created DECRYPT_INSTRUCTIONS.txt'] },
          delete_shadow_copies: { type: 'system_modification', severity: 'CRITICAL', msgs: ['vssadmin delete shadows /all', 'wmic shadowcopy delete'] },
          disable_recovery: { type: 'system_modification', severity: 'CRITICAL', msgs: ['bcdedit /set recoveryenabled No', 'wbadmin delete systemstatebackup'] },
        },
        riskIncrement: [5, 10, 15, 25, 15, 10],
      },
      
      keylogger: {
        name: 'Keylogger',
        stages: [
          { name: 'installation', duration: 1000, events: ['hook_install', 'persistence_setup'] },
          { name: 'keystroke_capture', duration: 8000, events: ['keystroke_log', 'clipboard_monitor'], intensity: 'high' },
          { name: 'data_exfiltration', duration: 2000, events: ['c2_connection', 'data_upload'] },
        ],
        eventTemplates: {
          hook_install: { type: 'hook_install', severity: 'WARNING', msgs: ['SetWindowsHookEx(WH_KEYBOARD_LL) installed', 'Low-level keyboard hook registered'] },
          persistence_setup: { type: 'persistence', severity: 'WARNING', msgs: ['Added to Run registry key', 'Created scheduled task', 'Installed as service'] },
          keystroke_log: { type: 'keystroke_capture', severity: 'CRITICAL', msgs: ['Captured: "password123"', 'Captured: "login@email.com"', 'Captured: "credit card: 4111..."'] },
          clipboard_monitor: { type: 'clipboard_access', severity: 'WARNING', msgs: ['Clipboard: "copied password"', 'Clipboard: "copied token"', 'Clipboard: "sensitive data"'] },
          c2_connection: { type: 'network_connection', severity: 'CRITICAL', msgs: ['Connecting to C&C: 192.168.1.100:8080', 'Established TLS connection to evil.com'] },
          data_upload: { type: 'data_exfiltration', severity: 'CRITICAL', msgs: ['Uploading 2.3KB keystroke log', 'Uploading clipboard history', 'Exfiltration complete'] },
        },
        riskIncrement: [15, 30, 20],
      },
      
      backdoor: {
        name: 'Backdoor',
        stages: [
          { name: 'c2_connect', duration: 1500, events: ['dns_query', 'tcp_connection'] },
          { name: 'command_loop', duration: 10000, events: ['command_receive', 'command_execute', 'result_send'], intensity: 'high' },
          { name: 'persistence', duration: 1000, events: ['service_install', 'registry_run'] },
        ],
        eventTemplates: {
          dns_query: { type: 'network_dns', severity: 'INFO', msgs: ['DNS query: c2.evil.com', 'DNS TXT record request for commands'] },
          tcp_connection: { type: 'network_connection', severity: 'WARNING', msgs: ['TCP connection to 203.0.113.45:443', 'TLS handshake with C&C server'] },
          command_receive: { type: 'c2_command', severity: 'CRITICAL', msgs: ['Received: "whoami"', 'Received: "dir C:\\Users"', 'Received: "net user"'] },
          command_execute: { type: 'command_execution', severity: 'CRITICAL', msgs: ['Executing: whoami', 'Executing: dir C:\\Users', 'Executing: net user'] },
          result_send: { type: 'data_exfiltration', severity: 'WARNING', msgs: ['Sending command output (1.2KB)', 'Sending system info', 'Sending file listing'] },
          service_install: { type: 'persistence', severity: 'WARNING', msgs: ['Created service "Windows Update Helper"', 'Service set to auto-start'] },
          registry_run: { type: 'persistence', severity: 'WARNING', msgs: ['Added to HKLM\\Run', 'Added to HKCU\\Run'] },
        },
        riskIncrement: [20, 35, 15],
      },
      
      worm: {
        name: 'Worm',
        stages: [
          { name: 'network_scan', duration: 3000, events: ['port_scan', 'service_enum'], intensity: 'high' },
          { name: 'exploitation', duration: 4000, events: ['exploit_attempt', 'payload_delivery'], intensity: 'high' },
          { name: 'propagation', duration: 3000, events: ['self_copy', 'remote_execution'] },
        ],
        eventTemplates: {
          port_scan: { type: 'network_scan', severity: 'WARNING', msgs: ['Scanning 192.168.1.0/24 port 445', 'Scanning 10.0.0.0/8 port 139', 'SYN scan on 172.16.0.0/12'] },
          service_enum: { type: 'service_enumeration', severity: 'INFO', msgs: ['SMB v1 detected on 192.168.1.50', 'RDP open on 192.168.1.100', 'SSH open on 192.168.1.200'] },
          exploit_attempt: { type: 'exploit_attempt', severity: 'CRITICAL', msgs: ['Attempting EternalBlue (MS17-010)', 'Attempting SMBGhost (CVE-2020-0796)', 'Attempting BlueKeep (CVE-2019-0708)'] },
          payload_delivery: { type: 'payload_delivery', severity: 'CRITICAL', msgs: ['Delivered payload to 192.168.1.50', 'Injected shellcode into lsass.exe', 'Written malicious DLL to ADMIN$'] },
          self_copy: { type: 'file_creation', severity: 'WARNING', msgs: ['Copied self to \\\\192.168.1.50\\ADMIN$\\worm.exe', 'Copied to removable drive E:\\'] },
          remote_execution: { type: 'remote_execution', severity: 'CRITICAL', msgs: ['Executed via psexec on 192.168.1.50', 'Executed via WMI on 192.168.1.100', 'Scheduled task created on remote host'] },
        },
        riskIncrement: [20, 35, 25],
      },
      
      trojan: {
        name: 'Trojan',
        stages: [
          { name: 'dropper', duration: 1000, events: ['payload_extract', 'decoy_execute'] },
          { name: 'payload_execution', duration: 5000, events: ['c2_connect', 'credential_theft', 'additional_payload'], intensity: 'high' },
          { name: 'persistence', duration: 1000, events: ['startup_entry', 'service_creation'] },
        ],
        eventTemplates: {
          payload_extract: { type: 'file_creation', severity: 'WARNING', msgs: ['Extracted payload to %TEMP%\\svchost.exe', 'Dropped malicious DLL to System32'] },
          decoy_execute: { type: 'process_spawn', severity: 'INFO', msgs: ['Launched legitimate calculator.exe', 'Displayed fake PDF document'] },
          c2_connect: { type: 'network_connection', severity: 'CRITICAL', msgs: ['Connected to C&C: trojan-c2.example.com', 'Heartbeat sent to controller'] },
          credential_theft: { type: 'credential_theft', severity: 'CRITICAL', msgs: ['Dumped LSASS memory', 'Extracted browser passwords', 'Stolen WiFi credentials'] },
          additional_payload: { type: 'payload_delivery', severity: 'WARNING', msgs: ['Downloaded ransomware module', 'Downloaded keylogger module', 'Downloaded crypto-miner'] },
          startup_entry: { type: 'persistence', severity: 'WARNING', msgs: ['Added to Startup folder', 'Created RunOnce registry key'] },
          service_creation: { type: 'persistence', severity: 'WARNING', msgs: ['Created service "Security Center"', 'Set service to delayed auto-start'] },
        },
        riskIncrement: [15, 40, 15],
      },
      
      adware: {
        name: 'Adware',
        stages: [
          { name: 'installation', duration: 1000, events: ['browser_extension', 'proxy_setup'] },
          { name: 'ad_injection', duration: 8000, events: ['ad_inject', 'traffic_redirect', 'data_collection'], intensity: 'high' },
        ],
        eventTemplates: {
          browser_extension: { type: 'persistence', severity: 'WARNING', msgs: ['Installed malicious Chrome extension', 'Modified Firefox preferences', 'Added Edge browser helper object'] },
          proxy_setup: { type: 'system_modification', severity: 'WARNING', msgs: ['Configured system proxy to 127.0.0.1:8080', 'Installed PAC script for traffic redirection'] },
          ad_inject: { type: 'ad_injection', severity: 'WARNING', msgs: ['Injected banner ad on google.com', 'Injected pop-up on facebook.com', 'Replaced legitimate ads with affiliate links'] },
          traffic_redirect: { type: 'traffic_redirection', severity: 'WARNING', msgs: ['Redirected search to search.evil.com', 'Modified DNS settings', 'Hijacked browser homepage'] },
          data_collection: { type: 'data_collection', severity: 'INFO', msgs: ['Collected browsing history', 'Tracked search queries', 'Harvested click analytics'] },
        },
        riskIncrement: [10, 25],
      },
    };
  }

  /**
   * Start behavioral emulation for a scan
   * @param {number} scanId - Scan ID
   * @param {Object} analysisResults - Static analysis results
   * @returns {Promise<Object>} Emulation result
   */
  async startEmulation(scanId, analysisResults) {
    // Определяем тип вредоноса на основе статического анализа
    const malwareType = this.determineMalwareType(analysisResults);
    const profile = this.behaviorProfiles[malwareType] || this.behaviorProfiles.trojan;
    
    console.log(`🎭 Starting ${profile.name} emulation for scan ${scanId}`);
    
    const emulationState = {
      scanId,
      profile,
      currentStage: 0,
      currentEventIndex: 0,
      totalRiskIncrement: 0,
      startTime: Date.now(),
      intervalId: null,
      stageTimeoutId: null,
      isRunning: true,
    };
    
    this.activeEmulations.set(scanId, emulationState);
    
    // Запускаем эмуляцию
    this.runEmulation(scanId, emulationState);
    
    return {
      malwareType,
      profileName: profile.name,
      estimatedDuration: profile.stages.reduce((sum, s) => sum + s.duration, 0),
    };
  }

  /**
   * Determine malware type from static analysis
   * @param {Object} analysisResults - Static analysis results
   * @returns {string} Malware type
   */
  determineMalwareType(analysisResults) {
    const findings = analysisResults.findings || [];
    const categories = findings.map(f => f.category);
    const descriptions = findings.map(f => f.description).join(' ').toLowerCase();
    
    // Эвристика определения типа
    if (categories.includes('entropy') && descriptions.includes('ransom')) return 'ransomware';
    if (descriptions.includes('keystroke') || descriptions.includes('getasynckeystate')) return 'keylogger';
    if (descriptions.includes('c2') || descriptions.includes('command') || descriptions.includes('backdoor')) return 'backdoor';
    if (descriptions.includes('scan') || descriptions.includes('exploit') || descriptions.includes('worm') || descriptions.includes('eternalblue')) return 'worm';
    if (descriptions.includes('adware') || descriptions.includes('ad_inject') || descriptions.includes('browser')) return 'adware';
    
    // По умолчанию - троян
    return 'trojan';
  }

  /**
   * Run emulation loop
   * @param {number} scanId - Scan ID
   * @param {Object} state - Emulation state
   */
  runEmulation(scanId, state) {
    const runStage = () => {
      if (!state.isRunning || state.currentStage >= state.profile.stages.length) {
        this.finishEmulation(scanId, state);
        return;
      }
      
      const stage = state.profile.stages[state.currentStage];
      const intensity = stage.intensity === 'high' ? 200 : 500; // ms between events
      
      // Генерируем события для этапа
      const generateEvents = () => {
        if (!state.isRunning || state.currentStage >= state.profile.stages.length) {
          clearInterval(state.intervalId);
          state.intervalId = null;
          // Переход к следующему этапу
          state.currentStage++;
          state.currentEventIndex = 0;
          if (state.isRunning) {
            state.stageTimeoutId = setTimeout(runStage, 500);
          }
          return;
        }
        
        const eventType = stage.events[state.currentEventIndex % stage.events.length];
        const template = state.profile.eventTemplates[eventType];
        
        if (template) {
          const msgIndex = Math.floor(Math.random() * template.msgs.length);
          this.emitEvent(scanId, {
            eventType: template.type,
            severity: template.severity,
            message: template.msgs[msgIndex],
            stage: stage.name,
            timestamp: new Date().toISOString(),
          });
          
          // Увеличиваем риск
          const riskInc = state.profile.riskIncrement[state.currentStage] || 5;
          state.totalRiskIncrement += riskInc;
        }
        
        state.currentEventIndex++;
      };
      
      // Запускаем генерацию событий для этого этапа
      state.intervalId = setInterval(generateEvents, intensity);
      
      // Таймер перехода к следующему этапу
      state.stageTimeoutId = setTimeout(() => {
        if (state.intervalId) {
          clearInterval(state.intervalId);
          state.intervalId = null;
        }
      }, stage.duration);
    };
    
    runStage();
  }

  /**
   * Emit event to frontend and save to database
   * @param {number} scanId - Scan ID
   * @param {Object} eventData - Event data
   */
  async emitEvent(scanId, eventData) {
    // Отправка через Socket.IO
    this.io.to(`scan:${scanId}`).emit('analysis:event', {
      scanId,
      ...eventData,
    });
    
    // Сохранение в БД
    try {
      await ScanEvent.create({
        scanId,
        eventType: eventData.eventType,
        severity: eventData.severity,
        message: eventData.message,
        metadata: { stage: eventData.stage },
      });
    } catch (error) {
      console.error('Failed to save scan event:', error);
    }
  }

  /**
   * Finish emulation
   * @param {number} scanId - Scan ID
   * @param {Object} state - Emulation state
   */
  async finishEmulation(scanId, state) {
    state.isRunning = false;
    
    if (state.intervalId) clearInterval(state.intervalId);
    if (state.stageTimeoutId) clearTimeout(state.stageTimeoutId);
    
    // Отправка финального события
    this.io.to(`scan:${scanId}`).emit('analysis:complete', {
      scanId,
      totalRiskIncrement: state.totalRiskIncrement,
      duration: Date.now() - state.startTime,
      profile: state.profile.name,
    });
    
    this.activeEmulations.delete(scanId);
    console.log(`✅ Emulation finished for scan ${scanId}, risk increment: ${state.totalRiskIncrement}`);
  }

  /**
   * Stop emulation for a scan
   * @param {number} scanId - Scan ID
   */
  stopEmulation(scanId) {
    const state = this.activeEmulations.get(scanId);
    if (state) {
      state.isRunning = false;
      if (state.intervalId) clearInterval(state.intervalId);
      if (state.stageTimeoutId) clearTimeout(state.stageTimeoutId);
      this.activeEmulations.delete(scanId);
      console.log(`🛑 Emulation stopped for scan ${scanId}`);
    }
  }

  /**
   * Get active emulations count
   * @returns {number}
   */
  getActiveCount() {
    return this.activeEmulations.size;
  }
}

module.exports = BehavioralEmulator;