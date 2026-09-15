// frontend/js/sandbox-worker.js
// Выполняется в отдельном потоке (Web Worker) — уже без доступа к DOM
// родительской страницы. Дополнительно явно запрещаем сеть.

self.fetch = () => { throw new Error('Сетевые запросы запрещены в песочнице'); };
self.XMLHttpRequest = function () { throw new Error('Сетевые запросы запрещены в песочнице'); };
self.WebSocket = function () { throw new Error('Сетевые запросы запрещены в песочнице'); };
self.importScripts = () => { throw new Error('Загрузка внешних скриптов запрещена в песочнице'); };

const logs = [];
function pushLog(level, args) {
  const message = args.map((a) => {
    try { return typeof a === 'string' ? a : JSON.stringify(a); } catch (_) { return String(a); }
  }).join(' ');
  logs.push({ level, message });
}
self.console = {
  log: (...a) => pushLog('log', a),
  warn: (...a) => pushLog('warn', a),
  error: (...a) => pushLog('error', a),
};

self.onmessage = function (e) {
  const { code, sampleContent } = e.data;
  logs.length = 0;
  const start = performance.now();

  try {
    // Пользовательский код выполняется в строгом режиме, в отдельной функции —
    // единственный "мост" наружу — глобальная функция detect(text, bytesLength).
    // eslint-disable-next-line no-new-func
    const factory = new Function(`"use strict";\n${code}\n;return (typeof detect === 'function') ? detect : null;`);
    const detectFn = factory();

    if (typeof detectFn !== 'function') {
      throw new Error('Не найдена функция detect(text, bytesLength) — определите её в коде правила');
    }

    const raw = detectFn(sampleContent, sampleContent.length) || {};
    const durationMs = Math.round(performance.now() - start);

    self.postMessage({
      status: raw.matched ? 'match' : 'no_match',
      result: { matched: !!raw.matched, reason: String(raw.reason || ''), logs: logs.slice() },
      durationMs,
    });
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    self.postMessage({
      status: 'error',
      result: { matched: false, reason: err.message, logs: logs.slice() },
      durationMs,
    });
  }
};
