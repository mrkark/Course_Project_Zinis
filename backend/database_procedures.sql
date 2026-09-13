-- Stored Procedures and Functions for Malware Sandbox Platform
-- Run this AFTER database.sql

USE MalwareSandbox;
GO

-- =====================================================================
-- FUNCTIONS
-- =====================================================================

-- Function: Calculate verdict from risk score
CREATE OR ALTER FUNCTION dbo.fn_GetVerdictFromScore(@riskScore INT)
RETURNS NVARCHAR(20)
WITH SCHEMABINDING
AS
BEGIN
    DECLARE @verdict NVARCHAR(20);
    
    IF @riskScore >= 80 SET @verdict = 'CRITICAL';
    ELSE IF @riskScore >= 50 SET @verdict = 'HIGH';
    ELSE IF @riskScore >= 30 SET @verdict = 'MEDIUM';
    ELSE IF @riskScore > 0 SET @verdict = 'LOW';
    ELSE SET @verdict = 'CLEAN';
    
    RETURN @verdict;
END;
GO

-- Function: Get scan statistics for dashboard
CREATE OR ALTER FUNCTION dbo.fn_GetScanStats()
RETURNS TABLE
AS
RETURN
(
    SELECT 
        (SELECT COUNT(*) FROM dbo.Scans) as total_scans,
        (SELECT COUNT(*) FROM dbo.Scans WHERE verdict = 'CRITICAL') as critical_count,
        (SELECT COUNT(*) FROM dbo.Scans WHERE verdict = 'HIGH') as high_count,
        (SELECT COUNT(*) FROM dbo.Scans WHERE verdict = 'MEDIUM') as medium_count,
        (SELECT COUNT(*) FROM dbo.Scans WHERE verdict = 'LOW') as low_count,
        (SELECT COUNT(*) FROM dbo.Scans WHERE verdict = 'CLEAN') as clean_count,
        (SELECT AVG(CAST(risk_score AS FLOAT)) FROM dbo.Scans) as avg_risk_score,
        (SELECT MAX(risk_score) FROM dbo.Scans) as max_risk_score
);
GO

-- Function: Get recent activity (last N days)
CREATE OR ALTER FUNCTION dbo.fn_GetRecentActivity(@days INT = 30)
RETURNS TABLE
AS
RETURN
(
    WITH Dates AS (
        SELECT CAST(DATEADD(day, -(@days - 1), CAST(SYSDATETIME() AS date)) AS date) AS scan_date
        UNION ALL
        SELECT DATEADD(day, 1, scan_date)
        FROM Dates
        WHERE scan_date < CAST(SYSDATETIME() AS date)
    ), Aggregated AS (
        SELECT CAST(created_at AS date) AS scan_date, verdict, COUNT(*) AS scan_count
        FROM dbo.Scans
        WHERE created_at >= DATEADD(day, -(@days - 1), CAST(SYSDATETIME() AS date))
        GROUP BY CAST(created_at AS date), verdict
    )
    SELECT d.scan_date,
           COALESCE(SUM(a.scan_count), 0) AS scan_count,
           COALESCE(SUM(CASE WHEN a.verdict = 'CLEAN' THEN a.scan_count ELSE 0 END), 0) AS clean_count,
           COALESCE(SUM(CASE WHEN a.verdict = 'LOW' THEN a.scan_count ELSE 0 END), 0) AS low_count,
           COALESCE(SUM(CASE WHEN a.verdict = 'MEDIUM' THEN a.scan_count ELSE 0 END), 0) AS medium_count,
           COALESCE(SUM(CASE WHEN a.verdict = 'HIGH' THEN a.scan_count ELSE 0 END), 0) AS high_count,
           COALESCE(SUM(CASE WHEN a.verdict = 'CRITICAL' THEN a.scan_count ELSE 0 END), 0) AS critical_count
    FROM Dates d
    LEFT JOIN Aggregated a ON a.scan_date = d.scan_date
    GROUP BY d.scan_date
);
GO

-- Function: Get score distribution
CREATE OR ALTER FUNCTION dbo.fn_GetScoreDistribution()
RETURNS TABLE
AS
RETURN
(
    SELECT 
        CASE 
            WHEN risk_score >= 80 THEN 'CRITICAL'
            WHEN risk_score >= 50 THEN 'HIGH'
            WHEN risk_score >= 30 THEN 'MEDIUM'
            ELSE 'LOW/CLEAN'
        END as score_range,
        COUNT(*) as scan_count
    FROM dbo.Scans
    GROUP BY 
        CASE 
            WHEN risk_score >= 80 THEN 'CRITICAL'
            WHEN risk_score >= 50 THEN 'HIGH'
            WHEN risk_score >= 30 THEN 'MEDIUM'
            ELSE 'LOW/CLEAN'
        END
);
GO

-- Function: Search scans by filename or hash
CREATE OR ALTER FUNCTION dbo.fn_SearchScans(@searchTerm NVARCHAR(255))
RETURNS TABLE
AS
RETURN
(
    SELECT 
        id, filename, file_hash, file_size, file_type, mime_type,
        verdict, risk_score, created_at
    FROM dbo.Scans
    WHERE filename LIKE '%' + @searchTerm + '%' 
       OR file_hash LIKE '%' + @searchTerm + '%'
);
GO

-- Function: Get threat by type with parsed JSON
CREATE OR ALTER FUNCTION dbo.fn_GetThreatByType(@type NVARCHAR(50))
RETURNS TABLE
AS
RETURN
(
    SELECT 
        id, type, name, description,
        JSON_QUERY(characteristics) as characteristics,
        JSON_QUERY(score_weights) as score_weights,
        severity
    FROM dbo.Threats
    WHERE type = @type
);
GO

-- =====================================================================
-- STORED PROCEDURES - SCANS
-- =====================================================================

-- Procedure: Create a new scan record
CREATE OR ALTER PROCEDURE dbo.sp_CreateScan
    @filename NVARCHAR(255),
    @fileHash NVARCHAR(64),
    @fileSize BIGINT,
    @fileType NVARCHAR(50),
    @mimeType NVARCHAR(100),
    @riskScore INT,
    @analysisDetails NVARCHAR(MAX),
    @scanId INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @verdict NVARCHAR(20) = dbo.fn_GetVerdictFromScore(@riskScore);
    
    INSERT INTO dbo.Scans (filename, file_hash, file_size, file_type, mime_type, verdict, risk_score, analysis_details)
    VALUES (@filename, @fileHash, @fileSize, @fileType, @mimeType, @verdict, @riskScore, @analysisDetails);
    
    SET @scanId = SCOPE_IDENTITY();
    
    RETURN 0;
END;
GO

-- Procedure: Get scans with filters and pagination
CREATE OR ALTER PROCEDURE dbo.sp_GetScans
    @verdict NVARCHAR(20) = NULL,
    @dateFrom DATETIME2 = NULL,
    @dateTo DATETIME2 = NULL,
    @search NVARCHAR(255) = NULL,
    @limit INT = 50,
    @offset INT = 0,
    @totalCount INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @sql NVARCHAR(MAX);
    DECLARE @where NVARCHAR(MAX) = 'WHERE 1=1';
    DECLARE @params NVARCHAR(MAX) = '@limit INT, @offset INT, @totalCount INT OUTPUT';
    DECLARE @searchPattern NVARCHAR(255) = NULL;
    
    IF @verdict IS NOT NULL
    BEGIN
        SET @where = @where + ' AND verdict = @verdict';
        SET @params = @params + ', @verdict NVARCHAR(20)';
    END
    
    IF @dateFrom IS NOT NULL
    BEGIN
        SET @where = @where + ' AND created_at >= @dateFrom';
        SET @params = @params + ', @dateFrom DATETIME2';
    END
    
    IF @dateTo IS NOT NULL
    BEGIN
        SET @where = @where + ' AND created_at <= @dateTo';
        SET @params = @params + ', @dateTo DATETIME2';
    END
    
    IF @search IS NOT NULL AND @search <> ''
    BEGIN
        SET @where = @where + ' AND (filename LIKE @searchPattern OR file_hash LIKE @searchPattern)';
        SET @params = @params + ', @searchPattern NVARCHAR(255)';
        SET @searchPattern = '%' + @search + '%';
    END
    
    -- Count total
    SET @sql = N'SELECT @totalCount = COUNT(*) FROM dbo.Scans ' + @where;
    EXEC sp_executesql @sql, @params, 
        @verdict = @verdict, 
        @dateFrom = @dateFrom, 
        @dateTo = @dateTo, 
        @searchPattern = @searchPattern,
        @limit = @limit, 
        @offset = @offset,
        @totalCount = @totalCount OUTPUT;
    
    -- Get paginated results
    SET @sql = N'
        SELECT id, filename, file_hash, file_size, file_type, mime_type, verdict, risk_score, analysis_details, created_at, updated_at
        FROM dbo.Scans
        ' + @where + '
        ORDER BY created_at DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
    
    EXEC sp_executesql @sql, @params, 
        @verdict = @verdict, 
        @dateFrom = @dateFrom, 
        @dateTo = @dateTo, 
        @searchPattern = @searchPattern,
        @limit = @limit, 
        @offset = @offset;
    
    RETURN 0;
END;
GO

-- Procedure: Get scan by ID with events
CREATE OR ALTER PROCEDURE dbo.sp_GetScanById
    @scanId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Scan details
    SELECT 
        id, filename, file_hash, file_size, file_type, mime_type,
        verdict, risk_score, analysis_details, created_at, updated_at
    FROM dbo.Scans
    WHERE id = @scanId;
    
    -- Events
    SELECT 
        id, scan_id, event_type, severity, message, metadata, timestamp
    FROM dbo.ScanEvents
    WHERE scan_id = @scanId
    ORDER BY timestamp ASC;
    
    RETURN 0;
END;
GO

-- Procedure: Delete scan (cascades to events)
CREATE OR ALTER PROCEDURE dbo.sp_DeleteScan
    @scanId INT,
    @rowsAffected INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    DELETE FROM dbo.Scans WHERE id = @scanId;
    SET @rowsAffected = @@ROWCOUNT;
    
    RETURN 0;
END;
GO

-- Procedure: Get dashboard statistics
CREATE OR ALTER PROCEDURE dbo.sp_GetDashboardStats
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Overall stats
    SELECT * FROM dbo.fn_GetScanStats();
    
    -- Recent activity (30 days)
    SELECT * FROM dbo.fn_GetRecentActivity(30) ORDER BY scan_date;
    
    -- Score distribution
    SELECT * FROM dbo.fn_GetScoreDistribution();
    
    RETURN 0;
END;
GO

-- Procedure: Get scans by verdict for chart
CREATE OR ALTER PROCEDURE dbo.sp_GetVerdictCounts
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT verdict, COUNT(*) as count
    FROM dbo.Scans
    GROUP BY verdict
    ORDER BY 
        CASE verdict 
            WHEN 'CRITICAL' THEN 1
            WHEN 'HIGH' THEN 2
            WHEN 'MEDIUM' THEN 3
            WHEN 'LOW' THEN 4
            WHEN 'CLEAN' THEN 5
            ELSE 6
        END;
    
    RETURN 0;
END;
GO

-- Procedure: Clean old scans (retention policy)
CREATE OR ALTER PROCEDURE dbo.sp_CleanOldScans
    @retentionDays INT = 90,
    @deletedCount INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    DELETE FROM dbo.Scans 
    WHERE created_at < DATEADD(day, -@retentionDays, SYSDATETIME());
    
    SET @deletedCount = @@ROWCOUNT;
    
    RETURN 0;
END;
GO

-- =====================================================================
-- STORED PROCEDURES - SCAN EVENTS
-- =====================================================================

-- Procedure: Bulk insert scan events (for performance during emulation)
CREATE OR ALTER PROCEDURE dbo.sp_BulkInsertScanEvents
    @scanId INT,
    @events NVARCHAR(MAX) -- JSON array of events
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO dbo.ScanEvents (scan_id, event_type, severity, message, metadata, timestamp)
    SELECT 
        @scanId,
        JSON_VALUE(value, '$.eventType'),
        JSON_VALUE(value, '$.severity'),
        JSON_VALUE(value, '$.message'),
        JSON_QUERY(value, '$.metadata'),
        CAST(JSON_VALUE(value, '$.timestamp') AS DATETIME2)
    FROM OPENJSON(@events);
    
    RETURN 0;
END;
GO

-- Procedure: Get events for a scan with filtering
CREATE OR ALTER PROCEDURE dbo.sp_GetScanEvents
    @scanId INT,
    @severity NVARCHAR(20) = NULL,
    @eventType NVARCHAR(50) = NULL,
    @limit INT = 1000
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT TOP (@limit)
        id, scan_id, event_type, severity, message, metadata, timestamp
    FROM dbo.ScanEvents
    WHERE scan_id = @scanId
        AND (@severity IS NULL OR severity = @severity)
        AND (@eventType IS NULL OR event_type = @eventType)
    ORDER BY timestamp ASC;
    
    RETURN 0;
END;
GO

-- Procedure: Get event statistics for a scan
CREATE OR ALTER PROCEDURE dbo.sp_GetScanEventStats
    @scanId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        event_type,
        severity,
        COUNT(*) as event_count,
        MIN(timestamp) as first_occurrence,
        MAX(timestamp) as last_occurrence
    FROM dbo.ScanEvents
    WHERE scan_id = @scanId
    GROUP BY event_type, severity
    ORDER BY event_count DESC;
    
    RETURN 0;
END;
GO

-- =====================================================================
-- STORED PROCEDURES - THREATS
-- =====================================================================

-- Procedure: Get all threats
CREATE OR ALTER PROCEDURE dbo.sp_GetAllThreats
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        id, type, name, description,
        JSON_QUERY(characteristics) as characteristics,
        JSON_QUERY(score_weights) as score_weights,
        severity, created_at, updated_at
    FROM dbo.Threats
    ORDER BY type;
    
    RETURN 0;
END;
GO

-- Procedure: Upsert threat (insert or update)
CREATE OR ALTER PROCEDURE dbo.sp_UpsertThreat
    @type NVARCHAR(50),
    @name NVARCHAR(100),
    @description NVARCHAR(MAX),
    @characteristics NVARCHAR(MAX), -- JSON array
    @scoreWeights NVARCHAR(MAX),    -- JSON object
    @severity NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    
    MERGE dbo.Threats AS target
    USING (SELECT @type as type) AS source
    ON target.type = source.type
    WHEN MATCHED THEN
        UPDATE SET 
            name = @name,
            description = @description,
            characteristics = @characteristics,
            score_weights = @scoreWeights,
            severity = @severity,
            updated_at = SYSDATETIME()
    WHEN NOT MATCHED THEN
        INSERT (type, name, description, characteristics, score_weights, severity)
        VALUES (@type, @name, @description, @characteristics, @scoreWeights, @severity);
    
    RETURN 0;
END;
GO

-- Procedure: Get threat statistics
CREATE OR ALTER PROCEDURE dbo.sp_GetThreatStats
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        severity,
        COUNT(*) as threat_count
    FROM dbo.Threats
    GROUP BY severity
    ORDER BY 
        CASE severity
            WHEN 'CRITICAL' THEN 1
            WHEN 'HIGH' THEN 2
            WHEN 'MEDIUM' THEN 3
            WHEN 'LOW' THEN 4
            ELSE 5
        END;
    
    RETURN 0;
END;
GO

-- =====================================================================
-- STORED PROCEDURES - ANALYSIS HELPERS
-- =====================================================================

-- Procedure: Record analysis finding (for audit trail)
CREATE OR ALTER PROCEDURE dbo.sp_RecordAnalysisFinding
    @scanId INT,
    @category NVARCHAR(50),
    @pattern NVARCHAR(255),
    @description NVARCHAR(MAX),
    @score INT,
    @matches INT,
    @matchExamples NVARCHAR(MAX) -- JSON array
AS
BEGIN
    SET NOCOUNT ON;
    
    -- This could be stored in a separate findings table if needed
    -- For now, we'll add it as a scan event
    INSERT INTO dbo.ScanEvents (scan_id, event_type, severity, message, metadata)
    VALUES (
        @scanId,
        'analysis_finding',
        CASE 
            WHEN @score >= 20 THEN 'CRITICAL'
            WHEN @score >= 10 THEN 'WARNING'
            ELSE 'INFO'
        END,
        @description,
        (SELECT category=@category, pattern=@pattern, score=@score, matches=@matches, examples=JSON_QUERY(@matchExamples) FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)
    );
    
    RETURN 0;
END;
GO

-- Procedure: Update scan risk score and verdict (during emulation)
CREATE OR ALTER PROCEDURE dbo.sp_UpdateScanRiskScore
    @scanId INT,
    @riskScore INT,
    @verdict NVARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @newVerdict NVARCHAR(20) = ISNULL(@verdict, dbo.fn_GetVerdictFromScore(@riskScore));
    
    UPDATE dbo.Scans
    SET risk_score = @riskScore,
        verdict = @newVerdict,
        updated_at = SYSDATETIME()
    WHERE id = @scanId;
    
    RETURN 0;
END;
GO

-- Procedure: Get duplicate scan by hash
CREATE OR ALTER PROCEDURE dbo.sp_GetScanByHash
    @fileHash NVARCHAR(64)
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT TOP 1
        id, filename, file_hash, file_size, file_type, mime_type,
        verdict, risk_score, analysis_details, created_at
    FROM dbo.Scans
    WHERE file_hash = @fileHash
    ORDER BY created_at DESC;
    
    RETURN 0;
END;
GO

-- =====================================================================
-- TRIGGERS
-- =====================================================================

-- Trigger: Auto-update updated_at on Scans
CREATE OR ALTER TRIGGER trg_Scans_UpdatedAt
ON dbo.Scans
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE dbo.Scans
    SET updated_at = SYSDATETIME()
    FROM dbo.Scans s
    INNER JOIN inserted i ON s.id = i.id
    WHERE s.updated_at = i.updated_at; -- Only if not explicitly updated
END;
GO

-- Trigger: Auto-update updated_at on Threats
CREATE OR ALTER TRIGGER trg_Threats_UpdatedAt
ON dbo.Threats
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE dbo.Threats
    SET updated_at = SYSDATETIME()
    FROM dbo.Threats t
    INNER JOIN inserted i ON t.id = i.id
    WHERE t.updated_at = i.updated_at;
END;
GO

-- Trigger: Log scan creation
CREATE OR ALTER TRIGGER trg_Scans_AfterInsert
ON dbo.Scans
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO dbo.ScanEvents (scan_id, event_type, severity, message, metadata)
    SELECT 
        i.id,
        'scan_created',
        'INFO',
        'Scan initiated for file: ' + i.filename,
        (SELECT filename=i.filename, file_type=i.file_type, file_size=i.file_size FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)
    FROM inserted i;
END;
GO

