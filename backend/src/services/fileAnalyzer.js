// backend/src/services/fileAnalyzer.js
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const config = require('../config');

/**
 * Static file analyzer - detects suspicious patterns without executing code
 */
class FileAnalyzer {
  constructor() {
    // Подозрительные строки для разных типов файлов
    this.suspiciousPatterns = {
      // Общие паттерны для всех файлов
      general: [
        { pattern: /cmd\.exe/gi, score: 10, description: 'Command shell execution' },
        { pattern: /powershell\.exe/gi, score: 15, description: 'PowerShell execution' },
        { pattern: /eval\(/gi, score: 20, description: 'Dynamic code evaluation' },
        { pattern: /child_process/gi, score: 15, description: 'Child process spawning' },
        { pattern: /CreateRemoteThread/gi, score: 25, description: 'Remote thread creation (injection)' },
        { pattern: /WriteProcessMemory/gi, score: 25, description: 'Process memory manipulation' },
        { pattern: /VirtualAllocEx/gi, score: 20, description: 'Memory allocation in remote process' },
        { pattern: /OpenProcess/gi, score: 15, description: 'Process handle acquisition' },
        { pattern: /base64_decode/gi, score: 10, description: 'Base64 decoding (obfuscation)' },
        { pattern: /atob\(/gi, score: 10, description: 'Base64 decode in JS' },
        { pattern: /btoa\(/gi, score: 5, description: 'Base64 encode in JS' },
        { pattern: /shellcode/gi, score: 20, description: 'Shellcode reference' },
        { pattern: /metasploit/gi, score: 30, description: 'Metasploit framework reference' },
        { pattern: /mimikatz/gi, score: 30, description: 'Mimikatz credential theft tool' },
        { pattern: /cobalt\s*strike/gi, score: 30, description: 'Cobalt Strike C2 framework' },
      ],
      
      // URL и IP адреса
      network: [
        { pattern: /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi, score: 5, description: 'HTTP/URL found' },
        { pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, score: 5, description: 'IPv4 address found' },
        { pattern: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g, score: 5, description: 'IPv6 address found' },
      ],

      // Специфичные для исполняемых файлов
      executable: [
        { pattern: /URLDownloadToFile/gi, score: 20, description: 'File download via URL' },
        { pattern: /WinExec/gi, score: 15, description: 'Windows execute command' },
        { pattern: /ShellExecute/gi, score: 15, description: 'Shell execute' },
        { pattern: /CreateProcess/gi, score: 15, description: 'Process creation' },
        { pattern: /RegSetValue/gi, score: 10, description: 'Registry modification' },
        { pattern: /SetWindowsHookEx/gi, score: 20, description: 'Windows hook installation' },
        { pattern: /GetAsyncKeyState/gi, score: 20, description: 'Keystroke logging' },
        { pattern: /GetForegroundWindow/gi, score: 10, description: 'Window monitoring' },
        { pattern: /InternetOpen/gi, score: 10, description: 'Internet session initialization' },
        { pattern: /InternetConnect/gi, score: 10, description: 'Internet connection' },
        { pattern: /HttpSendRequest/gi, score: 10, description: 'HTTP request sending' },
        { pattern: /WSAStartup/gi, score: 10, description: 'Winsock initialization' },
        { pattern: /connect\(/gi, score: 10, description: 'Socket connection' },
        { pattern: /send\(/gi, score: 5, description: 'Socket data send' },
        { pattern: /recv\(/gi, score: 5, description: 'Socket data receive' },
      ],

      // Специфичные для JavaScript
      javascript: [
        { pattern: /new\s+Function\s*\(/gi, score: 20, description: 'Dynamic function creation' },
        { pattern: /WebSocket/gi, score: 10, description: 'WebSocket connection' },
        { pattern: /XMLHttpRequest/gi, score: 5, description: 'AJAX request' },
        { pattern: /fetch\(/gi, score: 5, description: 'Fetch API usage' },
        { pattern: /localStorage/gi, score: 5, description: 'Local storage access' },
        { pattern: /sessionStorage/gi, score: 5, description: 'Session storage access' },
        { pattern: /document\.cookie/gi, score: 10, description: 'Cookie access' },
        { pattern: /navigator\.sendBeacon/gi, score: 10, description: 'Beacon API (tracking)' },
        { pattern: /crypto\.subtle/gi, score: 10, description: 'Web Crypto API' },
        { pattern: /Worker\(/gi, score: 5, description: 'Web Worker creation' },
        { pattern: /importScripts/gi, score: 10, description: 'Dynamic script import in worker' },
      ],

      // Специфичные для PDF
      pdf: [
        { pattern: /\/JavaScript/gi, score: 25, description: 'Embedded JavaScript in PDF' },
        { pattern: /\/OpenAction/gi, score: 20, description: 'Auto-action on PDF open' },
        { pattern: /\/AA/gi, score: 20, description: 'Additional actions (auto-execute)' },
        { pattern: /\/Launch/gi, score: 25, description: 'Launch action (execute file)' },
        { pattern: /\/SubmitForm/gi, score: 15, description: 'Form submission action' },
        { pattern: /\/ImportData/gi, score: 15, description: 'Import data action' },
        { pattern: /\/RichMedia/gi, score: 15, description: 'Rich media content (Flash/3D)' },
        { pattern: /\/EmbeddedFile/gi, score: 15, description: 'Embedded file in PDF' },
      ],

      // Специфичные для Office документов
      office: [
        { pattern: /AutoOpen/gi, score: 20, description: 'AutoOpen macro' },
        { pattern: /AutoClose/gi, score: 15, description: 'AutoClose macro' },
        { pattern: /Document_Open/gi, score: 20, description: 'Document open event macro' },
        { pattern: /Shell/gi, score: 20, description: 'Shell command in macro' },
        { pattern: /VBA/gi, score: 10, description: 'VBA macro presence' },
        { pattern: /CreateObject/gi, score: 20, description: 'COM object creation' },
        { pattern: /WScript\.Shell/gi, score: 25, description: 'WScript Shell object' },
        { pattern: /WinHttp/gi, score: 15, description: 'WinHTTP request in macro' },
        { pattern: /XMLHTTP/gi, score: 15, description: 'XMLHTTP request in macro' },
      ],
    };

    // Расширения файлов и соответствующие категории паттернов
    this.fileTypePatterns = {
      '.exe': ['general', 'executable', 'network'],
      '.dll': ['general', 'executable', 'network'],
      '.pdf': ['general', 'pdf', 'network'],
      '.js': ['general', 'javascript', 'network'],
      '.ts': ['general', 'javascript', 'network'],
      '.txt': ['general', 'network'],
      '.docx': ['general', 'office', 'network'],
      '.doc': ['general', 'office', 'network'],
      '.xlsx': ['general', 'office', 'network'],
      '.xls': ['general', 'office', 'network'],
      '.pptx': ['general', 'office', 'network'],
      '.zip': ['general', 'network'],
      '.apk': ['general', 'network'],
    };
  }

  /**
   * Analyze a file and return analysis results
   * @param {string} filePath - Path to file
   * @param {string} originalName - Original filename
   * @param {string} mimeType - MIME type
   * @returns {Promise<Object>} Analysis results
   */
  async analyze(filePath, originalName, mimeType) {
    const buffer = await fs.readFile(filePath);
    const ext = path.extname(originalName).toLowerCase();
    const fileType = this.getFileType(ext, mimeType);
    
    const results = {
      fileInfo: {
        name: originalName,
        size: buffer.length,
        extension: ext,
        mimeType,
        fileType,
        sha256: this.calculateHash(buffer),
        entropy: this.calculateEntropy(buffer),
      },
      findings: [],
      riskScore: 0,
      verdict: 'CLEAN',
    };

    // Анализ содержимого
    const content = buffer.toString('binary');
    const patterns = this.getPatternsForFileType(ext);
    
    for (const category of patterns) {
      const categoryPatterns = this.suspiciousPatterns[category] || [];
      for (const { pattern, score, description } of categoryPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          const offset = content.search(pattern); // позиция первого совпадения в файле
          const finding = {
            category,
            pattern: pattern.source,
            description,
            score: score * matches.length,
            matches: matches.length,
            matchExamples: matches.slice(0, 3),
            offset: offset >= 0 ? offset : null,
          };
          results.findings.push(finding);
          results.riskScore += finding.score;
        }
      }
    }

    // Дополнительные проверки
    this.checkEntropy(results);
    this.checkFileTypeMismatch(results, ext, mimeType);
    this.checkSuspiciousFileName(results, originalName);

    // Определение вердикта
    results.verdict = this.getVerdict(results.riskScore);

    return results;
  }

  /**
   * Calculate SHA256 hash of buffer
   * @param {Buffer} buffer - File buffer
   * @returns {string} SHA256 hash
   */
  calculateHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Calculate Shannon entropy of buffer
   * @param {Buffer} buffer - File buffer
   * @returns {number} Entropy value (0-8)
   */
  calculateEntropy(buffer) {
    if (buffer.length === 0) return 0;
    
    const frequencies = new Array(256).fill(0);
    for (const byte of buffer) {
      frequencies[byte]++;
    }
    
    let entropy = 0;
    for (const freq of frequencies) {
      if (freq > 0) {
        const p = freq / buffer.length;
        entropy -= p * Math.log2(p);
      }
    }
    
    return parseFloat(entropy.toFixed(4));
  }

  /**
   * Get file type category
   * @param {string} ext - File extension
   * @param {string} mimeType - MIME type
   * @returns {string} File type category
   */
  getFileType(ext, mimeType) {
    if (['.exe', '.dll', '.sys', '.scr', '.com', '.bat', '.cmd', '.msi'].includes(ext)) return 'executable';
    if (['.pdf'].includes(ext)) return 'pdf';
    if (['.js', '.ts', '.jsx', '.tsx'].includes(ext)) return 'javascript';
    if (['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'].includes(ext)) return 'office';
    if (['.txt', '.log', '.csv', '.json', '.xml', '.html', '.htm'].includes(ext)) return 'text';
    if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) return 'archive';
    if (['.apk'].includes(ext)) return 'android';
    return 'unknown';
  }

  /**
   * Get pattern categories for file type
   * @param {string} ext - File extension
   * @returns {Array<string>} Pattern categories
   */
  getPatternsForFileType(ext) {
    return this.fileTypePatterns[ext] || ['general', 'network'];
  }

  /**
   * Check entropy for packed/encrypted content
   * @param {Object} results - Analysis results
   */
  checkEntropy(results) {
    const { entropy } = results.fileInfo;
    if (entropy > config.analysis.entropyThreshold) {
      results.findings.push({
        category: 'entropy',
        pattern: 'high_entropy',
        description: `High entropy detected (${entropy}), possible packing/encryption`,
        score: 15,
        matches: 1,
        matchExamples: [`Entropy: ${entropy}`],
      });
      results.riskScore += 15;
    }
  }

  /**
   * Check for file type / MIME mismatch
   * @param {Object} results - Analysis results
   * @param {string} ext - File extension
   * @param {string} mimeType - MIME type
   */
  checkFileTypeMismatch(results, ext, mimeType) {
    const expectedMimes = {
      '.exe': ['application/octet-stream', 'application/x-msdownload'],
      '.pdf': ['application/pdf'],
      '.js': ['application/javascript', 'text/javascript'],
      '.txt': ['text/plain'],
      '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    };
    
    const expected = expectedMimes[ext];
    if (expected && !expected.includes(mimeType)) {
      results.findings.push({
        category: 'mismatch',
        pattern: 'mime_extension_mismatch',
        description: `MIME type (${mimeType}) doesn't match extension (${ext})`,
        score: 10,
        matches: 1,
        matchExamples: [`Expected: ${expected.join(', ')}, Got: ${mimeType}`],
      });
      results.riskScore += 10;
    }
  }

  /**
   * Check for suspicious file names
   * @param {Object} results - Analysis results
   * @param {string} filename - Original filename
   */
  checkSuspiciousFileName(results, filename) {
    const suspiciousNames = [
      /README_DECRYPT/i,
      /DECRYPT/i,
      /RECOVER/i,
      /HOW_TO_DECRYPT/i,
      /ransom/i,
      /virus/i,
      /trojan/i,
      /malware/i,
      /exploit/i,
      /payload/i,
      /shellcode/i,
      /keylogger/i,
    ];
    
    for (const pattern of suspiciousNames) {
      if (pattern.test(filename)) {
        results.findings.push({
          category: 'filename',
          pattern: pattern.source,
          description: `Suspicious filename: ${filename}`,
          score: 20,
          matches: 1,
          matchExamples: [filename],
        });
        results.riskScore += 20;
        break;
      }
    }
  }

  /**
   * Determine verdict based on risk score
   * @param {number} score - Risk score
   * @returns {string} Verdict
   */
  getVerdict(score) {
    const { critical, high, medium } = config.analysis.riskScores;
    if (score >= critical) return 'CRITICAL';
    if (score >= high) return 'HIGH';
    if (score >= medium) return 'MEDIUM';
    if (score > 0) return 'LOW';
    return 'CLEAN';
  }
}

module.exports = new FileAnalyzer();