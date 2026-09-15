// frontend/js/pages/threats.js

document.addEventListener('shell:ready', async () => {
  const grid = document.getElementById('threats-grid');
  try {
    const res = await threatsApi.list();
    const threats = res.data;
    if (!threats.length) {
      grid.innerHTML = `<div class="empty-state"><div>Справочник угроз пуст.</div></div>`;
      return;
    }
    grid.innerHTML = threats.map((t) => `
      <div class="panel">
        <div class="panel__head">
          <h3 style="margin:0">${escapeHtml(t.name)}</h3>
          ${verdictBadge(t.severity)}
        </div>
        <p style="font-size:13px">${escapeHtml(t.description)}</p>
        <div class="text-muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Признаки</div>
        <ul style="display:flex;flex-direction:column;gap:4px;margin-bottom:10px">
          ${(t.characteristics || []).map((c) => `<li style="font-size:12px;color:var(--text-secondary)">• ${escapeHtml(c)}</li>`).join('')}
        </ul>
        <div class="mono text-muted" style="font-size:11px">weights: ${escapeHtml(JSON.stringify(t.scoreWeights))}</div>
      </div>`).join('');
  } catch (err) {
    grid.innerHTML = `<div class="empty-state"><div>${extractErrorMessage(err)}</div></div>`;
  }
});
