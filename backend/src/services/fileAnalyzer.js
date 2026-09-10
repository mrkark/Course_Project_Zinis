const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const config = require('../config');

class FileAnalyzer {
  constructor() {
    this.signatures = [
      ['cmd.exe', 15, 'Command shell execution'],
      ['powershell.exe', 18, 'PowerShell execution'],
      ['eval(', 18, 'Dynamic code evaluation'],
      ['child_process', 18, 'Child process spawning'],
      ['CreateRemoteThread', 28, 'Remote thread injection'],
      ['WriteProcessMemory', 28, 'Remote process memory write'],
      ['VirtualAllocEx', 20, 'Remote memory allocation'],
      ['OpenProcess', 15, 'Process handle acquisition'],
      ['base64_decode', 10, 'Base64 decoding'],
      ['shellcode', 22, 'Shellcode reference'],
      ['mimikatz', 30, 'Credential theft tool reference'],
      ['metasploit', 30, 'Metasploit reference'],
      ['cobalt strike', 30, 'Cobalt Strike reference'],
      ['SetWindowsHookEx', 20, 'Windows input hook'],
      ['GetAsyncKeyState', 20, 'Keyboard state polling'],
      ['URLDownloadToFile', 20, 'Remote file download'],
      ['WinExec', 18, 'Windows command execution'],
      ['CreateProcess', 18, 'Process creation'],
      ['WScript.Shell', 24, 'Script shell automation'],
      ['AutoOpen', 20, 'Office auto-open macro'],
      ['Document_Open', 20, 'Office open macro'],
    ];
    this.pdfSignatures = [
      ['/JavaScript', 25, 'Embedded JavaScript in PDF'],
      ['/OpenAction', 20, 'PDF action executed on open'],
      ['/AA', 20, 'PDF additional actions'],
      ['/Launch', 25, 'PDF launch action'],
      ['/EmbeddedFile', 15, 'Embedded file in PDF'],
    ];
    this.jsSignatures = [
      [/\beval\s*\(/gi, 18, 'JavaScript eval()'],
      [/\bnew\s+Function\s*\(/gi, 20, 'Dynamic Function constructor'],
      [/\bWebSocket\s*\(/gi, 10, 'WebSocket connection'],
    ];
  }

  async analyze(filePath, originalName, mimeType) {
    const buffer = await fs.readFile(filePath);
    return this.analyzeBuffer(buffer, originalName, mimeType);
  }

  async analyzeBuffer(buffer, originalName = 'sample.bin', mimeType = 'application/octet-stream') {
    if (!Buffer.isBuffer(buffer)) throw new TypeError('Analyzer expects a Buffer');
    const ext = path.extname(originalName).toLowerCase();
    const text = buffer.toString('latin1');
    const extractedText = await this.extractText(buffer, ext);
    const searchable = `${text}\n${extractedText}`;
    const findings = [];

    const addFinding = (category, signature, score, description, matches) => {
      if (!matches.length) return;
      findings.push({ category, signature, description, matches: matches.length, score: score * Math.min(matches.length, 5), examples: [...new Set(matches)].slice(0, 5) });
    };

    for (const [needle, score, description] of this.signatures) {
      const matches = this.findLiteral(searchable, needle);
      addFinding('signature', needle, score, description, matches);
    }

    for (const [regex, score, description] of [[/https?:\/\/[^\s<>'"`\\]+/gi, 6, 'HTTP/HTTPS URL'], [/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, 5, 'IPv4 address']]) {
      const matches = searchable.match(regex) || [];
      addFinding('network', regex.source, score, description, matches);
    }

    if (ext === '.js' || ext === '.mjs' || ext === '.cjs' || ext === '.ts' || ext === '.jsx' || ext === '.tsx') {
      for (const [regex, score, description] of this.jsSignatures) addFinding('javascript', regex.source, score, description, searchable.match(regex) || []);
    }

    if (ext === '.pdf') {
      for (const [needle, score, description] of this.pdfSignatures) addFinding('pdf', needle, score, description, this.findLiteral(searchable, needle));
    }

    const entropy = this.calculateEntropy(buffer);
    if (entropy >= config.analysis.entropyThreshold && buffer.length >= 1024) {
      findings.push({ category: 'entropy', signature: 'high_entropy', description: `High Shannon entropy (${entropy})`, matches: 1, score: 12, examples: [entropy] });
    }

    const typeMismatch = this.detectTypeMismatch(buffer, ext);
    if (typeMismatch) findings.push({ category: 'file_type', signature: 'magic_mismatch', description: typeMismatch, matches: 1, score: 15, examples: [ext || 'no extension'] });

    const suspiciousName = /(?:invoice|update|crack|keygen|patch|decrypt|payload|malware|ransom)/i.test(originalName);
    if (suspiciousName) findings.push({ category: 'filename', signature: 'suspicious_name', description: 'Suspicious filename', matches: 1, score: 8, examples: [originalName] });

    const rawScore = findings.reduce((sum, f) => sum + f.score, 0);
    return {
      fileInfo: { name: originalName, size: buffer.length, extension: ext, mimeType, fileType: this.getFileType(ext), sha256: crypto.createHash('sha256').update(buffer).digest('hex'), entropy: Number(entropy.toFixed(4)), extractedTextLength: extractedText.length },
      findings,
      riskScore: Math.min(rawScore, 100),
      verdict: this.getVerdict(rawScore),
      extractedText: extractedText.slice(0, 20000),
    };
  }

  findLiteral(text, needle) {
    const hay = text.toLowerCase(); const n = needle.toLowerCase(); const out = []; let p = 0;
    while ((p = hay.indexOf(n, p)) !== -1) { out.push(text.slice(Math.max(0, p - 35), Math.min(text.length, p + needle.length + 55))); p += n.length; }
    return out;
  }

  async extractText(buffer, ext) {
    try {
      if (ext === '.txt' || ext === '.log' || ext === '.csv') return buffer.toString('utf8');
      if (ext === '.pdf') return (await pdfParse(buffer)).text || '';
      if (ext === '.docx') return (await mammoth.extractRawText({ buffer })).value || '';
    } catch (error) {
      return `[text extraction failed: ${error.message}]`;
    }
    return '';
  }

  calculateEntropy(buffer) {
    if (!buffer.length) return 0;
    const freq = new Array(256).fill(0); for (const b of buffer) freq[b]++;
    return freq.reduce((e, count) => { if (!count) return e; const p = count / buffer.length; return e - p * Math.log2(p); }, 0);
  }

  detectTypeMismatch(buffer, ext) {
    if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a && !['.exe', '.dll', '.sys', '.scr'].includes(ext)) return 'PE executable header found in a non-executable extension';
    if (buffer.subarray(0, 4).toString() === '%PDF' && ext !== '.pdf') return 'PDF header found in a non-PDF extension';
    if (buffer.subarray(0, 2).toString() === 'PK' && ['.txt', '.js'].includes(ext)) return 'ZIP container header found in a text/script extension';
    return null;
  }

  getFileType(ext) {
    if (['.exe','.dll','.sys','.scr','.com','.bat','.cmd','.msi'].includes(ext)) return 'executable';
    if (ext === '.pdf') return 'pdf';
    if (['.js','.mjs','.cjs','.ts','.jsx','.tsx'].includes(ext)) return 'javascript';
    if (['.docx','.doc','.xlsx','.xls','.pptx','.ppt'].includes(ext)) return 'office';
    if (['.txt','.log','.csv'].includes(ext)) return 'text';
    if (['.zip','.7z','.rar'].includes(ext)) return 'archive';
    return 'binary';
  }

  getVerdict(score) { if (score >= 80) return 'CRITICAL'; if (score >= 50) return 'HIGH'; if (score >= 30) return 'MEDIUM'; if (score > 0) return 'LOW'; return 'CLEAN'; }
}
module.exports = new FileAnalyzer();
