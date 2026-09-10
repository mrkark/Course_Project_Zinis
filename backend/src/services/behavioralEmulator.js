class BehavioralEmulator {
  constructor(io) { this.io = io; this.active = new Map(); }
  profiles = {
    ransomware: [['file_creation','Mass file creation detected'],['file_modification','Mass file modification simulated'],['file_rename','Files renamed with encrypted extensions'],['ransom_note','README_DECRYPT.txt appeared'],['disk_activity','Disk activity spike simulated'],['cpu_activity','CPU activity spike simulated']],
    keylogger: [['keystroke_capture','Keyboard input captured (simulated)'],['keystroke_capture','Additional keystrokes observed (simulated)'],['clipboard_access','Clipboard read simulated'],['network_connection','Connection to simulated C&C established'],['data_exfiltration','Keystroke buffer upload simulated']],
    backdoor: [['network_connection','Outbound connection to simulated C&C'],['c2_command','Command received from simulated controller'],['command_execution','Command execution simulated'],['command_execution','Second command execution simulated'],['data_exfiltration','System information exfiltration simulated']],
    worm: [['network_scan','Network scan simulated'],['network_scan','Additional hosts enumerated'],['exploit_attempt','Exploit attempt simulated'],['file_creation','Self-copy to isolated sandbox simulated'],['remote_execution','Remote execution simulated'],['network_connection','Propagation connection simulated']],
    trojan: [['file_creation','Payload drop simulated'],['process_spawn','Decoy process launch simulated'],['network_connection','Outbound C&C connection simulated'],['persistence','Persistence mechanism simulated'],['data_exfiltration','Telemetry upload simulated']],
    adware: [['persistence','Browser extension installation simulated'],['traffic_redirection','Traffic redirection simulated'],['ad_injection','Advertisement injection simulated'],['data_collection','Browser history collection simulated']]
  };
  detectType(staticResult) {
    const s = JSON.stringify(staticResult).toLowerCase();
    if (/ransom|encrypted|decrypt|shadow/.test(s)) return 'ransomware';
    if (/keylogger|keystroke|keyboard|hook/.test(s)) return 'keylogger';
    if (/c2|backdoor|command|child_process|websocket/.test(s)) return 'backdoor';
    if (/worm|exploit|network scan|psexec/.test(s)) return 'worm';
    if (/adware|browser|ad_inject/.test(s)) return 'adware';
    return 'trojan';
  }
  start(scanId, staticResult, onEvent, onComplete) {
    const type = this.detectType(staticResult); const sequence = this.profiles[type] || this.profiles.trojan; let i = 0; const started = Date.now();
    const state = { timer: null, stopped: false };
    const tick = () => {
      if (state.stopped || i >= sequence.length) { if (!state.stopped) { this.io.to(`scan:${scanId}`).emit('analysis:complete',{scanId, profile:type, duration:Date.now()-started}); onComplete({ malwareType:type, duration:Date.now()-started }); } this.active.delete(scanId); return; }
      const [eventType, message] = sequence[i++]; const severity = ['ransom_note','exploit_attempt','data_exfiltration','command_execution','keystroke_capture'].includes(eventType) ? 'CRITICAL' : eventType === 'network_connection' ? 'WARNING' : 'INFO';
      onEvent({ scanId, eventType, severity, message, stage: type, timestamp: new Date().toISOString() });
      state.timer = setTimeout(tick, 650);
    };
    this.active.set(scanId, state); this.io.to(`scan:${scanId}`).emit('analysis:started',{scanId, profile:type}); tick();
    return { malwareType:type, estimatedDuration: sequence.length * 650 };
  }
  stop(scanId) { const s=this.active.get(scanId); if(s){s.stopped=true;clearTimeout(s.timer);this.active.delete(scanId);} }
}
module.exports = BehavioralEmulator;
