// frontend/js/pages/upload.js

let selectedFile = null;

function renderResult(data) {
  const panel = document.getElementById('result-panel');
  const fileInfo = data.fileInfo || {};
  const findings = data.scan?.analysisDetails?.static?.findings || [];
  const verdict = data.verdict || data.result?.verdict;
  const riskScore = data.riskScore ?? data.result?.riskScore ?? 0;

  panel.innerHTML = `
    <div class="panel" style="margin-bottom:20px">
      <div class="panel__head">
        <h2>Результат анализа</h2>
        ${verdictBadge(verdict)}
      </div>
      <div class="grid grid--kpi" style="margin-bottom:16px">
        <div class="kpi"><div class="kpi__label">Risk score</div><div class="kpi__value">${riskScore}</div></div>
        <div class="kpi"><div class="kpi__label">Размер файла</div><div class="kpi__value" style="font-size:1.1rem">${formatBytes(fileInfo.size)}</div></div>
        <div class="kpi"><div class="kpi__label">Тип файла</div><div class="kpi__value" style="font-size:1.1rem">${escapeHtml(fileInfo.fileType || '—')}</div></div>
        <div class="kpi"><div class="kpi__label">Найдено сигнатур</div><div class="kpi__value">${findings.length}</div></div>
      </div>
      <table class="data-table">
        <tbody>
          <tr><td class="text-muted" style="width:160px">Имя файла</td><td>${escapeHtml(fileInfo.name)}</td></tr>
          <tr><td class="text-muted">SHA-256</td><td class="mono">${escapeHtml(fileInfo.sha256 || '—')}</td></tr>
        </tbody>
      </table>
      ${data.scan?.id ? `<div style="margin-top:14px"><a class="btn btn--primary btn--sm" href="/scan-details.html?id=${data.scan.id}">Открыть детальный отчёт →</a></div>` : ''}
    </div>

    <div class="panel">
      <div class="panel__head"><h2>Найденные сигнатуры (кратко)</h2></div>
      ${findings.length === 0 ? '<div class="empty-state"><div>Подозрительных сигнатур не найдено.</div></div>' : `
      <table class="data-table">
        <thead><tr><th>Категория</th><th>Описание</th><th>Совпадений</th><th>Offset</th><th>Score</th></tr></thead>
        <tbody>
          ${findings.slice(0, 15).map((f) => `
            <tr>
              <td>${escapeHtml(f.category)}</td>
              <td>${escapeHtml(f.description)}</td>
              <td class="mono">${f.matches ?? 1}</td>
              <td class="mono">${f.offset ?? '—'}</td>
              <td class="mono">${f.score}</td>
            </tr>`).join('')}
        </tbody>
      </table>`}
    </div>
  `;
}

function setupDropzone() {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const selectedBox = document.getElementById('selected-file');
  const nameEl = document.getElementById('selected-file-name');

  dropzone.addEventListener('click', () => fileInput.click());
  ['dragenter', 'dragover'].forEach((evt) => dropzone.addEventListener(evt, (e) => {
    e.preventDefault(); dropzone.classList.add('is-dragover');
  }));
  ['dragleave', 'drop'].forEach((evt) => dropzone.addEventListener(evt, (e) => {
    e.preventDefault(); dropzone.classList.remove('is-dragover');
  }));
  dropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files[0]) pickFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) pickFile(fileInput.files[0]);
  });

  function pickFile(file) {
    selectedFile = file;
    nameEl.textContent = `${file.name} · ${formatBytes(file.size)}`;
    selectedBox.classList.remove('hidden');
    document.getElementById('result-panel').innerHTML = '';
  }
}

async function loadUploadConfig() {
  const hint = document.getElementById('dropzone-hint');
  try {
    const res = await uploadApi.getConfig();
    hint.textContent = `Допустимые типы: ${res.allowedExtensions.join(', ')} · до ${formatBytes(res.maxFileSize)}`;
  } catch (_) {
    hint.textContent = 'Не удалось загрузить ограничения загрузки.';
  }
}

function setupScanButton() {
  const btn = document.getElementById('scan-btn');
  const progressWrap = document.getElementById('upload-progress');
  const progressBar = document.getElementById('upload-progress-bar');
  const statusEl = document.getElementById('upload-status');

  btn.addEventListener('click', async () => {
    if (!selectedFile) return;
    btn.disabled = true;
    progressWrap.classList.remove('hidden');
    progressBar.style.width = '0%';
    statusEl.textContent = 'Загрузка файла на сервер…';

    try {
      const res = await uploadApi.upload(selectedFile, (pct) => {
        progressBar.style.width = pct + '%';
        if (pct >= 100) statusEl.textContent = 'Файл загружен. Выполняется статический и поведенческий анализ…';
      });
      statusEl.textContent = 'Анализ завершён.';
      renderResult(res.data);
      showToast('Файл проанализирован', 'success');
    } catch (err) {
      statusEl.textContent = '';
      showToast(extractErrorMessage(err), 'error');
    } finally {
      btn.disabled = false;
    }
  });
}

document.addEventListener('shell:ready', () => {
  setupDropzone();
  setupScanButton();
  loadUploadConfig();
});
