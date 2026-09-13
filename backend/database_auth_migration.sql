USE MalwareSandbox;
GO
IF OBJECT_ID('dbo.Users','U') IS NULL
BEGIN
  CREATE TABLE dbo.Users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    email NVARCHAR(320) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    role NVARCHAR(20) NOT NULL CONSTRAINT CK_Users_Role CHECK (role IN ('user','admin')) DEFAULT 'user',
    is_blocked BIT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIME()
  );
END;
GO
IF COL_LENGTH('dbo.Scans','user_id') IS NULL
BEGIN
  ALTER TABLE dbo.Scans ADD user_id INT NULL;
  ALTER TABLE dbo.Scans ADD CONSTRAINT FK_Scans_Users FOREIGN KEY (user_id) REFERENCES dbo.Users(id);
  CREATE INDEX IX_Scans_UserId ON dbo.Scans(user_id);
END;
GO

-- При необходимости назначить администратора:
-- UPDATE dbo.Users SET role = N'admin' WHERE email = N'admin@example.com';

-- Индекс для быстрого разделения истории по пользователям
IF COL_LENGTH('dbo.Scans', 'user_id') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Scans_UserId' AND object_id = OBJECT_ID('dbo.Scans'))
    CREATE INDEX IX_Scans_UserId ON dbo.Scans(user_id);
END;
