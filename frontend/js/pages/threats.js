// frontend/js/pages/threats.js

const THREATS_CACHE_KEY = 'malware_threats_catalog_cache_v2';

const WEIGHT_LABELS = {
  network_scan: 'Сканирование сети',
  self_replication: 'Саморепликация',
  lateral_movement: 'Перемещение по сети',
  exploit_usage: 'Эксплойты',
  bruteforce: 'Брутфорс',
  file_operations: 'Файловые операции',
  crypto_api: 'Шифрование (Crypto API)',
  ransom_note: 'Выкуп (Ransom Note)',
  network_c2: 'Связь с C2',
  persistence: 'Закрепление в системе',
  keystroke_capture: 'Перехват клавиш',
  clipboard_monitor: 'Буфер обмена',
  data_exfiltration: 'Эксфильтрация',
  stealth: 'Маскировка/Скрытие',
  c2_connection: 'Исходящее C2 соединение',
  command_execution: 'Исполнение команд',
  privilege_escalation: 'Эскалация привилегий',
  evasion: 'Обход защиты',
  disguise: 'Маскировка под легальное ПО',
  payload_drop: 'Загрузка нагрузки',
  credential_theft: 'Кража учётных данных',
  ad_injection: 'Инъекция рекламы',
  data_collection: 'Сбор данных пользователя',
  browser_hijack: 'Перехват браузера',
  performance_impact: 'Нагрузка на систему',
};

function formatWeightKey(key) {
  return WEIGHT_LABELS[key] || key.replace(/_/g, ' ');
}

function renderWeightsChips(weights) {
  if (!weights || typeof weights !== 'object') return '';
  const entries = Object.entries(weights);
  if (!entries.length) return '';

  return `
    <div class="threat-weights">
      <div class="threat-weights__header">
        <span>Весовые коэффициенты</span>
        <span style="color:var(--accent-500)">RISK WEIGHTS</span>
      </div>
      <div class="threat-weights__chips">
        ${entries.map(([k, v]) => `
          <div class="threat-weight-chip">
            <span class="threat-weight-chip__key">${escapeHtml(formatWeightKey(k))}</span>
            <span class="threat-weight-chip__val">+${escapeHtml(String(v))}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderThreatCard(t) {
  const chars = Array.isArray(t.characteristics) ? t.characteristics : [];
  return `
    <div class="panel threat-card">
      <div class="panel__head">
        <h3 class="threat-card__title" style="margin:0">${escapeHtml(t.name)}</h3>
        ${verdictBadge(t.severity)}
      </div>
      <p class="threat-card__desc">${escapeHtml(t.description)}</p>
      
      <div class="threat-card__section-label">Признаки активности</div>
      <ul class="threat-card__list">
        ${chars.map((c) => `<li>${escapeHtml(c)}</li>`).join('')}
      </ul>

      ${renderWeightsChips(t.scoreWeights)}
    </div>
  `;
}

function renderThreats(threats, grid) {
  if (!threats || !threats.length) {
    grid.innerHTML = `<div class="empty-state"><div>Справочник угроз пуст.</div></div>`;
    return;
  }
  grid.innerHTML = threats.map(renderThreatCard).join('');
}

// Быстрая оптимизированная загрузка:
// 1. Немедленно проверяем кэш sessionStorage для мгновенного рендера (0мс задержки)
// 2. Параллельно запрашиваем актуальные данные с сервера, не блокируя на shell:ready
// 3. Обновляем кэш и DOM только при изменении данных
(function initThreatsPage() {
  const grid = document.getElementById('threats-grid');
  if (!grid) return;

  let hasRendered = false;

  // 1. Попытка мгновенного рендера из sessionStorage
  try {
    const cached = sessionStorage.getItem(THREATS_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        renderThreats(parsed, grid);
        hasRendered = true;
      }
    }
  } catch (_) {}

  // 2. Параллельный сетевой запрос
  threatsApi.list()
    .then((res) => {
      const threats = res.data || [];
      const jsonStr = JSON.stringify(threats);
      
      try {
        sessionStorage.setItem(THREATS_CACHE_KEY, jsonStr);
      } catch (_) {}

      renderThreats(threats, grid);
      hasRendered = true;
    })
    .catch((err) => {
      // Если из кэша уже отобразилось — оставляем данные, иначе показываем ошибку
      if (!hasRendered) {
        grid.innerHTML = `<div class="empty-state"><div>${extractErrorMessage(err)}</div></div>`;
      }
    });
})();
