-- SQL Schema for Malware Sandbox Platform
-- Run this in your MSSQL database

CREATE DATABASE MalwareSandbox;
GO

USE MalwareSandbox;
GO

-- Table for scan history
CREATE TABLE Scans (
    id INT IDENTITY(1,1) PRIMARY KEY,
    filename NVARCHAR(255) NOT NULL,
    file_hash NVARCHAR(64) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type NVARCHAR(50),
    mime_type NVARCHAR(100),
    verdict NVARCHAR(20) NOT NULL, -- CLEAN, LOW, MEDIUM, HIGH, CRITICAL
    risk_score INT NOT NULL DEFAULT 0,
    analysis_details NVARCHAR(MAX), -- JSON with detailed analysis results
    created_at DATETIME2 DEFAULT SYSDATETIME(),
    updated_at DATETIME2 DEFAULT SYSDATETIME()
);

CREATE INDEX IX_Scans_CreatedAt ON Scans(created_at DESC);
CREATE INDEX IX_Scans_Verdict ON Scans(verdict);
CREATE INDEX IX_Scans_FileHash ON Scans(file_hash);

-- Table for threat library
CREATE TABLE Threats (
    id INT IDENTITY(1,1) PRIMARY KEY,
    type NVARCHAR(50) NOT NULL UNIQUE, -- Ransomware, Keylogger, Backdoor, Worm, Trojan, Adware
    name NVARCHAR(100) NOT NULL,
    description NVARCHAR(MAX),
    characteristics NVARCHAR(MAX), -- JSON array of characteristic strings
    score_weights NVARCHAR(MAX), -- JSON object with weight mappings
    severity NVARCHAR(20) NOT NULL, -- LOW, MEDIUM, HIGH, CRITICAL
    created_at DATETIME2 DEFAULT SYSDATETIME(),
    updated_at DATETIME2 DEFAULT SYSDATETIME()
);

-- Table for real-time events during emulation
CREATE TABLE ScanEvents (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    scan_id INT NOT NULL FOREIGN KEY REFERENCES Scans(id) ON DELETE CASCADE,
    event_type NVARCHAR(50) NOT NULL, -- file_created, network_connection, registry_change, process_spawn, alert, etc.
    severity NVARCHAR(20) NOT NULL, -- INFO, WARNING, CRITICAL
    message NVARCHAR(MAX),
    metadata NVARCHAR(MAX), -- JSON with additional data
    timestamp DATETIME2 DEFAULT SYSDATETIME()
);

CREATE INDEX IX_ScanEvents_ScanId ON ScanEvents(scan_id);
CREATE INDEX IX_ScanEvents_Timestamp ON ScanEvents(timestamp);

-- Insert default threat library data
INSERT INTO Threats (type, name, description, characteristics, score_weights, severity) VALUES
('Ransomware', 'Программа-шифровальщик', 'Вредоносное ПО, шифрующее файлы пользователя и требующее выкуп за расшифровку.', 
 '["Массовое создание/модификация файлов", "Переименование файлов с добавлением расширений", "Появление файлов-злыднй (README_DECRYPT.txt)", "Высокая активность диска/CPU", "Использование криптографических API"]',
 '{"file_operations": 25, "crypto_api": 20, "ransom_note": 30, "network_c2": 15, "persistence": 10}', 'CRITICAL'),

('Keylogger', 'Кейлоггер', 'Программа для скрытого записи нажатий клавиш пользователя.', 
 '["Перехват клавиатурного ввода", "Сбор текста из буфера обмена", "Периодическая отправка данных на C&C", "Скрытие процесса", "Автозагрузка"]',
 '{"keystroke_capture": 30, "clipboard_monitor": 15, "data_exfiltration": 25, "stealth": 15, "persistence": 15}', 'HIGH'),

('Backdoor', 'Бэкдор', 'Вредоносное ПО, предоставляющее удаленный доступ к зараженной системе.', 
 '["Установка исходящего соединения к C&C", "Прием и исполнение команд", "Эксфильтрация данных", "Обход файрвола", "Повышение привилегий"]',
 '{"c2_connection": 30, "command_execution": 25, "data_exfiltration": 20, "privilege_escalation": 15, "evasion": 10}', 'CRITICAL'),

('Worm', 'Червь', 'Самовраспространяющееся вредоносное ПО, использующее уязвимости сети.', 
 '["Сканирование сети на предмет уязвимостей", "Копирование себя на другие хосты", "Рассылка копий через email/IM", "Использование эксплойтов", "Брутфорс паролей"]',
 '{"network_scan": 20, "self_replication": 30, "lateral_movement": 25, "exploit_usage": 15, "bruteforce": 10}', 'HIGH'),

('Trojan', 'Троян', 'Вредоносное ПО, маскирующееся под легаitimate программу.', 
 '["Маскировка под легаitimate ПО", "Скрытая загрузка полезной нагрузки", "Связь с C&C", "Кража учетных данных", "Установка дополнительного ПО"]',
 '{"disguise": 15, "payload_drop": 25, "c2_connection": 20, "credential_theft": 20, "persistence": 20}', 'HIGH'),

('Adware', 'Адвер', 'Программа, показывающая нежелательную рекламу и собирающая данные.', 
 '["Показ навязчивой рекламы", "Сбор браузерной истории", "Перенаправление поисковых запросов", "Установка расширений браузера", "Замедление системы"]',
 '{"ad_injection": 20, "data_collection": 20, "browser_hijack": 20, "persistence": 15, "performance_impact": 25}', 'MEDIUM');
GO

-- View for scan statistics
CREATE VIEW ScanStats AS
SELECT 
    CAST(created_at AS DATE) as scan_date,
    verdict,
    COUNT(*) as count,
    AVG(risk_score) as avg_risk_score
FROM Scans
GROUP BY CAST(created_at AS DATE), verdict;
GO