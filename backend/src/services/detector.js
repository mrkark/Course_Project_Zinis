const config = require('../config');

class Detector {
  constructor(io) { this.io = io; }
  verdict(score) { if (score >= 80) return 'CRITICAL'; if (score >= 50) return 'HIGH'; if (score >= 30) return 'MEDIUM'; if (score > 0) return 'LOW'; return 'CLEAN'; }
  evaluateStatic(result) {
    const score = Math.min(100, result.riskScore || 0);
    return { riskScore: score, verdict: this.verdict(score), findings: result.findings || [] };
  }
  evaluateBehavioral(events = []) {
    const weights = { file_creation: 6, file_modification: 5, file_rename: 7, process_spawn: 5, command_execution: 8, keystroke_capture: 8, clipboard_access: 5, network_connection: 6, c2_command: 8, data_exfiltration: 8, network_scan: 5, exploit_attempt: 10, remote_execution: 9, persistence: 5, ransom_note: 12, cpu_activity: 3, disk_activity: 3 };
    const raw = events.reduce((sum, e) => sum + (weights[e.eventType] || 2), 0);
    const score = Math.min(100, raw);
    return { riskScore: score, verdict: this.verdict(score), eventCount: events.length, eventTypeCounts: events.reduce((a,e)=>(a[e.eventType]=(a[e.eventType]||0)+1,a),{}) };
  }
  combineResults(staticResult, behavioralResult) {
    const riskScore = Math.min(100, Math.round(staticResult.riskScore * 0.6 + behavioralResult.riskScore * 0.4));
    const verdict = this.verdict(riskScore);
    if (verdict === 'HIGH' || verdict === 'CRITICAL') this.emitAlert({ verdict, riskScore, timestamp: new Date().toISOString() });
    return { riskScore, verdict, static: staticResult, behavioral: behavioralResult, timestamp: new Date().toISOString() };
  }
  emitAlert(alert) { this.io.emit('detector:alert', alert); }
}
module.exports = Detector;
