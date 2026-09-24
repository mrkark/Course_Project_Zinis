<p align="center">
  <img src="docs/images/banner.svg" alt="Malware Sandbox Platform Banner" width="100%">
</p>

<p align="center">
  <a href="#-технологический-стек"><img src="https://img.shields.io/badge/Node.js-18%2B-22c55e?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js"></a>
  <a href="#-технологический-стек"><img src="https://img.shields.io/badge/Express-4.19-22d3ee?style=for-the-badge&logo=express&logoColor=white" alt="Express"></a>
  <a href="#-технологический-стек"><img src="https://img.shields.io/badge/MSSQL-2019%2B-f59e0b?style=for-the-badge&logo=microsoftsqlserver&logoColor=white" alt="MSSQL"></a>
  <a href="#-технологический-стек"><img src="https://img.shields.io/badge/Socket.IO-4.7-a855f7?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket.IO"></a>
  <a href="#-технологический-стек"><img src="https://img.shields.io/badge/UI-Cyber_HUD-38bdf8?style=for-the-badge" alt="Cyber HUD"></a>
</p>

---

## 📌 О проекте

**Malware Sandbox Platform** — учебно-исследовательская платформа моделирования вредоносного поведения, статического сигнатурного анализа и вычисления комплексного показателя риска (**Risk Score**) для подозрительных файлов.

> [!IMPORTANT]
> **Это демонстрационная и учебная система.**  
> Вредоносный код **НЕ исполняется** в операционной системе сервера. Платформа анализирует структуру файла, ищет подозрительные маркеры и **симулирует поведение** различных классов вредоносного ПО (Ransomware, Worm, Trojan, Keylogger, Backdoor, Adware), генерируя потоки телеметрии в реальном времени через WebSockets.

---

## 🖥️ Интерфейс и возможности

<p align="center">
  <img src="docs/images/dashboard_preview.svg" alt="Dashboard & Live Monitoring Preview" width="100%">
</p>

### Ключевые возможности:
* **Интерактивный дашборд:** KPI-сводка по вердиктам, график активности сканирований за 30 дней с автоматическим zero-fill дней, круговая диаграмма распределения угроз.
* **Статический анализ:** Подсчёт энтропии Шеннона, вычисление хэша SHA-256, эвристический поиск опасных API-функций, адресов C&C, сетевых команд и шелл-скриптов.
* **Поведенческая эмуляция (Live):** Трансляция событий жизненного цикла вредоноса в реальном времени через Socket.IO в стилизованный терминал.
* **Изолированная песочница правил:** Запуск пользовательских правил детекции на JavaScript в браузере через изолированный `Web Worker` с перехватом сетевых API и таймаутом выполнения 3 секунды.
* **Справочник угроз (Threat Library):** Оптимизированный каталог типов угроз с кэшированием `0ms` (Stale-While-Revalidate в `sessionStorage`) и детальными чипами весовых коэффициентов.
* **Аутентификация и роли (RBAC):** Защищённые JWT-cookie (HttpOnly), разграничение доступа для `user` (только свои сканы) и `admin` (управление пользователями, серверный монитор, доступ ко всем данным).

---

## 📐 Архитектура системы

<p align="center">
  <img src="docs/images/architecture.svg" alt="System Architecture Diagram" width="100%">
</p>

Платформа построена по трёхуровневой клиент-серверной архитектуре:

```mermaid
flowchart TD
    classDef clientLayer fill:#071322,stroke:#0284c7,stroke-width:1.5px,color:#e0f2fe;
    classDef gatewayLayer fill:#08182b,stroke:#0d9488,stroke-width:1.5px,color:#ccfbf1;
    classDef engineLayer fill:#16192e,stroke:#6366f1,stroke-width:1.5px,color:#e0e7ff;
    classDef dbLayer fill:#1c1322,stroke:#d97706,stroke-width:1.5px,color:#fef3c7;
    classDef workerLayer fill:#1a1025,stroke:#a855f7,stroke-width:1.5px,color:#f3e8ff;
    classDef alertRed fill:#3b0712,stroke:#ef4444,stroke-width:2px,color:#fecaca;
    classDef alertGreen fill:#052e16,stroke:#22c55e,stroke-width:2px,color:#dcfce7;

    subgraph CLIENT["🖥️ КЛИЕНТСКИЙ УРОВЕНЬ (Cyber HUD • Vanilla JS)"]
        direction LR
        UI_DASH["📊 Дашборд &amp; История<br/><i>(KPI, SVG-графики, фильтры)</i>"]:::clientLayer
        UI_UPLOAD["📤 Загрузка файлов<br/><i>(Drag-and-Drop, прогресс)</i>"]:::clientLayer
        UI_LIVE["⚡ Live-мониторинг<br/><i>(Терминал потока событий)</i>"]:::clientLayer
        UI_THREATS["📚 Справочник угроз<br/><i>(0ms Stale-While-Revalidate)</i>"]:::clientLayer
        
        subgraph SANDBOX_ENV["🔒 Изолированная среда песочницы"]
            WORKER["⚙️ Web Worker Sandbox<br/><i>(Safe Sandbox, без DOM/Net API, 3s Timeout)</i>"]:::workerLayer
            EDITOR["📝 JS Code Editor<br/><i>(Пользовательские правила)</i>"]:::workerLayer
            EDITOR -->|Потокобезопасный запуск| WORKER
        end
    end

    subgraph GATEWAY["🌐 СЕТЕВОЙ ШЛЮЗ &amp; АВТОРИЗАЦИЯ (Express API)"]
        direction LR
        AUTH_MW["🛡️ JWT Auth Guard<br/><i>(HttpOnly Cookie, RBAC: admin/user)</i>"]:::gatewayLayer
        STATIC_SRV["📁 Static Host<br/><i>(HTML, CSS, JS, Assets)</i>"]:::gatewayLayer
        UPLOAD_EP["📥 Multer Upload Handler<br/><i>(MIME-валидация, лимит 10MB)</i>"]:::gatewayLayer
        SOCKET_SRV["🔌 Socket.IO Server<br/><i>(Комнаты сканирования, телеметрия)</i>"]:::gatewayLayer
    end

    subgraph BACKEND["⚙️ СЕРВЕРНЫЙ КОМПЛЕКС АНАЛИЗА (ScanService)"]
        direction TB
        SCAN_SVC["🎯 ScanService Orchestrator<br/><i>(Координация пайплайна проверки)</i>"]:::engineLayer

        subgraph PIPELINE["🔬 Двухэтапный конвейер детекции"]
            direction LR
            ANALYZER["1️⃣ Статический анализатор<br/><i>• Энтропия Шеннона<br/>• SHA-256 хэширование<br/>• Поиск опасных сигнатур &amp; URL</i>"]:::engineLayer
            EMULATOR["2️⃣ Поведенческий эмулятор<br/><i>• Ransomware, Worm, Trojan<br/>• Keylogger, Backdoor, Adware<br/>• Симуляция шагов атаки</i>"]:::engineLayer
        end

        DETECTOR["⚖️ Risk Score Engine<br/><i>(Взвешенная сумма эвристик: 0 - 100)</i>"]:::engineLayer
        
        subgraph VERDICTS["🎯 Вердикт безопасности"]
            direction LR
            V_CLEAN["CLEAN / LOW<br/>(0 - 29 баллов)"]:::alertGreen
            V_MED["MEDIUM / HIGH<br/>(30 - 79 баллов)"]:::engineLayer
            V_CRIT["CRITICAL<br/>(80 - 100 баллов)"]:::alertRed
        end
    end

    subgraph DATABASE["🗄️ СЛОЙ ХРАНЕНИЯ ДАННЫХ (Microsoft SQL Server)"]
        direction TB
        DB_SCANS[("📋 dbo.Scans<br/><i>Результаты, хэши, вердикты, user_id</i>")]:::dbLayer
        DB_EVENTS[("📜 dbo.ScanEvents<br/><i>Потоковые телеметрические логи</i>")]:::dbLayer
        DB_THREATS[("📚 dbo.Threats<br/><i>Матрица угроз и весовые шкалы</i>")]:::dbLayer
        DB_USERS[("👤 dbo.Users<br/><i>Учётные записи, роли, блокировки</i>")]:::dbLayer
        DB_RUNS[("🧪 dbo.SandboxRuns<br/><i>История запусков правил песочницы</i>")]:::dbLayer
    end

    %% Потоки данных: Клиент -> Шлюз
    UI_UPLOAD -->|POST /api/upload| UPLOAD_EP
    UI_DASH <-->|REST API + JWT| AUTH_MW
    UI_THREATS <-->|GET /api/threats| AUTH_MW
    UI_LIVE <-->|WebSockets: scan:join, scan:events| SOCKET_SRV
    WORKER -->|POST /api/sandbox/runs| AUTH_MW

    %% Потоки данных: Шлюз -> Анализ
    UPLOAD_EP -->|Файл на анализ| SCAN_SVC
    AUTH_MW --> SCAN_SVC
    SCAN_SVC --> ANALYZER
    ANALYZER -->|Сигнатурные веса| DETECTOR
    SCAN_SVC -->|Запуск профиля эмуляции| EMULATOR
    EMULATOR -->|analysis:event| SOCKET_SRV
    EMULATOR -->|Поведенческие веса| DETECTOR
    DETECTOR --> VERDICTS
    DETECTOR -->|scan:complete &amp; detector:alert| SOCKET_SRV

    %% Потоки данных: Сервис -> БД
    SCAN_SVC -->|sp_CreateScan, sp_SaveScanEvents| DB_SCANS
    SCAN_SVC -->|Bulk Insert событий| DB_EVENTS
    AUTH_MW <-->|CRUD пользователей| DB_USERS
    AUTH_MW <-->|sp_GetAllThreats (с кэшированием)| DB_THREATS
    AUTH_MW <-->|Сохранение прогонов песочницы| DB_RUNS
```

---

## 📚 Справочник угроз и Risk Score

<p align="center">
  <img src="docs/images/threat_cards.svg" alt="Threat Library Cards Preview" width="100%">
</p>

Каждый класс угрозы содержит весовую матрицу детекции. При совпадении признаков суммируются баллы риска:

| Вердикт | Диапазон баллов | Действие системы |
| :--- | :---: | :--- |
| <span style="color:#ff4d4d;font-weight:bold">CRITICAL</span> | `80 – 100` | Немедленная блокировка, критический алерт в реальном времени |
| <span style="color:#ff9640;font-weight:bold">HIGH</span> | `50 – 79` | Высокая степень опасности, обнаружены явные вредоносные маркеры |
| <span style="color:#eab308;font-weight:bold">MEDIUM</span> | `30 – 49` | Подозрительное поведение (рекламные инъекции, трекинг) |
| <span style="color:#38bdf8;font-weight:bold">LOW</span> | `1 – 29` | Низкий уровень риска, единичные предупреждения |
| <span style="color:#22c55e;font-weight:bold">CLEAN</span> | `0` | Признаков вредоносной активности не обнаружено |

---

## 📁 Структура репозитория

```
Course_Project_Zinis/
├── backend/                        # Серверная часть
│   ├── src/
│   │   ├── config/                 # Конфигурация БД (MSSQL), загрузки, авторизации
│   │   ├── middleware/             # Проверка прав (JWT), логирование, ошибки
│   │   ├── models/                 # Модели: Scan, Threat, ScanEvent, User, SandboxRun
│   │   ├── routes/                 # Эндпоинты: auth, upload, scans, threats, admin, sandbox
│   │   ├── services/               # Бизнес-логика: analyzer, emulator, detector, scanService
│   │   └── socket/                 # Socket.IO события и обработчики комнат
│   ├── sandbox_samples/            # Тестовые инертные образцы для песочницы
│   ├── uploads/                    # Каталог для загружаемых файлов (.gitkeep)
│   ├── public/                     # Серверный монитор (admin.html)
│   ├── database.sql                # Базовая схема БД и справочник угроз
│   ├── database_procedures.sql     # Хранимые процедуры и функции MSSQL
│   ├── database_auth_sandbox.sql   # Миграция: Users, SandboxRuns, Scans.user_id
│   ├── server.js                   # Точка входа Express + Socket.IO
│   └── package.json
│
├── frontend/                       # Статический веб-интерфейс (без сборщиков)
│   ├── assets/                     # Графические ресурсы и иконки
│   ├── css/                        # Модули стилей: tokens, base, layout, components
│   ├── js/                         # Клиентские скрипты: api, nav, socket, charts
│   │   ├── pages/                  # Логика конкретных страниц (threats.js и др.)
│   │   └── sandbox-worker.js       # Изолированный Web Worker песочницы
│   ├── index.html                  # Экран авторизации (вход)
│   ├── register.html               # Регистрация
│   ├── dashboard.html              # Главная аналитическая панель
│   ├── upload.html                 # Загрузка и анализ файлов
│   ├── live.html                   # Мониторинг поведенческой эмуляции
│   ├── history.html                # Журнал проверок и фильтрация
│   ├── scan-details.html           # Детальный отчёт проверки с экспортом
│   ├── threats.html                # Справочник угроз
│   ├── sandbox.html                # Клиентская песочница правил
│   └── users.html                  # Управление аккаунтами (Admin only)
│
├── docs/                           # Документация и иллюстрации
│   └── images/                     # Векторные схемы и баннеры интерфейса
├── scripts/                        # Скрипты генерации тестовых данных
├── test_samples/                   # Набор готовых безопасных файлов для тестов
├── package.json                    # Корневой конфигурационный файл
└── README.md
```

---

## 🚀 Быстрый старт

### 1. Требования к окружению
* **Node.js** версии `>= 18.0.0`
* **Microsoft SQL Server** (2019 / 2022 / Express)

### 2. Подготовка базы данных
Выполните по порядку три SQL-скрипта в MSSQL (например, через SSMS или `sqlcmd`):

```powershell
# Применение схемы и процедур
sqlcmd -S localhost -E -i backend/database.sql
sqlcmd -S localhost -E -i backend/database_procedures.sql
sqlcmd -S localhost -E -i backend/database_auth_sandbox.sql
```

### 3. Установка зависимостей и запуск

```powershell
# Установка серверных библиотек
npm run install:all

# Запуск проекта (из корня)
npm run dev
```

> Платформа запустится по адресу: **[http://localhost:3000](http://localhost:3000)**  
> *(Сервер Express автоматически отдаёт и API, и статический фронтенд)*.

### 4. Создание администратора
Создать первого администратора можно один раз через специальный bootstrap-запрос:

```powershell
curl -X POST http://localhost:3000/api/auth/bootstrap-admin `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"admin@example.com\",\"password\":\"AdminPass123!\",\"key\":\"setup-first-admin-pass\"}'
```

Обычные пользователи могут регистрироваться самостоятельно через форму на `/register.html`.

---

## 🧪 Тестирование детекции

В папке `test_samples/` подготовлены безопасные демонстрационные образцы:

* `01_clean/` — чистые текстовые файлы, скрипты и отчеты (**CLEAN**).
* `02_low_risk/` — файлы с легкими сетевыми утилитами (**LOW**).
* `03_medium_risk/` — симуляторы веб-скрейперов и макросов (**MEDIUM**).
* `04_high_risk/` — трояны-дропперы и сетевые черви (**HIGH**).
* `05_critical/` — симуляторы программ-вымогателей и эксплойтов (**CRITICAL**).

Загрузите любой из них через страницу **[Загрузка файла](http://localhost:3000/upload.html)** для проверки работы анализатора и детектора.