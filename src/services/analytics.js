import { logger } from "../core/logger.js";
export class AnalyticsService {
    prisma; client;
    constructor(prisma, client){ this.prisma=prisma; this.client=client; }
    async getSnapshot(guildId){
        const guild = this.client.guilds.cache.get(guildId);
        try{
            const [memberCount, xpCount, economyCount, ticketCount, caseCount, joins, leaves] = await Promise.all([
                guild ? guild.memberCount : this.prisma.auditLog.count({ where:{ guildId, category:"member", action:"join" }}).catch(()=>0),
                this.prisma.xp.count({ where:{ guildId }}).catch(()=>0),
                this.prisma.economy.count({ where:{ guildId }}).catch(()=>0),
                this.prisma.ticket.count({ where:{ guildId }}).catch(()=>0),
                this.prisma.case.count({ where:{ guildId }}).catch(()=>0),
                this.prisma.auditLog.count({ where:{ guildId, action:"join", category:"member" }}).catch(()=>0),
                this.prisma.auditLog.count({ where:{ guildId, action:"leave", category:"member" }}).catch(()=>0),
            ]);
            // Active members: xp with activity last 7 days? approximate via updatedAt
            const weekAgo = new Date(Date.now()-7*86400*1000);
            const active = await this.prisma.xp.count({ where:{ guildId, updatedAt:{ gte: weekAgo }}}).catch(()=>0);
            // Messages: audit logs category message or estimate via xp growth? use audit count
            const messages = await this.prisma.auditLog.count({ where:{ guildId, category:"message" }}).catch(()=>0);
            // Top channels: not tracked yet, placeholder
            return { guildId, memberCount, xpCount, economyCount, ticketCount, caseCount, joins, leaves, active, messages };
        }catch(e){ logger.error("analytics","snapshot failed",e); return null; }
    }
    async getMemberGrowth(guildId, days=14){
        const out=[];
        for(let i=days-1;i>=0;i--){
            const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-i);
            const next=new Date(d); next.setDate(d.getDate()+1);
            const joins = await this.prisma.auditLog.count({ where:{ guildId, action:"join", category:"member", createdAt:{ gte:d, lt: next }}}).catch(()=>0);
            const leaves = await this.prisma.auditLog.count({ where:{ guildId, action:"leave", category:"member", createdAt:{ gte:d, lt: next }}}).catch(()=>0);
            out.push({ date:d.toISOString().slice(0,10), joins, leaves, net:joins-leaves });
        }
        return out;
    }
    async getTopChannels(guildId, limit=5){
        // Use audit logs if we log message channelId in details
        try{
            const logs = await this.prisma.auditLog.findMany({ where:{ guildId, category:"message" }, orderBy:{ createdAt:"desc" }, take:200 }).catch(()=>[]);
            const map=new Map();
            for(const l of logs){
                try{
                    const d=JSON.parse(l.details||"{}");
                    const ch=d.channelId||d.channel||"unknown";
                    map.set(ch,(map.get(ch)||0)+1);
                }catch{}
            }
            return [...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,limit).map(([channelId,count])=>({ channelId, count }));
        }catch{ return []; }
    }
    async getModerationStats(guildId){
        try{
            const cases = await this.prisma.case.groupBy({ by:["action"], where:{ guildId }, _count:{ _all:true }}).catch(()=>[]);
            const recent = await this.prisma.case.findMany({ where:{ guildId }, orderBy:{ createdAt:"desc" }, take:5 }).catch(()=>[]);
            return { byAction:cases, recent };
        }catch{ return { byAction:[], recent:[] }; }
    }
}
