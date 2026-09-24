# Malware Sandbox Platform — Educational Project

Демонстрационная платформа моделирования вредоносного поведения и детекции вредоносного кода (учебная песочница).

## ⚠️ Важное предупреждение

**Это НЕ реальная песочница для запуска вредоносного ПО.**  
Вредоносный код **НЕ исполняется**. Проект **моделирует (симулирует)** поведение ВПО: генерирует события, логи, метрики. Это учебный проект, но архитектура выполнена "как в проде".

## 🛠 Технологический стек

### Backend
- **Node.js + Express** (CommonJS)
- **MSSQL** (драйвер `mssql`)
- **Socket.IO** для real-time коммуникации
- **Multer** для загрузки файлов

### Frontend
- **Обычные статические файлы**: HTML + CSS + vanilla JS, без сборщика (Vite/webpack не используются)
- Без Tailwind, Zustand и Recharts — стили в `frontend/css/*.css`, графики — свой лёгкий SVG-рендерер (`frontend/js/charts.js`)
- Socket.IO Client подключается напрямую через `<script src="/socket.io/socket.io.js">`
- Подробности всех изменений и новых возможностей (auth, песочница, отчёты, фикс графика) — см. `CHANGES.md`

## 📁 Структура проекта

```
Course_Project_Zinis/
├── backend/
│   ├── src/
│   │   ├── config/         # Конфигурация (DB, upload, analysis, auth)
│   │   ├── middleware/     # Валидация, ошибки, логирование, auth (JWT-cookie)
│   │   ├── models/         # Модели БД (Scan, Threat, ScanEvent, User, SandboxRun)
│   │   ├── routes/         # API маршруты (auth, upload, scans, threats, admin, sandbox)
│   │   ├── services/       # Бизнес-логика (analyzer, emulator, detector, scanService)
│   │   ├── socket/         # Socket.IO хендлеры
│   │   └── utils/
│   ├── uploads/            # Временная папка для загрузок
│   ├── sandbox_samples/    # Инертные тестовые образцы для «Песочницы»
│   ├── database.sql / database_procedures.sql / database_auth_sandbox.sql
│   ├── server.js
│   ├── package.json
│   └── .env.example
│
└── frontend/               # Статический сайт, без build-шага
    ├── index.html          # Логин (публичная страница)
    ├── register.html
    ├── dashboard.html
    ├── upload.html
    ├── live.html
    ├── history.html
    ├── scan-details.html
    ├── threats.html
    ├── sandbox.html
    ├── users.html          # только для role=admin
    ├── css/                # tokens / base / layout / components
    ├── js/                 # api.js, nav.js (auth-guard), charts.js, socket.js,
    │                       # sandbox-worker.js (Web Worker), js/pages/*.js
    └── assets/
```


## 🚀 Быстрый старт

### 1. Подготовка базы данных (MSSQL)

Убедитесь, что у вас установлен и запущен Microsoft SQL Server.

```bash
# 1. Создайте базу данных и таблицы
# Выполните по порядку: database.sql -> database_procedures.sql -> database_auth_sandbox.sql

sqlcmd -S localhost -U sa -P "YourStrongPassword123" -i backend/database.sql
sqlcmd -S localhost -U sa -P "YourStrongPassword123" -i backend/database_procedures.sql
sqlcmd -S localhost -U sa -P "YourStrongPassword123" -i backend/database_auth_sandbox.sql
```

### 2. Настройка переменных окружения

```bash
cd backend
cp .env.example .env
# Отредактируйте .env под вашу среду:
# - DB_SERVER, DB_PORT, DB_DATABASE, DB_USER, DB_PASSWORD
# - FRONTEND_URL (по умолчанию http://localhost:3000 — фронтенд отдаётся тем же сервером)
# - JWT_SECRET (обязательно смените на длинную случайную строку)
# - BOOTSTRAP_ADMIN_KEY (см. шаг 5 — создание первого администратора)
```

### 3. Установка зависимостей

```bash
cd backend
npm install
```
Фронтенд — обычные статические файлы, ставить туда нечего: `npm run dev`/`npm start` в backend уже раздаёт папку `frontend/` напрямую.

### 4. Запуск

```bash
npm run dev
# Backend + статический фронтенд — оба на http://localhost:3000
```

### 5. Открыть в браузере и создать администратора

Перейдите на **http://localhost:3000** — откроется страница входа.

Первый администратор создаётся один раз через `bootstrap-admin` (пока задан `BOOTSTRAP_ADMIN_KEY` в `.env`):
```bash
curl -X POST http://localhost:3000/api/auth/bootstrap-admin \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"ChangeMe123!","key":"<значение BOOTSTRAP_ADMIN_KEY>"}'
```
После этого рекомендуется очистить `BOOTSTRAP_ADMIN_KEY` в `.env` — endpoint откажет, если админ уже есть.
Обычные пользователи регистрируются через форму на `/register.html`.

## 📋 Функциональность

### Модуль 1. Загрузка файлов (`/upload`)
- Drag & drop загрузка файлов
- Поддержка: `.exe`, `.pdf`, `.js`, `.txt`, `.docx`, `.zip`, `.apk`, `.dll`
- Ограничение: 10 МБ
- Валидация MIME-типа и расширения
- Прогресс-бар загрузки

### Модуль 2. Статический анализ
- Поиск подозрительных строк: `cmd.exe`, `powershell.exe`, `eval(`, `child_process`, `CreateRemoteThread`, `WriteProcessMemory`, `base64_decode` и др.
- Извлечение URL (http/https) и IP-адресов из бинарных данных
- PDF-специфичные признаки: `/JavaScript`, `/OpenAction`, `/AA`, `/Launch`
- JS-специфичные: `eval`, `new Function`, `WebSocket`
- Подсчёт энтропии (для бинарных файлов)
- SHA256 хэш
- Каждая сигнатура добавляет "очки риска" (risk score)

### Модуль 3. Поведенческая эмуляция (`/live`)
- Генератор событий в реальном времени через Socket.IO
- Профили вредоносов:
  - **Ransomware**: массовое создание файлов → переименование → README_DECRYPT.txt → высокая активность CPU/Disk
  - **Keylogger**: ввод текста → захват клавиш → отправка на "C&C"
  - **Backdoor**: исходящее соединение → приём команд → эксфильтрация
  - **Worm**: сканирование сети → копирование себя → рассылка
  - **Trojan**: маскировка → загрузка полезной нагрузки → C&C
  - **Adware**: инъекция рекламы → редирект трафика → сбор данных
- Задержки через `setTimeout`/`setInterval`

### Модуль 4. Детектор
- Суммарный risk score (статический + поведенческий)
- Правила вердиктов:
  - `>= 80` → **CRITICAL**
  - `>= 50` → **HIGH**
  - `>= 30` → **MEDIUM**
  - `> 0` → **LOW**
  - `0` → **CLEAN**
- Алерты через Socket.IO при превышении порогов
- Сохранение результата в MSSQL

### Модуль 5. История сканирований (`/history`)
- REST API: CRUD для сканирований
- Таблица с фильтрами по вердикту и дате
- Удаление записей
- Пагинация

### Модуль 6. Справочник угроз (`/threats`)
- Карточки 6 типов угроз с описанием, признаками, score-весами
- Данные из БД (можно расширить)

### Модуль 7. Dashboard (`/`)
- Виджеты: всего сканирований, по вердиктам
- Графики: распределение вердиктов (Pie), активность по времени (Bar)
- Быстрые действия

## 🔌 API Endpoints

### Upload
- `POST /api/upload` — загрузка файла (multipart/form-data)
- `GET /api/upload/config` — конфигурация загрузки

### Scans
- `GET /api/scans` — список с фильтрами (`verdict`, `search`, `dateFrom`, `dateTo`, `limit`, `offset`)
- `GET /api/scans/stats` — статистика для дашборда
- `GET /api/scans/:id` — детали сканирования
- `DELETE /api/scans/:id` — удаление

### Threats
- `GET /api/threats` — список всех угроз
- `GET /api/threats/:type` — угроза по типу

### Socket.IO Events
**Client → Server:**
- `scan:join` — присоединиться к комнате сканирования
- `scan:leave` — покинуть комнату
- `alerts:subscribe` — подписка на глобальные алерты
- `scan:events:request` — запрос истории событий
- `dashboard:stats:request` — запрос статистики

**Server → Client:**
- `scan:progress` — прогресс статического анализа
- `analysis:event` — событие поведенческой эмуляции
- `analysis:complete` — завершение эмуляции
- `scan:complete` — финальный результат сканирования
- `scan:error` — ошибка сканирования
- `detector:alert` — алерт детектора
- `dashboard:stats:update` — периодическое обновление статистики

## 🗄 База данных

### Таблицы
- **Scans** — история сканирований
- **Threats** — справочник угроз (6 типов, предустановлены)
- **ScanEvents** — события поведенческой эмуляции (в реальном времени)

### Индексы
- `Scans.created_at`, `Scans.verdict`, `Scans.file_hash`
- `ScanEvents.scan_id`, `ScanEvents.timestamp`

## 🔧 Конфигурация (.env)

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_SERVER=localhost
DB_PORT=1433
DB_DATABASE=MalwareSandbox
DB_USER=sa
DB_PASSWORD=YourStrongPassword123
DB_TRUST_SERVER_CERTIFICATE=true

# Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
ALLOWED_EXTENSIONS=.exe,.pdf,.js,.txt,.docx,.zip,.apk
ALLOWED_MIME_TYPES=application/octet-stream,application/pdf,application/javascript,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip,application/vnd.android.package-archive

# Frontend
FRONTEND_URL=http://localhost:3000

# Socket.IO
SOCKET_PING_TIMEOUT=60000
SOCKET_PING_INTERVAL=25000

# Analysis
ENTROPY_THRESHOLD=7.0
RISK_SCORE_CRITICAL=80
RISK_SCORE_HIGH=50
RISK_SCORE_MEDIUM=30
```

## 🧪 Тестирование

```bash
# Backend тесты
cd backend
npm test

# Frontend линтинг
cd frontend
npm run lint
```

## 📝 Лицензия

Educational Project — Course Project "Malware Behavior Simulation and Detection Platform"

## 👨‍💻 Автор

Senior Fullstack Developer / Software Architect