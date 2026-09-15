// frontend/js/charts.js
// Лёгкие SVG-графики без внешних библиотек (замена Recharts).

const VERDICT_COLOR_VAR = {
  clean: '--verdict-clean',
  low: '--verdict-low',
  medium: '--verdict-medium',
  high: '--verdict-high',
  critical: '--verdict-critical',
};

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function chartTooltip() {
  let tip = document.querySelector('.chart-tooltip');
  if (!tip) {
    tip = document.createElement('div');
    tip.className = 'chart-tooltip';
    Object.assign(tip.style, {
      position: 'fixed', pointerEvents: 'none', zIndex: 300,
      background: cssVar('--surface-3'), border: `1px solid ${cssVar('--border-strong')}`,
      borderRadius: '4px', padding: '8px 10px', fontSize: '12px',
      fontFamily: cssVar('--font-mono'), color: cssVar('--text-primary'),
      display: 'none', maxWidth: '220px', boxShadow: '0 6px 18px rgba(0,0,0,.4)',
    });
    document.body.appendChild(tip);
  }
  return tip;
}

function showTip(evt, html) {
  const tip = chartTooltip();
  tip.innerHTML = html;
  tip.style.display = 'block';
  tip.style.left = `${evt.clientX + 14}px`;
  tip.style.top = `${evt.clientY + 14}px`;
}
function hideTip() { const tip = document.querySelector('.chart-tooltip'); if (tip) tip.style.display = 'none'; }

/**
 * Столбчатый график активности за 30 дней с разбивкой по вердиктам (стек).
 * data: [{ date, clean, low, medium, high, critical, total }]
 */
function renderActivityChart(container, data) {
  container.innerHTML = '';

  const hasAny = data.some((d) => d.total > 0);
  if (!hasAny) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19V6M10 19V10M16 19V4M22 19H2"/></svg>
        <div>За последние 30 дней сканирований не было.</div>
        <div class="text-muted" style="font-size:12px">График появится, как только будет обработан первый файл.</div>
      </div>`;
    return;
  }

  const width = container.clientWidth || 640;
  const height = 220;
  const padL = 34, padB = 22, padT = 10, padR = 6;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const maxTotal = Math.max(1, ...data.map((d) => d.total));
  const barGap = 3;
  const barW = plotW / data.length - barGap;

  const layers = ['clean', 'low', 'medium', 'high', 'critical'];

  let bars = '';
  data.forEach((d, i) => {
    let yCursor = plotH;
    const x = padL + i * (barW + barGap);
    layers.forEach((layer) => {
      const val = d[layer] || 0;
      if (val === 0) return;
      const h = (val / maxTotal) * plotH;
      yCursor -= h;
      const color = cssVar(VERDICT_COLOR_VAR[layer]);
      bars += `<rect class="activity-bar" data-idx="${i}" x="${x.toFixed(1)}" y="${(padT + yCursor).toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" fill="${color}" rx="1"></rect>`;
    });
    if (d.total === 0) {
      bars += `<rect class="activity-bar" data-idx="${i}" x="${x.toFixed(1)}" y="${(padT + plotH - 2).toFixed(1)}" width="${barW.toFixed(1)}" height="2" fill="${cssVar('--border-strong')}"></rect>`;
    }
  });

  // Ось X: подпись каждые ~5 дней
  let xLabels = '';
  data.forEach((d, i) => {
    if (i % 5 !== 0 && i !== data.length - 1) return;
    const x = padL + i * (barW + barGap) + barW / 2;
    xLabels += `<text x="${x.toFixed(1)}" y="${height - 4}" font-size="10" fill="${cssVar('--text-muted')}" text-anchor="middle" font-family="${cssVar('--font-mono')}">${formatDateShort(d.date)}</text>`;
  });

  // Сетка/ось Y
  const gridLines = [0, 0.5, 1].map((f) => {
    const y = padT + plotH - f * plotH;
    return `<line x1="${padL}" x2="${width - padR}" y1="${y}" y2="${y}" stroke="${cssVar('--border-subtle')}" stroke-dasharray="2,3"/>
            <text x="${padL - 6}" y="${y + 3}" font-size="10" text-anchor="end" fill="${cssVar('--text-muted')}">${Math.round(f * maxTotal)}</text>`;
  }).join('');

  container.innerHTML = `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" style="overflow:visible">${gridLines}${bars}${xLabels}</svg>`;

  container.querySelectorAll('.activity-bar').forEach((rect) => {
    rect.addEventListener('mousemove', (evt) => {
      const d = data[Number(rect.dataset.idx)];
      showTip(evt, `<b>${formatDate(d.date).split(',')[0]}</b><br>
        Всего: ${d.total}<br>
        Critical: ${d.critical} · High: ${d.high}<br>
        Medium: ${d.medium} · Low: ${d.low} · Clean: ${d.clean}`);
    });
    rect.addEventListener('mouseleave', hideTip);
  });
}

/**
 * Горизонтальные бары распределения risk score.
 * data: [{ range, count }]
 */
function renderDistributionChart(container, data) {
  container.innerHTML = '';
  const total = data.reduce((s, d) => s + Number(d.count || 0), 0);
  if (!total) {
    container.innerHTML = `<div class="empty-state" style="padding:32px"><div class="text-muted">Пока нет данных для распределения.</div></div>`;
    return;
  }
  const colorByRange = { CRITICAL: 'critical', HIGH: 'high', MEDIUM: 'medium', 'LOW/CLEAN': 'low' };
  const max = Math.max(...data.map((d) => Number(d.count) || 0), 1);

  container.innerHTML = data.map((d) => {
    const pct = (Number(d.count) / max) * 100;
    const colorVar = VERDICT_COLOR_VAR[colorByRange[d.range]] || '--accent-500';
    return `
      <div class="flex-row" style="margin-bottom:10px">
        <div style="width:84px;font-size:12px;color:var(--text-secondary)">${d.range}</div>
        <div style="flex:1;background:var(--surface-inset);border-radius:3px;height:10px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:var(${colorVar})"></div>
        </div>
        <div style="width:32px;text-align:right;font-size:12px;font-family:var(--font-mono);color:var(--text-secondary)">${d.count}</div>
      </div>`;
  }).join('');
}
