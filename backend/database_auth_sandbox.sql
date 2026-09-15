-- =====================================================================
-- Миграция: аккаунты пользователей, привязка сканов к владельцу,
-- история запусков клиентской песочницы.
-- Выполнять ПОСЛЕ database.sql и database_procedures.sql.
-- Полностью аддитивная миграция — ничего из существующих таблиц не удаляется.
-- =====================================================================

USE MalwareSandbox;
GO

-- ---------------------------------------------------------------------
-- Пользователи
-- ---------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
BEGIN
    CREATE TABLE Users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        email NVARCHAR(255) NOT NULL UNIQUE,
        password_hash NVARCHAR(255) NOT NULL,
        role NVARCHAR(20) NOT NULL DEFAULT 'user', -- 'user' | 'admin'
        is_blocked BIT NOT NULL DEFAULT 0,
        created_at DATETIME2 DEFAULT SYSDATETIME(),
        updated_at DATETIME2 DEFAULT SYSDATETIME()
    );

    CREATE INDEX IX_Users_Email ON Users(email);
END
GO

-- ---------------------------------------------------------------------
-- Привязка сканов к пользователю (NULL = анонимный/старый скан)
-- ---------------------------------------------------------------------
IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.Scans') AND name = 'user_id'
)
BEGIN
    ALTER TABLE Scans ADD user_id INT NULL FOREIGN KEY REFERENCES Users(id);
    CREATE INDEX IX_Scans_UserId ON Scans(user_id);
END
GO

-- ---------------------------------------------------------------------
-- История запусков «Песочницы» (клиентский JS-детектор в Web Worker)
-- ---------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SandboxRuns')
BEGIN
    CREATE TABLE SandboxRuns (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL FOREIGN KEY REFERENCES Users(id) ON DELETE CASCADE,
        sample_name NVARCHAR(255) NOT NULL,
        rule_code NVARCHAR(MAX) NOT NULL,       -- JS-код правила, написанный пользователем
        status NVARCHAR(20) NOT NULL,           -- match | no_match | error | timeout
        result NVARCHAR(MAX),                   -- JSON: { matched, warnings, log[] }
        duration_ms INT NOT NULL DEFAULT 0,
        created_at DATETIME2 DEFAULT SYSDATETIME()
    );

    CREATE INDEX IX_SandboxRuns_UserId ON SandboxRuns(user_id, created_at DESC);
END
GO

-- Первый администратор создаётся через POST /api/auth/bootstrap-admin
-- (см. backend/README) — пароли никогда не хранятся в SQL-скриптах.
