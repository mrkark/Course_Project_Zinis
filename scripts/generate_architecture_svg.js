const fs = require('fs');
const path = require('path');

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1180 560" width="100%" height="auto">
  <defs>
    <!-- Background Gradients -->
    <linearGradient id="bgG" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#040711"/>
      <stop offset="50%" stop-color="#070c18"/>
      <stop offset="100%" stop-color="#050813"/>
    </linearGradient>

    <!-- Column Gradients -->
    <linearGradient id="tierClient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#08162b"/>
      <stop offset="100%" stop-color="#050d1a"/>
    </linearGradient>
    <linearGradient id="tierGateway" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#061e22"/>
      <stop offset="100%" stop-color="#041215"/>
    </linearGradient>
    <linearGradient id="tierEngine" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#12132e"/>
      <stop offset="100%" stop-color="#0a0b1c"/>
    </linearGradient>
    <linearGradient id="tierDB" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1c1408"/>
      <stop offset="100%" stop-color="#0f0b04"/>
    </linearGradient>

    <!-- Card Backgrounds -->
    <linearGradient id="cardClient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a1c36"/>
      <stop offset="100%" stop-color="#071426"/>
    </linearGradient>
    <linearGradient id="cardGateway" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#062529"/>
      <stop offset="100%" stop-color="#04181a"/>
    </linearGradient>
    <linearGradient id="cardEngine" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#16193d"/>
      <stop offset="100%" stop-color="#0e1026"/>
    </linearGradient>
    <linearGradient id="cardDB" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#211807"/>
      <stop offset="100%" stop-color="#140f04"/>
    </linearGradient>

    <!-- Risk Badge Gradient -->
    <linearGradient id="riskGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="35%" stop-color="#38bdf8"/>
      <stop offset="65%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#ef4444"/>
    </linearGradient>

    <!-- Drop Shadow / Glow Filters -->
    <filter id="glowBlue" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="glowTeal" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <style>
    .title-tag { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11px; font-weight: 800; letter-spacing: 2px; }
    .main-title { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 19px; font-weight: 900; }
    .sub-title  { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11.5px; fill: #64748b; }
    .col-header { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; font-weight: 800; letter-spacing: 1px; }
    .col-badge  { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 9.5px; font-weight: 700; }
    .card-title { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11.5px; font-weight: 700; }
    .card-desc  { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 10px; fill: #94a3b8; }
    .pipe-tag   { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 8.5px; font-weight: 700; }
  </style>

  <!-- Outer Canvas Box -->
  <rect width="1180" height="560" rx="12" fill="url(#bgG)" stroke="#1a273a" stroke-width="1.5"/>

  <!-- Subtle Grid Accent -->
  <g opacity="0.07" stroke="#38bdf8" stroke-width="0.75">
    <line x1="30" y1="120" x2="1150" y2="120"/>
    <line x1="30" y1="200" x2="1150" y2="200"/>
    <line x1="30" y1="280" x2="1150" y2="280"/>
    <line x1="30" y1="360" x2="1150" y2="360"/>
    <line x1="30" y1="440" x2="1150" y2="440"/>
    <line x1="300" y1="80" x2="300" y2="530"/>
    <line x1="580" y1="80" x2="580" y2="530"/>
    <line x1="870" y1="80" x2="870" y2="530"/>
  </g>

  <!-- Top Header Section -->
  <g transform="translate(32, 22)">
    <!-- Cyan HUD Pill -->
    <rect width="280" height="20" rx="4" fill="#0369a1" fill-opacity="0.2" stroke="#0284c7" stroke-width="1"/>
    <text x="10" y="14" class="title-tag" fill="#38bdf8">🛡️ HIGH-SECURITY SANDBOX PLATFORM</text>
    
    <text x="0" y="44" class="main-title" fill="#ffffff">Трёхуровневая архитектура и сквозной конвейер анализа ВПО</text>
    <text x="0" y="60" class="sub-title">Анализ файлов в реальном времени • Изоляция в Worker • Поведенческая эмуляция 6 классов угроз • MS SQL Server</text>
  </g>

  <!-- ========================================================================= -->
  <!-- COLUMN 1: CLIENT TIER (HUD BROWSER)                                       -->
  <!-- ========================================================================= -->
  <g transform="translate(30, 92)">
    <!-- Column Background -->
    <rect width="250" height="448" rx="8" fill="url(#tierClient)" stroke="#0284c7" stroke-width="1.5"/>
    <rect width="250" height="34" rx="8" fill="#0369a1" fill-opacity="0.25"/>
    <text x="12" y="22" class="col-header" fill="#38bdf8">🖥️ КЛИЕНТ • WEB HUD</text>
    <rect x="175" y="8" width="65" height="18" rx="3" fill="#075985" stroke="#0284c7" stroke-width="0.8"/>
    <text x="180" y="20" class="col-badge" fill="#e0f2fe">Vanilla JS</text>

    <!-- Item 1: Cyber HUD UI -->
    <g transform="translate(10, 44)">
      <rect width="230" height="52" rx="5" fill="url(#cardClient)" stroke="#1e3a5f" stroke-width="1"/>
      <circle cx="16" cy="18" r="4" fill="#38bdf8"/>
      <text x="26" y="21" class="card-title" fill="#e0f2fe">Cyber HUD Dashboard</text>
      <text x="12" y="36" class="card-desc">Аналитическая панель, KPI карточки</text>
      <text x="12" y="46" class="card-desc">Интерактивные SVG-графики и фильтры</text>
    </g>

    <!-- Item 2: Drag-and-Drop Uploader -->
    <g transform="translate(10, 104)">
      <rect width="230" height="52" rx="5" fill="url(#cardClient)" stroke="#1e3a5f" stroke-width="1"/>
      <circle cx="16" cy="18" r="4" fill="#06b6d4"/>
      <text x="26" y="21" class="card-title" fill="#e0f2fe">Модуль загрузки файлов</text>
      <text x="12" y="36" class="card-desc">Drag-and-Drop интерфейс, лимит 10MB</text>
      <text x="12" y="46" class="card-desc">MIME-валидация и индикация статуса</text>
    </g>

    <!-- Item 3: Live Terminal Stream -->
    <g transform="translate(10, 164)">
      <rect width="230" height="52" rx="5" fill="url(#cardClient)" stroke="#1e3a5f" stroke-width="1"/>
      <circle cx="16" cy="18" r="4" fill="#22c55e"/>
      <text x="26" y="21" class="card-title" fill="#86efac">Live Security Terminal</text>
      <text x="12" y="36" class="card-desc">Потоковый вывод Socket.IO событий</text>
      <text x="12" y="46" class="card-desc">Инспекция шагов атаки в реальном времени</text>
    </g>

    <!-- Item 4: Threat Library Cache -->
    <g transform="translate(10, 224)">
      <rect width="230" height="52" rx="5" fill="url(#cardClient)" stroke="#1e3a5f" stroke-width="1"/>
      <circle cx="16" cy="18" r="4" fill="#f59e0b"/>
      <text x="26" y="21" class="card-title" fill="#fef08a">Справочник угроз (0ms)</text>
      <text x="12" y="36" class="card-desc">Кэширование в sessionStorage</text>
      <text x="12" y="46" class="card-desc">Весовые шкалы и формулы Risk Score</text>
    </g>

    <!-- Item 5: Web Worker Sandbox (Highlighted) -->
    <g transform="translate(10, 284)">
      <rect width="230" height="152" rx="6" fill="#130e26" stroke="#9333ea" stroke-width="1.3"/>
      <rect width="230" height="26" rx="6" fill="#6b21a8" fill-opacity="0.25"/>
      <text x="12" y="17" class="card-title" fill="#e9d5ff">🔒 Web Worker Sandbox</text>
      <rect x="165" y="5" width="55" height="16" rx="3" fill="#581c87"/>
      <text x="171" y="16" class="pipe-tag" fill="#f3e8ff">Изоляция</text>

      <text x="12" y="42" class="card-desc" fill="#d8b4fe">• Отдельный поток sandbox-worker.js</text>
      <text x="12" y="57" class="card-desc" fill="#d8b4fe">• Нулевой доступ: без window, DOM, fetch</text>
      <text x="12" y="72" class="card-desc" fill="#d8b4fe">• Защитный таймаут выполнения (3000 мс)</text>
      <text x="12" y="87" class="card-desc" fill="#d8b4fe">• Safe eval с перехватом crash/loops</text>
      
      <!-- Mini inner box for user rule execution -->
      <rect x="10" y="98" width="210" height="42" rx="4" fill="#0b0817" stroke="#7e22ce" stroke-width="0.8"/>
      <text x="16" y="113" class="pipe-tag" fill="#c084fc">JS Code Editor (Пользовательские правила)</text>
      <text x="16" y="128" class="pipe-tag" fill="#a855f7">POST /api/sandbox/runs → Аудит в БД</text>
    </g>
  </g>

  <!-- Connectors Client -> Gateway -->
  <g stroke="#38bdf8" stroke-width="1.3" fill="none">
    <!-- Pipe 1: Upload -->
    <path d="M 280 220 L 315 220" stroke-dasharray="3 3"/>
    <polygon points="318,220 311,216 311,224" fill="#38bdf8"/>

    <!-- Pipe 2: Socket.IO bi-dir -->
    <path d="M 280 280 L 315 280"/>
    <polygon points="318,280 311,276 311,284" fill="#38bdf8"/>
    <polygon points="280,280 287,276 287,284" fill="#38bdf8"/>

    <!-- Pipe 3: REST & Auth -->
    <path d="M 280 155 L 315 155" stroke-dasharray="3 3"/>
    <polygon points="318,155 311,151 311,159" fill="#38bdf8"/>
  </g>

  <!-- ========================================================================= -->
  <!-- COLUMN 2: API GATEWAY & AUTH (EXPRESS)                                    -->
  <!-- ========================================================================= -->
  <g transform="translate(320, 92)">
    <!-- Column Background -->
    <rect width="250" height="448" rx="8" fill="url(#tierGateway)" stroke="#0d9488" stroke-width="1.5"/>
    <rect width="250" height="34" rx="8" fill="#0f766e" fill-opacity="0.25"/>
    <text x="12" y="22" class="col-header" fill="#2dd4bf">🌐 СЕТЕВОЙ ШЛЮЗ • API</text>
    <rect x="175" y="8" width="65" height="18" rx="3" fill="#115e59" stroke="#0d9488" stroke-width="0.8"/>
    <text x="180" y="20" class="col-badge" fill="#ccfbf1">Express 4</text>

    <!-- Item 1: JWT & RBAC -->
    <g transform="translate(10, 44)">
      <rect width="230" height="68" rx="5" fill="url(#cardGateway)" stroke="#115e59" stroke-width="1"/>
      <text x="12" y="20" class="card-title" fill="#5eead4">🛡️ JWT Guard &amp; RBAC</text>
      <text x="12" y="36" class="card-desc">HttpOnly Cookies, CSRF/XSS защита</text>
      <text x="12" y="49" class="card-desc">Роли: admin (управление, аудит) и user</text>
      <text x="12" y="61" class="pipe-tag" fill="#14b8a6">/api/auth/login, /api/auth/me</text>
    </g>

    <!-- Item 2: Multer File Receiver -->
    <g transform="translate(10, 120)">
      <rect width="230" height="68" rx="5" fill="url(#cardGateway)" stroke="#115e59" stroke-width="1"/>
      <text x="12" y="20" class="card-title" fill="#5eead4">📥 Multer Upload Handler</text>
      <text x="12" y="36" class="card-desc">Потоковый приём файлов (до 10 МБ)</text>
      <text x="12" y="49" class="card-desc">Проверка magic-bytes и MIME-типа</text>
      <text x="12" y="61" class="pipe-tag" fill="#14b8a6">POST /api/upload (Multipart)</text>
    </g>

    <!-- Item 3: Socket.IO Server -->
    <g transform="translate(10, 196)">
      <rect width="230" height="76" rx="5" fill="url(#cardGateway)" stroke="#115e59" stroke-width="1"/>
      <text x="12" y="20" class="card-title" fill="#2dd4bf">🔌 Socket.IO Server Engine</text>
      <text x="12" y="36" class="card-desc">Изолированные комнаты сканирования</text>
      <text x="12" y="49" class="card-desc">События: scan:join, analysis:event</text>
      <text x="12" y="62" class="card-desc">detector:alert при превышении порогов</text>
      <text x="12" y="73" class="pipe-tag" fill="#14b8a6">Двусторонний Full-Duplex канал</text>
    </g>

    <!-- Item 4: Static Host & Cache -->
    <g transform="translate(10, 280)">
      <rect width="230" height="52" rx="5" fill="url(#cardGateway)" stroke="#115e59" stroke-width="1"/>
      <text x="12" y="20" class="card-title" fill="#5eead4">📁 Static Web Server</text>
      <text x="12" y="35" class="card-desc">Отдача статики: HTML5, CSS, SVG, JS</text>
      <text x="12" y="46" class="card-desc">E-Tag и Cache-Control заголовки</text>
    </g>

    <!-- Item 5: REST API Controller -->
    <g transform="translate(10, 340)">
      <rect width="230" height="96" rx="5" fill="url(#cardGateway)" stroke="#115e59" stroke-width="1"/>
      <text x="12" y="20" class="card-title" fill="#5eead4">📡 REST API Controllers</text>
      <text x="12" y="36" class="card-desc">• /api/scans — выборка, фильтры, экспорт</text>
      <text x="12" y="50" class="card-desc">• /api/threats — справочник с кэшем</text>
      <text x="12" y="64" class="card-desc">• /api/admin/users — RBAC управление</text>
      <text x="12" y="78" class="card-desc">• /api/sandbox/runs — логирование песочницы</text>
    </g>
  </g>

  <!-- Connectors Gateway -> Engine -->
  <g stroke="#2dd4bf" stroke-width="1.3" fill="none">
    <path d="M 570 230 L 605 230"/>
    <polygon points="608,230 601,226 601,234" fill="#2dd4bf"/>

    <path d="M 605 320 L 570 320" stroke-dasharray="3 3"/>
    <polygon points="567,320 574,316 574,324" fill="#2dd4bf"/>
  </g>

  <!-- ========================================================================= -->
  <!-- COLUMN 3: DETECTION CORE & SCANSERVICE                                    -->
  <!-- ========================================================================= -->
  <g transform="translate(610, 92)">
    <!-- Column Background -->
    <rect width="260" height="448" rx="8" fill="url(#tierEngine)" stroke="#6366f1" stroke-width="1.5"/>
    <rect width="260" height="34" rx="8" fill="#4338ca" fill-opacity="0.25"/>
    <text x="12" y="22" class="col-header" fill="#a5b4fc">⚙️ ЯДРО ДЕТЕКЦИИ • SCANSERVICE</text>
    <rect x="185" y="8" width="65" height="18" rx="3" fill="#3730a3" stroke="#6366f1" stroke-width="0.8"/>
    <text x="194" y="20" class="col-badge" fill="#e0e7ff">Pipeline</text>

    <!-- ScanService Orchestrator Header Box -->
    <g transform="translate(10, 44)">
      <rect width="240" height="44" rx="5" fill="url(#cardEngine)" stroke="#4f46e5" stroke-width="1.2"/>
      <text x="12" y="19" class="card-title" fill="#c7d2fe">🎯 ScanService Orchestrator</text>
      <text x="12" y="34" class="card-desc">Синхронизация этапов анализа и агрегация риска</text>
    </g>

    <!-- Pipeline Step 1: Static Analyzer -->
    <g transform="translate(10, 96)">
      <rect width="240" height="88" rx="5" fill="#0f162e" stroke="#3b82f6" stroke-width="1"/>
      <rect x="0" y="0" width="4" height="88" fill="#3b82f6" rx="2"/>
      <text x="14" y="19" class="card-title" fill="#93c5fd">1️⃣ Статический анализатор</text>
      <text x="14" y="35" class="card-desc">• SHA-256 цифровой отпечаток (хэш)</text>
      <text x="14" y="50" class="card-desc">• Энтропия Шеннона (упаковка, обфускация)</text>
      <text x="14" y="65" class="card-desc">• Сигнатурный поиск подозрительных строк</text>
      <text x="14" y="79" class="card-desc">• Детекция вредоносных IP, доменов, URL</text>
    </g>

    <!-- Pipeline Step 2: Behavioral Emulator -->
    <g transform="translate(10, 192)">
      <rect width="240" height="96" rx="5" fill="#1a1426" stroke="#f59e0b" stroke-width="1"/>
      <rect x="0" y="0" width="4" height="96" fill="#f59e0b" rx="2"/>
      <text x="14" y="19" class="card-title" fill="#fde68a">2️⃣ Поведенческий эмулятор</text>
      <text x="14" y="35" class="card-desc">• 6 профилей: Ransomware, Worm, Trojan,</text>
      <text x="14" y="49" class="card-desc">  Keylogger, Backdoor, Adware/Spyware</text>
      <text x="14" y="64" class="card-desc">• Генерация телеметрии файловых операций</text>
      <text x="14" y="78" class="card-desc">• Перехват попыток внедрения в реестр</text>
      <text x="14" y="91" class="pipe-tag" fill="#fbbf24">Push событий в Socket.IO в процессе</text>
    </g>

    <!-- Pipeline Step 3: Risk Score Engine -->
    <g transform="translate(10, 296)">
      <rect width="240" height="140" rx="5" fill="#1f1124" stroke="#ec4899" stroke-width="1"/>
      <rect x="0" y="0" width="4" height="140" fill="#ec4899" rx="2"/>
      <text x="14" y="19" class="card-title" fill="#fbcfe8">3️⃣ Risk Score Engine (0 - 100)</text>
      <text x="14" y="34" class="card-desc">Взвешенная сумма сработавших эвристик:</text>
      
      <!-- Gradient Scale Bar -->
      <rect x="14" y="42" width="212" height="8" rx="4" fill="url(#riskGrad)"/>
      
      <!-- Verdict Pills -->
      <g transform="translate(14, 58)">
        <rect width="102" height="18" rx="3" fill="#064e3b" stroke="#10b981" stroke-width="0.8"/>
        <text x="6" y="13" class="pipe-tag" fill="#a7f3d0">CLEAN / LOW (0-29)</text>
      </g>
      <g transform="translate(124, 58)">
        <rect width="102" height="18" rx="3" fill="#78350f" stroke="#f59e0b" stroke-width="0.8"/>
        <text x="6" y="13" class="pipe-tag" fill="#fde68a">MEDIUM (30-49)</text>
      </g>
      <g transform="translate(14, 82)">
        <rect width="102" height="18" rx="3" fill="#7c2d12" stroke="#ea580c" stroke-width="0.8"/>
        <text x="6" y="13" class="pipe-tag" fill="#fdba74">HIGH (50-79)</text>
      </g>
      <g transform="translate(124, 82)">
        <rect width="102" height="18" rx="3" fill="#4c0519" stroke="#ef4444" stroke-width="0.8"/>
        <text x="6" y="13" class="pipe-tag" fill="#fecaca">CRITICAL (80-100)</text>
      </g>

      <text x="14" y="117" class="card-desc" fill="#fda4af">Автоматическая генерация вердикта безопасности</text>
      <text x="14" y="131" class="pipe-tag" fill="#f43f5e">Формирование детального JSON-отчёта</text>
    </g>
  </g>

  <!-- Connectors Engine -> Database -->
  <g stroke="#f59e0b" stroke-width="1.3" fill="none">
    <path d="M 870 200 L 905 200"/>
    <polygon points="908,200 901,196 901,204" fill="#f59e0b"/>

    <path d="M 905 320 L 870 320" stroke-dasharray="3 3"/>
    <polygon points="867,320 874,316 874,324" fill="#f59e0b"/>
  </g>

  <!-- ========================================================================= -->
  <!-- COLUMN 4: DATABASE TIER (MICROSOFT SQL SERVER)                            -->
  <!-- ========================================================================= -->
  <g transform="translate(910, 92)">
    <!-- Column Background -->
    <rect width="240" height="448" rx="8" fill="url(#tierDB)" stroke="#d97706" stroke-width="1.5"/>
    <rect width="240" height="34" rx="8" fill="#b45309" fill-opacity="0.25"/>
    <text x="12" y="22" class="col-header" fill="#fbbf24">🗄️ СУБД • MS SQL SERVER</text>
    <rect x="165" y="8" width="65" height="18" rx="3" fill="#78350f" stroke="#d97706" stroke-width="0.8"/>
    <text x="175" y="20" class="col-badge" fill="#fef3c7">T-SQL</text>

    <!-- Table 1: dbo.Scans -->
    <g transform="translate(10, 44)">
      <rect width="220" height="66" rx="5" fill="url(#cardDB)" stroke="#b45309" stroke-width="1"/>
      <text x="12" y="19" class="card-title" fill="#fde047">📋 dbo.Scans</text>
      <text x="12" y="34" class="card-desc">Хэши SHA-256, вердикты, Risk Score</text>
      <text x="12" y="47" class="card-desc">Время анализа, user_id (FK)</text>
      <text x="12" y="59" class="pipe-tag" fill="#d97706">sp_CreateScan, sp_GetScanById</text>
    </g>

    <!-- Table 2: dbo.ScanEvents -->
    <g transform="translate(10, 118)">
      <rect width="220" height="66" rx="5" fill="url(#cardDB)" stroke="#b45309" stroke-width="1"/>
      <text x="12" y="19" class="card-title" fill="#fde047">📜 dbo.ScanEvents</text>
      <text x="12" y="34" class="card-desc">Хронологический журнал эмуляции</text>
      <text x="12" y="47" class="card-desc">Тип события, важность, полезная нагрузка</text>
      <text x="12" y="59" class="pipe-tag" fill="#d97706">sp_SaveScanEvents (Bulk Insert)</text>
    </g>

    <!-- Table 3: dbo.Threats -->
    <g transform="translate(10, 192)">
      <rect width="220" height="66" rx="5" fill="url(#cardDB)" stroke="#b45309" stroke-width="1"/>
      <text x="12" y="19" class="card-title" fill="#fde047">📚 dbo.Threats</text>
      <text x="12" y="34" class="card-desc">Матрица 6 классов угроз и весовые шкалы</text>
      <text x="12" y="47" class="card-desc">Параметры сигнатурного сопоставления</text>
      <text x="12" y="59" class="pipe-tag" fill="#d97706">sp_GetAllThreats (Серверный кэш)</text>
    </g>

    <!-- Table 4: dbo.Users -->
    <g transform="translate(10, 266)">
      <rect width="220" height="66" rx="5" fill="url(#cardDB)" stroke="#b45309" stroke-width="1"/>
      <text x="12" y="19" class="card-title" fill="#fde047">👤 dbo.Users</text>
      <text x="12" y="34" class="card-desc">Учётные записи аналитиков</text>
      <text x="12" y="47" class="card-desc">Хэши паролей bcrypt, роли, флаги блокировки</text>
      <text x="12" y="59" class="pipe-tag" fill="#d97706">sp_CreateUser, sp_GetUserByEmail</text>
    </g>

    <!-- Table 5: dbo.SandboxRuns -->
    <g transform="translate(10, 340)">
      <rect width="220" height="96" rx="5" fill="url(#cardDB)" stroke="#b45309" stroke-width="1"/>
      <text x="12" y="19" class="card-title" fill="#fde047">🧪 dbo.SandboxRuns</text>
      <text x="12" y="34" class="card-desc">Аудит запуска JS-правил песочницы</text>
      <text x="12" y="47" class="card-desc">Исходный код, статус, время работы</text>
      <text x="12" y="60" class="card-desc">Возвращённый результат / стек ошибки</text>
      <text x="12" y="74" class="pipe-tag" fill="#d97706">INSERT INTO SandboxRuns (user_id FK)</text>
    </g>
  </g>
</svg>`;

const outputPath = path.join(__dirname, '..', 'docs', 'images', 'architecture.svg');
fs.writeFileSync(outputPath, svgContent, 'utf8');
console.log('✅ Generated architecture.svg successfully at:', outputPath);
