// frontend/js/pages/sandbox.js

const DEFAULT_RULE = `// Правило детектирования: реализуйте функцию detect(text, bytesLength).
// text — содержимое тестового образца (строка), bytesLength — его длина.
// Верните { matched: boolean, reason: string }.
function detect(text, bytesLength) {
  const suspicious = /cmd\\.exe|powershell\\.exe|CreateRemoteThread|eval\\(/i;
  const found = suspicious.test(text);
  console.log('Проверено байт:', bytesLength);
  return {
    matched: found,
    reason: found ? 'Обнаружена подозрительная сигнатура' : 'Совпадений не найдено',
  };
}`;

let samples = [];

function runInWorker(code, sampleContent, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const worker = new Worker('/js/sandbox-worker.js');
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      worker.terminate();
      resolve({
        status: 'timeout',
        result: { matched: false, reason: `Превышен лимит времени выполнения (${timeoutMs} мс)`, logs: [] },
        durationMs: timeoutMs,
      });
    }, timeoutMs);

    worker.onmessage = (e) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate();
      resolve(e.data);
    };
    worker.onerror = (e) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate();
      resolve({ status: 'error', result: { matched: false, reason: e.message, logs: [] }, durationMs: 0 });
    };

    worker.postMessage({ code, sampleContent });
  });
}

function renderRunResult({ status, result, durationMs }) {
  const box = document.getElementById('run-result');
  box.classList.remove('hidden');

  const badgeClass = { match: 'critical', no_match: 'clean', error: 'high', timeout: 'medium' }[status] || 'neutral';
  const badgeLabel = { match: 'Совпадение', no_match: 'Нет совпадения', error: 'Ошибка', timeout: 'Таймаут' }[status];
  document.getElementById('run-status-badge').innerHTML = `<span class="badge badge--${badgeClass}">${badgeLabel}</span>`;
  document.getElementById('run-duration').textContent = `${durationMs} мс`;
  document.getElementById('run-reason').textContent = result.reason || '';

  const log = document.getElementById('run-log');
  if (!result.logs || !result.logs.length) {
    log.innerHTML = '<span class="text-muted">Нет вывода console.log из правила.</span>';
  } else {
    log.innerHTML = result.logs.map((l) => `<div class="log-line" data-level="${l.level}">${escapeHtml(l.message)}</div>`).join('');
  }
}

function renderSamplePreview() {
  const select = document.getElementById('sample-select');
  const sample = samples.find((s) => s.name === select.value);
  document.getElementById('sample-preview').value = sample ? sample.content : '';
}

async function loadSamples() {
  const select = document.getElementById('sample-select');
  try {
    const res = await sandboxApi.samples();
    samples = res.data;
    select.innerHTML = samples.map((s) => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)} (${formatBytes(s.size)})</option>`).join('');
    renderSamplePreview();
  } catch (err) {
    showToast(extractErrorMessage(err), 'error');
  }
}

function renderHistory(runs) {
  const el = document.getElementById('history-runs');
  if (!runs.length) {
    el.innerHTML = `<div class="empty-state"><div>Вы ещё не запускали правил.</div></div>`;
    return;
  }
  const badgeClass = { match: 'critical', no_match: 'clean', error: 'high', timeout: 'medium' };
  const badgeLabel = { match: 'Совпадение', no_match: 'Нет совпадения', error: 'Ошибка', timeout: 'Таймаут' };
  el.innerHTML = `
    <table class="data-table data-table--clickable">
      <thead><tr><th>Образец</th><th>Статус</th><th>Время</th><th>Дата</th></tr></thead>
      <tbody>
        ${runs.map((r) => `
          <tr data-id="${r.id}">
            <td class="mono">${escapeHtml(r.sampleName)}</td>
            <td><span class="badge badge--${badgeClass[r.status] || 'neutral'}">${badgeLabel[r.status] || r.status}</span></td>
            <td class="mono">${r.durationMs} мс</td>
            <td class="mono">${formatDate(r.createdAt)}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;

  el.querySelectorAll('tr[data-id]').forEach((row) => {
    row.addEventListener('click', () => {
      const run = runs.find((r) => String(r.id) === row.dataset.id);
      if (run) {
        document.getElementById('rule-code').value = run.ruleCode;
        showToast('Код правила загружен из истории', 'default');
      }
    });
  });
}

async function loadHistory() {
  try {
    const res = await sandboxApi.runs();
    renderHistory(res.data);
  } catch (err) {
    document.getElementById('history-runs').innerHTML = `<div class="empty-state"><div>${extractErrorMessage(err)}</div></div>`;
  }
}

document.addEventListener('shell:ready', () => {
  document.getElementById('rule-code').value = DEFAULT_RULE;
  loadSamples();
  loadHistory();

  document.getElementById('sample-select').addEventListener('change', renderSamplePreview);

  document.getElementById('run-btn').addEventListener('click', async () => {
    const code = document.getElementById('rule-code').value;
    const sampleName = document.getElementById('sample-select').value;
    const sample = samples.find((s) => s.name === sampleName);
    if (!sample) { showToast('Выберите тестовый образец', 'error'); return; }

    const btn = document.getElementById('run-btn');
    btn.disabled = true;
    btn.textContent = 'Выполняется…';

    const outcome = await runInWorker(code, sample.content);
    renderRunResult(outcome);

    btn.disabled = false;
    btn.textContent = '▶ Запустить';

    try {
      await sandboxApi.saveRun({
        sampleName,
        ruleCode: code,
        status: outcome.status,
        result: outcome.result,
        durationMs: outcome.durationMs,
      });
      loadHistory();
    } catch (err) {
      showToast('Не удалось сохранить историю: ' + extractErrorMessage(err), 'error');
    }
  });

  document.getElementById('add-sample-btn').addEventListener('click', async () => {
    const name = document.getElementById('new-sample-name').value.trim();
    const content = document.getElementById('new-sample-content').value;
    if (!name || !content) { showToast('Укажите имя и содержимое образца', 'error'); return; }
    try {
      await sandboxApi.createSample(name, content);
      document.getElementById('new-sample-name').value = '';
      document.getElementById('new-sample-content').value = '';
      showToast('Образец добавлен', 'success');
      loadSamples();
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    }
  });
});
