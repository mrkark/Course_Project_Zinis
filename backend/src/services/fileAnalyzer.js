// backend/src/services/fileAnalyzer.js
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const config = require('../config');

/**
 * Static file analyzer - detects suspicious patterns and extracts
 * execution indicators from file content for the behavioral emulator.
 */
class FileAnalyzer {
  constructor() {
    // Подозрительные строки для разных типов файлов
    this.suspiciousPatterns = {
      // Общие паттерны для всех файлов
      general: [
        { pattern: /cmd\.exe/gi, score: 10, description: 'Command shell execution', tag: 'command_execution' },
        { pattern: /powershell\.exe/gi, score: 15, description: 'PowerShell execution', tag: 'command_execution' },
        { pattern: /eval\(/gi, score: 20, description: 'Dynamic code evaluation', tag: 'code_execution' },
        { pattern: /child_process/gi, score: 15, description: 'Child process spawning', tag: 'process_creation' },
        { pattern: /CreateRemoteThread/gi, score: 25, description: 'Remote thread creation (injection)', tag: 'process_injection' },
        { pattern: /WriteProcessMemory/gi, score: 25, description: 'Process memory manipulation', tag: 'process_injection' },
        { pattern: /VirtualAllocEx/gi, score: 20, description: 'Memory allocation in remote process', tag: 'process_injection' },
        { pattern: /OpenProcess/gi, score: 15, description: 'Process handle acquisition', tag: 'process_injection' },
        { pattern: /base64_decode/gi, score: 10, description: 'Base64 decoding (obfuscation)', tag: 'obfuscation' },
        { pattern: /atob\(/gi, score: 10, description: 'Base64 decode in JS', tag: 'obfuscation' },
        { pattern: /btoa\(/gi, score: 5, description: 'Base64 encode in JS', tag: 'obfuscation' },
        { pattern: /shellcode/gi, score: 20, description: 'Shellcode reference', tag: 'code_execution' },
        { pattern: /metasploit/gi, score: 30, description: 'Metasploit framework reference', tag: 'known_tool' },
        { pattern: /mimikatz/gi, score: 30, description: 'Mimikatz credential theft tool', tag: 'known_tool' },
        { pattern: /cobalt\s*strike/gi, score: 30, description: 'Cobalt Strike C2 framework', tag: 'known_tool' },
        { pattern: /eternalblue|exploit/gi, score: 25, description: 'Exploit / EternalBlue worm signature', tag: 'exploit' },
        { pattern: /adware|ad_inject|popunder/gi, score: 10, description: 'Adware and unwanted software pattern', tag: 'adware' },
      ],
      
      // URL и IP адреса
      network: [
        { pattern: /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi, score: 5, description: 'HTTP/URL found', tag: 'network' },
        { pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, score: 5, description: 'IPv4 address found', tag: 'network' },
        { pattern: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g, score: 5, description: 'IPv6 address found', tag: 'network' },
      ],

      // Специфичные для исполняемых файлов
      executable: [
        { pattern: /URLDownloadToFile/gi, score: 20, description: 'File download via URL', tag: 'network' },
        { pattern: /WinExec/gi, score: 15, description: 'Windows execute command', tag: 'command_execution' },
        { pattern: /ShellExecute/gi, score: 15, description: 'Shell execute', tag: 'command_execution' },
        { pattern: /CreateProcess/gi, score: 15, description: 'Process creation', tag: 'process_creation' },
        { pattern: /RegSetValue/gi, score: 10, description: 'Registry modification', tag: 'registry' },
        { pattern: /SetWindowsHookEx/gi, score: 20, description: 'Windows hook installation', tag: 'keylogging' },
        { pattern: /GetAsyncKeyState/gi, score: 20, description: 'Keystroke logging', tag: 'keylogging' },
        { pattern: /GetForegroundWindow/gi, score: 10, description: 'Window monitoring', tag: 'keylogging' },
        { pattern: /InternetOpen/gi, score: 10, description: 'Internet session initialization', tag: 'network' },
        { pattern: /InternetConnect/gi, score: 10, description: 'Internet connection', tag: 'network' },
        { pattern: /HttpSendRequest/gi, score: 10, description: 'HTTP request sending', tag: 'network' },
        { pattern: /WSAStartup/gi, score: 10, description: 'Winsock initialization', tag: 'network' },
        { pattern: /connect\(/gi, score: 10, description: 'Socket connection', tag: 'network' },
        { pattern: /send\(/gi, score: 5, description: 'Socket data send', tag: 'network' },
        { pattern: /recv\(/gi, score: 5, description: 'Socket data receive', tag: 'network' },
      ],

      // Специфичные для JavaScript
      javascript: [
        { pattern: /new\s+Function\s*\(/gi, score: 20, description: 'Dynamic function creation', tag: 'code_execution' },
        { pattern: /WebSocket/gi, score: 10, description: 'WebSocket connection', tag: 'network' },
        { pattern: /XMLHttpRequest/gi, score: 5, description: 'AJAX request', tag: 'network' },
        { pattern: /fetch\(/gi, score: 5, description: 'Fetch API usage', tag: 'network' },
        { pattern: /localStorage/gi, score: 5, description: 'Local storage access', tag: 'data_access' },
        { pattern: /sessionStorage/gi, score: 5, description: 'Session storage access', tag: 'data_access' },
        { pattern: /document\.cookie/gi, score: 10, description: 'Cookie access', tag: 'data_access' },
        { pattern: /navigator\.sendBeacon/gi, score: 10, description: 'Beacon API (tracking)', tag: 'exfiltration' },
        { pattern: /crypto\.subtle/gi, score: 10, description: 'Web Crypto API', tag: 'crypto' },
        { pattern: /Worker\(/gi, score: 5, description: 'Web Worker creation', tag: 'code_execution' },
        { pattern: /importScripts/gi, score: 10, description: 'Dynamic script import in worker', tag: 'code_execution' },
      ],

      // Специфичные для PDF
      pdf: [
        { pattern: /\/JavaScript/gi, score: 25, description: 'Embedded JavaScript in PDF', tag: 'code_execution' },
        { pattern: /\/OpenAction/gi, score: 20, description: 'Auto-action on PDF open', tag: 'code_execution' },
        { pattern: /\/AA/gi, score: 20, description: 'Additional actions (auto-execute)', tag: 'code_execution' },
        { pattern: /\/Launch/gi, score: 25, description: 'Launch action (execute file)', tag: 'command_execution' },
        { pattern: /\/SubmitForm/gi, score: 15, description: 'Form submission action', tag: 'exfiltration' },
        { pattern: /\/ImportData/gi, score: 15, description: 'Import data action', tag: 'data_access' },
        { pattern: /\/RichMedia/gi, score: 15, description: 'Rich media content (Flash/3D)', tag: 'code_execution' },
        { pattern: /\/EmbeddedFile/gi, score: 15, description: 'Embedded file in PDF', tag: 'code_execution' },
      ],

      // Специфичные для Office документов
      office: [
        { pattern: /AutoOpen/gi, score: 20, description: 'AutoOpen macro', tag: 'code_execution' },
        { pattern: /AutoClose/gi, score: 15, description: 'AutoClose macro', tag: 'code_execution' },
        { pattern: /Document_Open/gi, score: 20, description: 'Document open event macro', tag: 'code_execution' },
        { pattern: /Shell/gi, score: 20, description: 'Shell command in macro', tag: 'command_execution' },
        { pattern: /VBA/gi, score: 10, description: 'VBA macro presence', tag: 'code_execution' },
        { pattern: /CreateObject/gi, score: 20, description: 'COM object creation', tag: 'code_execution' },
        { pattern: /WScript\.Shell/gi, score: 25, description: 'WScript Shell object', tag: 'command_execution' },
        { pattern: /WinHttp/gi, score: 15, description: 'WinHTTP request in macro', tag: 'network' },
        { pattern: /XMLHTTP/gi, score: 15, description: 'XMLHTTP request in macro', tag: 'network' },
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

    // Известные сигнатуры упаковщиков/протекторов (hex-строки в заголовке PE)
    this.packerSignatures = [
      { name: 'UPX', pattern: Buffer.from('UPX!'), score: 15 },
      { name: 'ASPack', pattern: Buffer.from('.aspack'), score: 15 },
      { name: 'Themida', pattern: Buffer.from('.themida'), score: 20 },
      { name: 'VMProtect', pattern: Buffer.from('.vmp0'), score: 20 },
      { name: 'PECompact', pattern: Buffer.from('PEC2'), score: 15 },
    ];
  }

  /**
   * Analyze a file and return analysis results with extracted indicators
   * @param {string} filePath - Path to file
   * @param {string} originalName - Original filename
   * @param {string} mimeType - MIME type
   * @returns {Promise<Object>} Analysis results including indicators for emulator
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
      indicators: null, // заполняется ниже — структурированные IOC для эмулятора
    };

    // Анализ содержимого
    const content = buffer.toString('binary');
    const patterns = this.getPatternsForFileType(ext);
    
    for (const category of patterns) {
      const categoryPatterns = this.suspiciousPatterns[category] || [];
      for (const { pattern, score, description, tag } of categoryPatterns) {
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
            tag,
          };
          results.findings.push(finding);
          results.riskScore += finding.score;
        }
      }
    }

    // Дополнительные проверки структуры файла
    this.checkPEHeader(buffer, results);
    this.checkObfuscation(content, results);
    this.checkEntropy(results);

    // Извлечение индикаторов для поведенческой эмуляции
    results.indicators = this.extractIndicators(content, results.findings);

    // Определение вердикта
    results.verdict = this.getVerdict(results.riskScore);

    return results;
  }

  /**
   * Extract structured indicators from file content for the behavioral emulator.
   * These indicators drive the sandbox emulation — the emulator generates events
   * based on what was actually found in the file.
   * @param {string} content - File content as string
   * @param {Array} findings - Pattern match findings
   * @returns {Object} Structured indicators
   */
  extractIndicators(content, findings) {
    const indicators = {
      urls: [],
      ipAddresses: [],
      filePaths: [],
      registryKeys: [],
      commands: [],
      apiCalls: [],       // сгруппированные по тегам найденные API/функции
      tags: new Set(),     // агрегированные теги из findings для быстрого определения поведения
    };

    // URLs
    const urlMatches = content.match(/https?:\/\/[^\s<>"{}|\\^`\[\]]{4,200}/gi) || [];
    indicators.urls = [...new Set(urlMatches)].slice(0, 10);

    // IP-адреса (исключаем localhost, broadcast, нулевые)
    const ipMatches = content.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) || [];
    indicators.ipAddresses = [...new Set(ipMatches)]
      .filter(ip => !ip.startsWith('127.') && !ip.startsWith('0.') && ip !== '255.255.255.255' && ip !== '0.0.0.0')
      .slice(0, 10);

    // Пути к файлам Windows
    const pathMatches = content.match(/[A-Z]:\\[\w\\. -]{3,120}/gi) || [];
    indicators.filePaths = [...new Set(pathMatches)].slice(0, 10);

    // Ключи реестра
    const regMatches = content.match(/HK(?:EY_LOCAL_MACHINE|EY_CURRENT_USER|LM|CU)\\[\w\\. -]{3,120}/gi) || [];
    indicators.registryKeys = [...new Set(regMatches)].slice(0, 10);

    // Команды (cmd, powershell, wscript и т.д.)
    const cmdMatches = content.match(/(?:cmd(?:\.exe)?|powershell(?:\.exe)?|wscript(?:\.exe)?|cscript(?:\.exe)?|mshta(?:\.exe)?)\s+[^\n\r]{1,200}/gi) || [];
    indicators.commands = [...new Set(cmdMatches)].slice(0, 8);

    // Агрегация тегов и API-вызовов из findings
    const apiByTag = {};
    for (const f of findings) {
      if (f.tag) {
        indicators.tags.add(f.tag);
        if (!apiByTag[f.tag]) apiByTag[f.tag] = [];
        apiByTag[f.tag].push(f.description);
      }
    }
    indicators.apiCalls = apiByTag;

    // Конвертируем Set в массив для сериализации
    indicators.tags = [...indicators.tags];

    return indicators;
  }

  /**
   * Check PE header for executables: validate MZ/PE signature,
   * detect known packers/protectors.
   * @param {Buffer} buffer - File buffer
   * @param {Object} results - Analysis results (mutated)
   */
  checkPEHeader(buffer, results) {
    const { fileType } = results.fileInfo;
    if (fileType !== 'executable' || buffer.length < 64) return;

    // Проверка MZ-заголовка
    const mzSignature = buffer.slice(0, 2).toString('ascii');
    if (mzSignature !== 'MZ') return; // не PE-файл, пропускаем

    // Поиск сигнатур упаковщиков
    for (const packer of this.packerSignatures) {
      if (buffer.includes(packer.pattern)) {
        results.findings.push({
          category: 'packer',
          pattern: packer.name,
          description: `Обнаружен упаковщик/протектор: ${packer.name}`,
          score: packer.score,
          matches: 1,
          matchExamples: [packer.name],
          offset: buffer.indexOf(packer.pattern),
          tag: 'obfuscation',
        });
        results.riskScore += packer.score;
      }
    }

    // Проверка количества секций (аномально мало или много — подозрительно)
    try {
      const peOffset = buffer.readUInt32LE(0x3C);
      if (peOffset + 6 < buffer.length) {
        const peSignature = buffer.slice(peOffset, peOffset + 4).toString('ascii');
        if (peSignature === 'PE\x00\x00') {
          const sectionCount = buffer.readUInt16LE(peOffset + 6);
          if (sectionCount > 15) {
            results.findings.push({
              category: 'structure',
              pattern: 'unusual_section_count',
              description: `Аномальное количество секций PE: ${sectionCount} (типично 3–8)`,
              score: 10,
              matches: 1,
              matchExamples: [`Sections: ${sectionCount}`],
              offset: peOffset + 6,
              tag: 'obfuscation',
            });
            results.riskScore += 10;
          }
        }
      }
    } catch (_) {
      // Повреждённый PE-заголовок — не критично
    }
  }

  /**
   * Check for obfuscation techniques: long unbroken strings (encoded payloads),
   * excessive hex/escape sequences, suspicious encoding patterns.
   * @param {string} content - File content
   * @param {Object} results - Analysis results (mutated)
   */
  checkObfuscation(content, results) {
    // Длинные строки без пробелов (>500 символов) — типичный признак
    // закодированного payload (base64, hex, shellcode)
    const longUnbroken = content.match(/[^\s]{500,}/g);
    if (longUnbroken && longUnbroken.length > 0) {
      results.findings.push({
        category: 'obfuscation',
        pattern: 'long_encoded_string',
        description: `Обнаружены длинные непрерывные строки (${longUnbroken.length} шт., до ${longUnbroken[0].length} симв.) — возможный закодированный payload`,
        score: 10,
        matches: longUnbroken.length,
        matchExamples: [longUnbroken[0].slice(0, 60) + '...'],
        offset: content.indexOf(longUnbroken[0]),
        tag: 'obfuscation',
      });
      results.riskScore += 10;
    }

    // Массивные hex-последовательности (\x41\x42..., 0x41, 0x42...)
    const hexSequences = content.match(/(?:\\x[0-9a-fA-F]{2}){8,}/g);
    if (hexSequences && hexSequences.length > 0) {
      results.findings.push({
        category: 'obfuscation',
        pattern: 'hex_encoded_payload',
        description: `Hex-encoded данные (${hexSequences.length} блоков) — возможный shellcode или зашифрованный payload`,
        score: 15,
        matches: hexSequences.length,
        matchExamples: [hexSequences[0].slice(0, 60) + '...'],
        offset: content.indexOf(hexSequences[0]),
        tag: 'obfuscation',
      });
      results.riskScore += 15;
    }

    // Множественная конкатенация строк — примитивная обфускация
    // (например: "p"+"o"+"w"+"e"+"r"+"s"+"h"+"e"+"l"+"l")
    const charConcat = content.match(/(?:["'][a-zA-Z]?["']\s*\+\s*){6,}/g);
    if (charConcat && charConcat.length > 0) {
      results.findings.push({
        category: 'obfuscation',
        pattern: 'string_concatenation_obfuscation',
        description: `Обфускация конкатенацией строк (${charConcat.length} фрагментов)`,
        score: 10,
        matches: charConcat.length,
        matchExamples: [charConcat[0].slice(0, 60) + '...'],
        offset: content.indexOf(charConcat[0]),
        tag: 'obfuscation',
      });
      results.riskScore += 10;
    }
  }

  /**
   * Check entropy — вспомогательный индикатор.
   * Высокая энтропия сама по себе не является угрозой, но в сочетании
   * с исполняемым типом файла указывает на вероятную упаковку.
   * @param {Object} results - Analysis results
   */
  checkEntropy(results) {
    const { entropy, fileType } = results.fileInfo;
    // Срабатывает только для исполняемых и скриптовых файлов с порогом 7.2
    const execTypes = ['executable', 'javascript'];
    if (entropy > 7.2 && execTypes.includes(fileType)) {
      results.findings.push({
        category: 'structure',
        pattern: 'high_entropy',
        description: `Повышенная энтропия (${entropy}) для типа ${fileType} — возможна упаковка`,
        score: 5,
        matches: 1,
        matchExamples: [`Entropy: ${entropy}`],
        tag: 'obfuscation',
      });
      results.riskScore += 5;
    }
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