// frontend/js/pages/history.js

const state = { limit: 20, offset: 0, total: 0, pendingDeleteId: null };

function currentFilters() {
  return {
    search: document.getElementById('f-search').value.trim(),
    verdict: document.getElementById('f-verdict').value,
    dateFrom: document.getElementById('f-from').value,
    dateTo: document.getElementById('f-to').value,
  };
}

function renderTable(scans) {
  const el = document.getElementById('history-table');
  if (!scans.length) {
    el.innerHTML = `<div class="empty-state"><div>Ничего не найдено по заданным фильтрам.</div></div>`;
    return;
  }
  el.innerHTML = `
    <table class="data-table data-table--clickable">
      <thead><tr><th>Файл</th><th>Тип</th><th>Размер</th><th>Вердикт</th><th>Score</th><th>Дата</th><th></th></tr></thead>
      <tbody>
        ${scans.map((s) => `
          <tr data-id="${s.id}">
            <td class="js-open">${escapeHtml(s.filename)}</td>
            <td class="js-open mono">${escapeHtml(s.fileType || '—')}</td>
            <td class="js-open mono">${formatBytes(s.fileSize)}</td>
            <td class="js-open">${verdictBadge(s.verdict)}</td>
            <td class="js-open mono">${s.riskScore}</td>
            <td class="js-open mono">${formatDate(s.createdAt)}</td>
            <td><button class="btn btn--ghost btn--sm js-delete" data-id="${s.id}">Удалить</button></td>
          </tr>`).join('')}
      </tbody>
    </table>`;

  el.querySelectorAll('.js-open').forEach((cell) => {
    cell.addEventListener('click', () => {
      location.href = `/scan-details.html?id=${cell.parentElement.dataset.id}`;
    });
  });
  el.querySelectorAll('.js-delete').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.pendingDeleteId = btn.dataset.id;
      document.getElementById('delete-modal').classList.remove('hidden');
    });
  });
}

async function loadHistory() {
  try {
    const res = await scansApi.list({ ...currentFilters(), limit: state.limit, offset: state.offset });
    state.total = res.pagination.total;
    renderTable(res.data);
    const page = Math.floor(state.offset / state.limit) + 1;
    const pages = Math.max(1, Math.ceil(state.total / state.limit));
    document.getElementById('page-indicator').textContent = `${page} / ${pages}`;
    document.getElementById('history-count').textContent = `Всего: ${state.total}`;
    document.getElementById('prev-page').disabled = state.offset === 0;
    document.getElementById('next-page').disabled = state.offset + state.limit >= state.total;
  } catch (err) {
    showToast(extractErrorMessage(err), 'error');
  }
}

document.addEventListener('shell:ready', () => {
  loadHistory();

  const debouncedReload = debounce(() => { state.offset = 0; loadHistory(); }, 350);
  ['f-search', 'f-verdict', 'f-from', 'f-to'].forEach((id) => {
    document.getElementById(id).addEventListener('input', debouncedReload);
    document.getElementById(id).addEventListener('change', debouncedReload);
  });

  document.getElementById('prev-page').addEventListener('click', () => {
    state.offset = Math.max(0, state.offset - state.limit);
    loadHistory();
  });
  document.getElementById('next-page').addEventListener('click', () => {
    state.offset += state.limit;
    loadHistory();
  });

  document.getElementById('export-json').addEventListener('click', () => {
    location.href = scansApi.exportListUrl({ ...currentFilters(), format: 'json' });
  });
  document.getElementById('export-csv').addEventListener('click', () => {
    location.href = scansApi.exportListUrl({ ...currentFilters(), format: 'csv' });
  });

  document.getElementById('cancel-delete').addEventListener('click', () => {
    document.getElementById('delete-modal').classList.add('hidden');
    state.pendingDeleteId = null;
  });
  document.getElementById('confirm-delete').addEventListener('click', async () => {
    try {
      await scansApi.delete(state.pendingDeleteId);
      showToast('Скан удалён', 'success');
      loadHistory();
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      document.getElementById('delete-modal').classList.add('hidden');
      state.pendingDeleteId = null;
    }
  });
});
