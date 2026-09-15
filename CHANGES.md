# CHANGES — редизайн, авторизация, фикс графика, песочница, отчёты

Эта итерация закрывает пять задач из ТЗ: редизайн интерфейса (без Vite/Tailwind/
Zustand/Recharts, как было согласовано отдельно), аутентификация и роли,
фикс графика активности за 30 дней, полноценная клиентская песочница
(редактор кода + Web Worker) и детализированный отчёт с фильтрами/экспортом.

## 1. Список изменённых / созданных файлов

### Backend — изменено
- `backend/server.js` — убран Vite dev-редирект, фронтенд отдаётся как обычная
  статика; подключены `cookie-parser`, `attachUser`, роуты `/api/auth`,
  `/api/sandbox`; `/api/upload` и `/api/scans` защищены `requireAuth`;
  `/admin` (HTML-страница монитора) и `/api/admin/*` — только для роли admin.
- `backend/package.json` — добавлены `bcryptjs`, `jsonwebtoken`, `cookie-parser`.
- `backend/.env.example` — добавлены `JWT_SECRET`, `JWT_EXPIRES_IN`,
  `JWT_COOKIE_MAX_AGE_MS`, `BCRYPT_ROUNDS`, `BOOTSTRAP_ADMIN_KEY`.
- `backend/src/config/index.js` — секции `auth` и `sandbox`.
- `backend/src/models/Scan.js` — `create`/`findAll` теперь учитывают `user_id`;
  **`getStats()` переписан** на прямые SQL-запросы: пивот 30-дневной активности
  по вердиктам (`{date, clean, low, medium, high, critical, total}`) с
  **обязательным zero-fill всех 30 дней**, а не только дней с данными — это и
  было причиной пустого графика на дашборде.
- `backend/src/services/scanService.js` — `processFile`/`completeScan`/`getStats`
  принимают `userId` и пробрасывают его в модель.
- `backend/src/services/fileAnalyzer.js` — в каждый `finding` добавлено поле
  `offset` (позиция первого совпадения в файле) — было нужно для детального
  отчёта (п. 5 ТЗ), которого раньше не было вообще.
- `backend/src/routes/upload.js` — прокидывает `req.user.id` в `processFile`.
- `backend/src/routes/scans.js` — переписан: доступ только к своим сканам для
  обычных пользователей (admin видит все), плюс `GET /api/scans/export` и
  `GET /api/scans/:id/export` (`?format=json|csv`).
- `backend/src/routes/admin.js` — защищён `requireAdmin`; добавлены
  `GET /api/admin/users`, `PATCH /api/admin/users/:id/block`,
  `DELETE /api/admin/users/:id`.
- `backend/public/admin.html` — редизайн под общую дизайн-систему, добавлена
  проверка 401/403 с редиректом на логин.
- `README.md` — секции стека/структуры/быстрого старта обновлены под новый
  стек и шаги миграции/bootstrap-admin.

### Backend — создано
- `backend/src/middleware/auth.js` — `signToken`, `setAuthCookie`,
  `clearAuthCookie`, `attachUser`, `requireAuth`, `requireAdmin` (JWT в
  httpOnly-cookie).
- `backend/src/routes/auth.js` — `POST /register`, `POST /login`,
  `POST /logout`, `GET /me`, `POST /bootstrap-admin`.
- `backend/src/models/User.js` — CRUD пользователей, без утечки `password_hash`
  наружу.
- `backend/src/routes/sandbox.js` + `backend/src/models/SandboxRun.js` —
  список/добавление инертных образцов, сохранение и чтение истории запусков
  правил песочницы.
- `backend/database_auth_sandbox.sql` — аддитивная миграция: `Users`,
  `Scans.user_id` (FK, nullable), `SandboxRuns`.

### Frontend — полностью новый (заменяет React/Vite/Tailwind/Zustand/Recharts)
- `css/tokens.css`, `css/base.css`, `css/layout.css`, `css/components.css` —
  дизайн-система: тёмный графит + приглушённый циан-акцент, семантические
  цвета вердиктов, без градиентов/эмодзи/скруглений в духе shadcn-по-умолчанию.
- `js/api.js`, `js/utils.js`, `js/nav.js` (auth-guard + сайдбар),
  `js/socket.js`, `js/charts.js` (свои SVG-графики вместо Recharts).
- Страницы: `index.html` (логин), `register.html`, `dashboard.html`,
  `upload.html`, `live.html`, `history.html`, `scan-details.html`,
  `threats.html`, `sandbox.html`, `users.html` (только admin), `404.html`.
- `js/sandbox-worker.js` — Web Worker для исполнения пользовательских правил
  (см. раздел 3 ниже).
- Удалены: `frontend/src/**` (все `.jsx`), `vite.config.js`,
  `tailwind.config.js`, `postcss.config.js`, `frontend/package.json`.

## 2. Запуск и миграции

```bash
# 1. Схема БД — выполнить по порядку
sqlcmd -S localhost -U sa -P "YourStrongPassword123" -i backend/database.sql
sqlcmd -S localhost -U sa -P "YourStrongPassword123" -i backend/database_procedures.sql
sqlcmd -S localhost -U sa -P "YourStrongPassword123" -i backend/database_auth_sandbox.sql

# 2. Конфигурация
cd backend
cp .env.example .env
# обязательно задать JWT_SECRET и (временно) BOOTSTRAP_ADMIN_KEY

# 3. Зависимости и запуск
npm install
npm run dev        # http://localhost:3000 — и API, и статический фронтенд

# 4. Создать первого администратора (один раз)
curl -X POST http://localhost:3000/api/auth/bootstrap-admin \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"ChangeMe123!","key":"<BOOTSTRAP_ADMIN_KEY>"}'
# после этого очистить BOOTSTRAP_ADMIN_KEY в .env — endpoint откажет, если admin уже есть
```

Обычные пользователи регистрируются на `/register.html`. Существующие записи
в `Scans` (созданные до миграции) остаются с `user_id = NULL` и видны только
администратору.

## 3. Роли и роуты

| Роль    | Доступ |
|---------|--------|
| Гость (без сессии) | `/index.html` (логин), `/register.html` |
| `user`  | Dashboard/Upload/Live/History/Threats/Sandbox — **только свои** сканы и своя история песочницы |
| `admin` | Всё то же + `/users.html` (управление пользователями), `/admin` (серверный монитор), видит сканы **всех** пользователей |

API:
- `POST /api/auth/{register,login,logout}`, `GET /api/auth/me` — публичные.
- `POST /api/auth/bootstrap-admin` — публичный, но самоблокируется после
  первого админа и требует секретный ключ из `.env`.
- `GET /api/threats*` — публичный справочник (без персональных данных).
- `POST /api/upload*`, `/api/scans*` — требуют авторизации; для `user`
  фильтруются по `user_id`, для `admin` — без фильтра.
- `/api/sandbox/*` — требует авторизации; история запусков — per-user.
- `/api/admin/*` и HTML-страница `/admin` — только `role = admin`.

## 4. Песочница (п. 4 ТЗ) — как это работает

Пользователь пишет функцию `detect(text, bytesLength)` в текстовом редакторе
и запускает её против одного из инертных тестовых образцов
(`backend/sandbox_samples/*.txt`, плюс можно добавить свои через форму —
только как обычный текст, никогда не исполняются на сервере).

Выполнение — **в браузере**, в отдельном `Web Worker` (`js/sandbox-worker.js`):
- `fetch`/`XMLHttpRequest`/`WebSocket`/`importScripts` внутри воркера
  переопределены и бросают ошибку — сетевые запросы невозможны;
- у Worker нет доступа к `document`/`window` родительской страницы;
- таймаут 3 секунды — при превышении воркер принудительно завершается
  (`worker.terminate()`), статус — `timeout`;
- `console.log/warn/error` внутри правила перехватываются и возвращаются как
  лог выполнения;
- результат (`match` / `no_match` / `error` / `timeout`, лог, время
  выполнения) сохраняется в историю пользователя через
  `POST /api/sandbox/runs` — бэкенд участвует только в хранении истории, не в
  исполнении кода.

## 5. Известные ограничения / что не покрыто в этой итерации

- Категорийный фильтр в истории сканирований (по типу угрозы) — не добавлен
  на уровне SQL; при необходимости можно фильтровать найденные сигнатуры на
  странице отчёта по конкретному скану (там фильтр уже есть).
- Экспорт в PDF не реализован (сделаны JSON и CSV — их проще всего
  поддерживать в текущем стеке без новых тяжёлых зависимостей).
- Socket.IO авторизация на уровне комнат сканирования не проверяется (не
  является требованием ТЗ и не хранит чувствительных данных сверх тех, что
  уже публично транслируются в `live`-ленте).
