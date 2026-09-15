// frontend/js/pages/dashboard.js

function renderKpis(stats) {
  const row = document.getElementById('kpi-row');
  const v = stats.byVerdict || {};
  const items = [
    { label: 'Всего сканирований', value: stats.total, tone: null },
    { label: 'Critical', value: v.CRITICAL || 0, tone: 'critical' },
    { label: 'High', value: v.HIGH || 0, tone: 'high' },
    { label: 'Чисто', value: v.CLEAN || 0, tone: 'clean' },
  ];
  row.innerHTML = items.map((it) => `
    <div class="kpi" ${it.tone ? `data-tone="${it.tone}"` : ''}>
      <div class="kpi__label">${it.label}</div>
      <div class="kpi__value">${it.value}</div>
    </div>`).join('');
}

function renderRecentScans(scans) {
  const el = document.getElementById('recent-scans-table');
  if (!scans.length) {
    el.innerHTML = `<div class="empty-state"><div>Сканирований пока нет.</div></div>`;
    return;
  }
  el.innerHTML = `
    <table class="data-table data-table--clickable">
      <thead><tr><th>Файл</th><th>Вердикт</th><th>Risk score</th><th>Дата</th></tr></thead>
      <tbody>
        ${scans.map((s) => `
          <tr onclick="location.href='/scan-details.html?id=${s.id}'">
            <td>${escapeHtml(s.filename)}</td>
            <td>${verdictBadge(s.verdict)}</td>
            <td class="mono">${s.riskScore}</td>
            <td class="mono">${formatDate(s.createdAt)}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

async function loadDashboard() {
  try {
    const [statsRes, scansRes] = await Promise.all([
      scansApi.getStats(),
      scansApi.list({ limit: 5 }),
    ]);
    renderKpis(statsRes.data);
    renderActivityChart(document.getElementById('activity-chart'), statsRes.data.recentActivity);
    renderDistributionChart(document.getElementById('distribution-chart'), statsRes.data.scoreDistribution);
    renderRecentScans(scansRes.data);
  } catch (err) {
    showToast(extractErrorMessage(err), 'error');
  }
}

document.addEventListener('shell:ready', () => {
  loadDashboard();
  // Живое обновление при завершении нового сканирования
  if (window.io) {
    const socket = io({ withCredentials: true });
    socket.on('scan:complete', () => loadDashboard());
  }
});
