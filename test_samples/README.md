# 🧪 Набор тестовых файлов для Malware Sandbox Platform

Данная директория содержит коллекцию безопасных (инертных) тестовых файлов для комплексной проверки работы платформы: статического анализатора ([fileAnalyzer.js](file:///d:/Studing/4k1s/Course_Project_Zinis/backend/src/services/fileAnalyzer.js)), детектора угроз ([detector.js](file:///d:/Studing/4k1s/Course_Project_Zinis/backend/src/services/detector.js)) и поведенческого эмулятора ([behavioralEmulator.js](file:///d:/Studing/4k1s/Course_Project_Zinis/backend/src/services/behavioralEmulator.js)).

> [!NOTE]
> **Безопасность:** Все файлы являются учебными макетами и демонстрационными образцами. Они содержат характерные строковые паттерны, маркеры и заголовки, но **не содержат вредоносного исполняемого кода** и безопасны для локальной среды.

---

## 📁 Структура каталогов

```
test_samples/
├── 01_clean/                  # Чистые файлы (Вердикт: CLEAN, Риск: 0)
│   ├── clean_document.txt     # Обычный текстовый документ
│   ├── clean_script.js        # Утилитарный JavaScript-модуль
│   ├── clean_report.pdf       # Валидный PDF-отчет без макросов/скриптов
│   └── clean_utility.exe      # Минимальный PE-исполняемый файл без опасных импортов
│
├── 02_low_risk/               # Низкий риск (Вердикт: LOW, Риск: 1–29)
│   ├── safe_web_fetch.js      # Скрипт с безопасным fetch() и btoa()
│   └── network_diagnostics.txt# Текстовый лог с IP-адресами (8.8.8.8, 192.168.1.1)
│
├── 03_medium_risk/            # Средний риск (Вердикт: MEDIUM, Риск: 30–49)
│   ├── macro_document.docx    # Документ со структурой макроса (AutoOpen, WScript.Shell)
│   ├── web_scraper.js         # Телеметрия/сбор данных (cookies, storage, WebSocket)
│   └── adware_injector.js     # Adware-трекинг (adware-паттерны, navigator.sendBeacon)
│
├── 04_high_risk/              # Высокий риск (Вердикт: HIGH, Риск: 50–79)
│   ├── trojan_dropper.js      # Троян-дроппер (child_process, eval, powershell, URL download)
│   ├── stealth_keylogger.exe  # PE-файл с API перехвата ввода (SetWindowsHookEx, GetAsyncKeyState)
│   └── worm_propagator.js     # Сетевой червь (eternalblue, exploit, powershell)
│
└── 05_critical/               # Критический риск (Вердикт: CRITICAL, Риск: 80–100)
    ├── ransomware_payload.js  # Вымогатель (crypto.subtle, vssadmin delete shadows, README_DECRYPT)
    ├── process_hollowing_backdoor.exe # Упакованный UPX PE-бэкдор (OpenProcess, VirtualAllocEx, сокеты)
    ├── malicious_exploit.pdf  # PDF с эксплойтом (/JavaScript, /Launch, /OpenAction, cmd.exe)
    └── mimikatz_loader.txt    # APT-артефакт (mimikatz, cobalt strike, metasploit, инъекции)
```

---

## 📊 Результаты верификации образцов

Результаты получены конвейером анализа платформы (формула: `Total = Round(Static × 0.4 + Behavioral × 0.6)`):

| Категория / Файл | Тип файла | Static Score | Behav Score | Итоговый Score | Вердикт | Класс ВПО | Ключевые маркеры / Сигнатуры |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **01_clean/clean_document.txt** | text | 0 | 0 | **0** | `CLEAN` | Clean | Чистый текст без подозрительных сигнатур |
| **01_clean/clean_report.pdf** | pdf | 0 | 0 | **0** | `CLEAN` | Clean | Валидный PDF без тегов `/JavaScript` и `/Launch` |
| **01_clean/clean_script.js** | js | 0 | 0 | **0** | `CLEAN` | Clean | Чистые функции вычисления среднего и форматирования |
| **01_clean/clean_utility.exe** | exe | 0 | 0 | **0** | `CLEAN` | Clean | PE-заголовок (MZ), стандартные импорты KERNEL32/USER32 |
| **02_low_risk/network_diagnostics.txt** | text | 10 | 14 | **12** | `LOW` | Trojan | IP-адреса `192.168.1.1`, `8.8.8.8` |
| **02_low_risk/safe_web_fetch.js** | js | 25 | 19 | **21** | `LOW` | Trojan | `fetch()`, `btoa()` |
| **03_medium_risk/adware_injector.js** | js | 60 | 17 | **34** | `MEDIUM` | Adware | `adware`, `navigator.sendBeacon`, `localStorage` |
| **03_medium_risk/web_scraper.js** | js | 60 | 21 | **37** | `MEDIUM` | Trojan | `document.cookie`, `localStorage`, `sessionStorage`, `WebSocket` |
| **03_medium_risk/macro_document.docx** | office | 100 | 6 | **44** | `MEDIUM` | Trojan | `AutoOpen`, `VBA`, `CreateObject`, `WScript.Shell` |
| **04_high_risk/worm_propagator.js** | js | 100 | 38 | **63** | `HIGH` | Worm | `eternalblue`, `exploit`, `child_process`, `powershell.exe` |
| **04_high_risk/trojan_dropper.js** | js | 100 | 47 | **68** | `HIGH` | Backdoor | `child_process`, `powershell.exe`, `eval()`, URL download |
| **04_high_risk/stealth_keylogger.exe** | exe | 100 | 77 | **86** | `CRITICAL` | Keylogger | `SetWindowsHookEx`, `GetAsyncKeyState`, `GetForegroundWindow` |
| **05_critical/ransomware_payload.js** | js | 100 | 74 | **84** | `CRITICAL` | Ransomware | `crypto.subtle`, `vssadmin delete shadows`, `README_DECRYPT.txt` |
| **05_critical/process_hollowing_backdoor.exe** | exe | 100 | 87 | **92** | `CRITICAL` | Backdoor | `UPX!`, `OpenProcess`, `VirtualAllocEx`, `CreateRemoteThread`, `connect()` |
| **05_critical/malicious_exploit.pdf** | pdf | 100 | 98 | **99** | `CRITICAL` | Backdoor | `/JavaScript`, `/Launch`, `/OpenAction`, `cmd.exe`, `powershell.exe` |
| **05_critical/mimikatz_loader.txt** | text | 100 | 100 | **100** | `CRITICAL` | Backdoor | `mimikatz`, `cobalt strike`, `metasploit`, `CreateRemoteThread` |

---

## 🚀 Способы использования тестовых файлов

### 1. Быстрая пакетная верификация через консоль
Для проверки работы аналитического ядра без запуска веб-сервера и СУБД:
```powershell
node scripts/verify_samples.js
```

### 2. Тестирование через Web UI платформы
1. Запустите бэкенд:
   ```powershell
   cd backend
   npm run dev
   ```
2. Откройте в браузере `http://localhost:3000` (страница входа / регистрации).
3. Перейдите в раздел **«Загрузка»** (`/upload.html`):
   - Перетащите любой файл из каталога `test_samples/` (или выберите группу файлов для пакетного анализа).
   - Наблюдайте за процессом статического анализа и переходом в интерактивный режим эмуляции поведения (`/live.html`).
4. Перейдите в раздел **«Песочница»** (`/sandbox.html`):
   - В выпадающем списке выберите готовые инертные образцы из папки `backend/sandbox_samples/` (`ransomware`, `keylogger`, `backdoor`, `worm`, `trojan`, `adware`, `clean`).
   - Нажмите **«Создать и сразу сканировать»** для проверки конкретного сценария.

### 3. Перегенерация файлов
При необходимости обновить или пересоздать набор тестовых файлов:
```powershell
node scripts/generate_test_samples.js
```
