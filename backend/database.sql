IF DB_ID(N'MalwareSandbox') IS NULL CREATE DATABASE MalwareSandbox;
GO
USE MalwareSandbox;
GO
IF OBJECT_ID('dbo.ScanEvents','U') IS NOT NULL DROP TABLE dbo.ScanEvents;
IF OBJECT_ID('dbo.Scans','U') IS NOT NULL DROP TABLE dbo.Scans;
IF OBJECT_ID('dbo.Threats','U') IS NOT NULL DROP TABLE dbo.Threats;
GO
CREATE TABLE dbo.Scans(id INT IDENTITY PRIMARY KEY,filename NVARCHAR(255) NOT NULL,file_hash CHAR(64) NOT NULL,file_size BIGINT NOT NULL,file_type NVARCHAR(50),mime_type NVARCHAR(150),verdict NVARCHAR(20) NOT NULL,risk_score INT NOT NULL DEFAULT 0,analysis_details NVARCHAR(MAX),created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIME());
CREATE INDEX IX_Scans_CreatedAt ON dbo.Scans(created_at DESC);CREATE INDEX IX_Scans_Verdict ON dbo.Scans(verdict);CREATE INDEX IX_Scans_Hash ON dbo.Scans(file_hash);
CREATE TABLE dbo.ScanEvents(id BIGINT IDENTITY PRIMARY KEY,scan_id INT NOT NULL,event_type NVARCHAR(80) NOT NULL,severity NVARCHAR(20) NOT NULL,message NVARCHAR(MAX),metadata NVARCHAR(MAX),timestamp DATETIME2 NOT NULL DEFAULT SYSDATETIME(),CONSTRAINT FK_ScanEvents_Scans FOREIGN KEY(scan_id) REFERENCES dbo.Scans(id) ON DELETE CASCADE);
CREATE INDEX IX_ScanEvents_ScanId ON dbo.ScanEvents(scan_id,timestamp);
CREATE TABLE dbo.Threats(id INT IDENTITY PRIMARY KEY,type NVARCHAR(50) UNIQUE NOT NULL,name NVARCHAR(100) NOT NULL,description NVARCHAR(MAX),characteristics NVARCHAR(MAX),score_weights NVARCHAR(MAX),severity NVARCHAR(20) NOT NULL);
INSERT dbo.Threats(type,name,description,characteristics,score_weights,severity) VALUES
('Ransomware',N'Шифровальщик',N'Симулирует массовое изменение файлов и появление записки о выкупе.',N'["mass file activity","renaming","ransom note","CPU/disk spike"]',N'{"file_operations":25,"ransom_note":30}',N'CRITICAL'),
('Keylogger',N'Кейлоггер',N'Симулирует захват клавиш и передачу данных.',N'["keyboard capture","clipboard","C&C","exfiltration"]',N'{"keystroke_capture":30,"data_exfiltration":25}',N'HIGH'),
('Backdoor',N'Бэкдор',N'Симулирует C&C-соединение, команды и эксфильтрацию.',N'["outbound connection","commands","exfiltration"]',N'{"c2_connection":30,"command_execution":25}',N'CRITICAL'),
('Worm',N'Червь',N'Симулирует сетевое сканирование и распространение.',N'["network scan","exploit","self-copy","remote execution"]',N'{"network_scan":20,"self_replication":30}',N'HIGH'),
('Trojan',N'Троян',N'Симулирует загрузку полезной нагрузки и скрытую активность.',N'["payload drop","C&C","persistence"]',N'{"payload_drop":25,"c2_connection":20}',N'HIGH'),
('Adware',N'Рекламное ПО',N'Симулирует нежелательные изменения браузера и сбор данных.',N'["ad injection","browser hijack","data collection"]',N'{"ad_injection":20,"data_collection":20}',N'MEDIUM');
GO
