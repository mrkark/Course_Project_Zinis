const db=require('../config/database');
class Threat { static format(r){return{id:r.id,type:r.type,name:r.name,description:r.description,characteristics:r.characteristics?JSON.parse(r.characteristics):[],scoreWeights:r.score_weights?JSON.parse(r.score_weights):{},severity:r.severity};} static async findAll(){const r=await db.query('SELECT * FROM dbo.Threats ORDER BY id');return r.recordset.map(this.format);} static async findByType(type){const r=await db.query('SELECT * FROM dbo.Threats WHERE type=@type',{type});return r.recordset[0]?this.format(r.recordset[0]):null;} }
module.exports=Threat;
