// frontend/js/pages/live.js

let counters = { events: 0, alerts: 0, complete: 0 };

function bumpCounter(key) {
  counters[key] += 1;
  const map = { events: 'stat-events', alerts: 'stat-alerts', complete: 'stat-complete' };
  document.getElementById(map[key]).textContent = counters[key];
}

function logLine(level, html) {
  const log = document.getElementById('live-log');
  const row = document.createElement('div');
  row.className = 'log-line';
  row.dataset.level = level;
  const time = new Date().toLocaleTimeString('ru-RU');
  row.innerHTML = `<span class="text-muted">[${time}]</span> ${html}`;
  log.prepend(row);
  bumpCounter('events');
  // Ограничиваем ленту, чтобы не разрастался DOM
  while (log.children.length > 300) log.removeChild(log.lastChild);
}

document.addEventListener('shell:ready', () => {
  const socket = io({ withCredentials: true });
  const statusEl = document.getElementById('conn-status');

  socket.on('connect', () => { statusEl.textContent = 'подключено'; statusEl.className = 'badge badge--clean'; });
  socket.on('disconnect', () => { statusEl.textContent = 'нет соединения'; statusEl.className = 'badge badge--critical'; });

  socket.on('scan:progress', (p) => {
    logLine('info', `<b>${escapeHtml(p.stage)}</b> — ${escapeHtml(p.message)} <span class="text-muted">(${p.progress}%)</span> <span class="mono text-muted">scan:${escapeHtml(String(p.scanId)).slice(0, 12)}</span>`);
  });

  socket.on('detector:alert', (a) => {
    bumpCounter('alerts');
    logLine('warn', `⚠ Alert: <b>${escapeHtml(a.verdict || a.type || 'THRESHOLD')}</b> — ${escapeHtml(a.message || JSON.stringify(a).slice(0, 120))}`);
  });

  socket.on('scan:emulation:complete', (e) => {
    logLine('info', `Поведенческая эмуляция завершена <span class="mono text-muted">scan:${escapeHtml(String(e.scanId || '')).slice(0, 12)}</span>`);
  });

  socket.on('scan:complete', (c) => {
    bumpCounter('complete');
    logLine('error', `Скан завершён: ${verdictBadge(c.verdict)} risk=${c.riskScore} <a href="/scan-details.html?id=${c.scanId}">открыть →</a>`);
  });

  socket.on('scan:error', (e) => {
    logLine('error', `Ошибка анализа: ${escapeHtml(e.error)}`);
  });

  document.getElementById('clear-log').addEventListener('click', () => {
    document.getElementById('live-log').innerHTML = '';
    counters = { events: 0, alerts: 0, complete: 0 };
    ['stat-events', 'stat-alerts', 'stat-complete'].forEach((id) => document.getElementById(id).textContent = '0');
  });
});
