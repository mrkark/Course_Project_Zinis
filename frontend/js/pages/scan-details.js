// frontend/js/pages/scan-details.js

function getScanId() {
  return new URLSearchParams(location.search).get('id');
}

let allFindings = [];

function renderFindings(findings) {
  const el = document.getElementById('findings-table');
  if (!findings.length) {
    el.innerHTML = `<div class="empty-state"><div>Подозрительных сигнатур не найдено — файл выглядит чистым.</div></div>`;
    return;
  }
  el.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Категория</th><th>Описание</th><th>Совпадений</th><th>Offset</th><th>Score</th><th>Примеры</th></tr></thead>
      <tbody>
        ${findings.map((f) => `
          <tr>
            <td><span class="badge badge--neutral">${escapeHtml(f.category)}</span></td>
            <td>${escapeHtml(f.description)}</td>
            <td class="mono">${f.matches ?? 1}</td>
            <td class="mono">${f.offset ?? '—'}</td>
            <td class="mono">${f.score}</td>
            <td class="mono" style="font-size:11px">${(f.matchExamples || []).map(escapeHtml).join(', ')}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function renderEvents(events) {
  const el = document.getElementById('events-table');
  if (!events || !events.length) {
    el.innerHTML = `<div class="empty-state"><div>Поведенческих событий не зафиксировано.</div></div>`;
    return;
  }
  el.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Время</th><th>Тип</th><th>Severity</th><th>Сообщение</th></tr></thead>
      <tbody>
        ${events.map((e) => `
          <tr>
            <td class="mono">${formatDate(e.timestamp)}</td>
            <td>${escapeHtml(e.eventType)}</td>
            <td>${verdictBadge(e.severity)}</td>
            <td>${escapeHtml(e.message)}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

async function loadScan() {
  const id = getScanId();
  if (!id) { document.getElementById('scan-title').textContent = 'Скан не указан'; return; }

  try {
    const res = await scansApi.get(id);
    const scan = res.data;
    document.title = `${scan.filename} — Отчёт`;
    document.getElementById('scan-title').textContent = scan.filename;

    document.getElementById('scan-summary').innerHTML = `
      <div class="kpi"><div class="kpi__label">Вердикт</div><div class="kpi__value" style="font-size:1.1rem">${verdictBadge(scan.verdict)}</div></div>
      <div class="kpi"><div class="kpi__label">Risk score</div><div class="kpi__value">${scan.riskScore}</div></div>
      <div class="kpi"><div class="kpi__label">Размер</div><div class="kpi__value" style="font-size:1.1rem">${formatBytes(scan.fileSize)}</div></div>
      <div class="kpi"><div class="kpi__label">Дата</div><div class="kpi__value" style="font-size:1rem">${formatDate(scan.createdAt)}</div></div>
    `;

    document.getElementById('file-meta-table').innerHTML = `
      <tbody>
        <tr><td class="text-muted" style="width:160px">Имя файла</td><td>${escapeHtml(scan.filename)}</td></tr>
        <tr><td class="text-muted">Тип</td><td class="mono">${escapeHtml(scan.fileType || '—')}</td></tr>
        <tr><td class="text-muted">MIME</td><td class="mono">${escapeHtml(scan.mimeType || '—')}</td></tr>
        <tr><td class="text-muted">SHA-256</td><td class="mono">${escapeHtml(scan.fileHash)}</td></tr>
      </tbody>`;

    allFindings = scan.analysisDetails?.static?.findings || [];
    renderFindings(allFindings);
    renderEvents(scan.events);

    document.getElementById('export-json').addEventListener('click', () => {
      location.href = scansApi.exportScanUrl(scan.id, 'json');
    });
    document.getElementById('export-csv').addEventListener('click', () => {
      location.href = scansApi.exportScanUrl(scan.id, 'csv');
    });
  } catch (err) {
    document.getElementById('scan-title').textContent = 'Скан не найден';
    showToast(extractErrorMessage(err), 'error');
  }
}

document.addEventListener('shell:ready', () => {
  loadScan();
  document.getElementById('findings-search').addEventListener('input', debounce((e) => {
    const q = e.target.value.toLowerCase();
    renderFindings(allFindings.filter((f) =>
      f.category.toLowerCase().includes(q) || f.description.toLowerCase().includes(q)));
  }, 250));
});
