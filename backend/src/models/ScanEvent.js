const db=require('../config/database');
class ScanEvent {
 static async create(d){const r=await db.query(`INSERT INTO dbo.ScanEvents(scan_id,event_type,severity,message,metadata,timestamp) OUTPUT INSERTED.* VALUES(@scanId,@eventType,@severity,@message,@metadata,COALESCE(@eventTimestamp,SYSDATETIME()))`,{scanId:d.scanId,eventType:d.eventType,severity:d.severity,message:d.message,metadata:d.metadata?JSON.stringify(d.metadata):null,eventTimestamp:d.timestamp||null});return r.recordset[0];}
 static async bulkCreate(scanId,events){for(const e of events) await this.create({...e,scanId});return events.length;}
 static async findByScanId(scanId){const r=await db.query('SELECT * FROM dbo.ScanEvents WHERE scan_id=@scanId ORDER BY timestamp ASC,id ASC',{scanId});return r.recordset.map(e=>({...e,eventType:e.event_type,scanId:e.scan_id,metadata:e.metadata?JSON.parse(e.metadata):null,timestamp:e.timestamp}));}
}
module.exports=ScanEvent;
