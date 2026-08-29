import { logger } from "../core/logger.js";
export class AuditService {
    prisma; client;
    constructor(prisma, client){ this.prisma=prisma; this.client=client; }
    async log(guildId, { actorId=null, targetId=null, action, category="general", details=null }){
        if(!guildId || !action) return null;
        try{
            const entry = await this.prisma.auditLog.create({ data:{
                guildId, actorId: actorId?String(actorId):null, targetId: targetId?String(targetId):null,
                action: String(action).slice(0,100), category: String(category).slice(0,50),
                details: details ? JSON.stringify(details).slice(0,2000) : null
            }});
            return entry;
        }catch(e){ logger.error("audit","log failed",e); return null; }
    }
    async timeline(guildId, { category=null, actorId=null, targetId=null, limit=25, before=null }={}){
        const where={ guildId };
        if(category) where.category=category;
        if(actorId) where.actorId=actorId;
        if(targetId) where.targetId=targetId;
        if(before) where.createdAt={ lt: new Date(before) };
        try{
            return await this.prisma.auditLog.findMany({ where, orderBy:{ createdAt:"desc" }, take: Math.min(limit,50) });
        }catch(e){ logger.error("audit","timeline failed",e); return []; }
    }
    async stats(guildId){
        try{
            const groups = await this.prisma.auditLog.groupBy({ by:["category"], where:{ guildId }, _count:{ _all:true } }).catch(()=>[]);
            const total = await this.prisma.auditLog.count({ where:{ guildId } }).catch(()=>0);
            return { total, byCategory: groups };
        }catch(e){ return { total:0, byCategory:[] }; }
    }
}
