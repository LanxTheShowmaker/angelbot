import { logger } from "../core/logger.js";
import { embeds } from "../design/embeds.js";
export class RaidProtectionService {
    prisma; client;
    settings; logging; intelligence;
    joinWindow = new Map(); // guildId -> timestamps[]
    msgWindow = new Map(); // guildId -> timestamps[]
    raidState = new Map(); // guildId -> { active, since, level }
    constructor(prisma, client, settings, logging, intelligence){
        this.prisma=prisma; this.client=client; this.settings=settings; this.logging=logging; this.intelligence=intelligence;
    }
    trackJoin(guildId){
        const now=Date.now();
        const arr=this.joinWindow.get(guildId)||[];
        arr.push(now);
        const windowMs=30_000;
        const recent=arr.filter(t=>now-t<windowMs);
        this.joinWindow.set(guildId, recent);
        return recent.length;
    }
    trackMessage(guildId){
        const now=Date.now();
        const arr=this.msgWindow.get(guildId)||[];
        arr.push(now);
        const windowMs=10_000;
        const recent=arr.filter(t=>now-t<windowMs);
        this.msgWindow.set(guildId, recent);
        return recent.length;
    }
    async assess(guildId, { joins=null, msgs=null, newAccounts=0 }={}){
        const j=joins ?? (this.joinWindow.get(guildId)?.length||0);
        const m=msgs ?? (this.msgWindow.get(guildId)?.length||0);
        const risk=this.intelligence.classifyActivity({ joinBurst:j, msgVelocity:m, newAccounts });
        let level="LOW"; if(risk>=70) level="CRITICAL"; else if(risk>=45) level="HIGH"; else if(risk>=20) level="MEDIUM";
        return { risk, level, joins:j, msgs:m };
    }
    async maybeTrigger(guild, reason="raid"){
        const guildId=guild.id;
        const cfg=await this.settings.get(guildId).catch(()=>null);
        if(!cfg) return null;
        const am=cfg.automod || {};
        if(am.autoLockdown===false) return null;
        const state=this.raidState.get(guildId);
        if(state?.active) return state;
        const assessment=await this.assess(guildId);
        if(assessment.level!=="CRITICAL" && assessment.level!=="HIGH") return null;
        // Trigger lockdown via fortress
        try{
            await this.client?.services?.fortress?.autoEnable(guild, cfg).catch(()=>{});
            this.raidState.set(guildId,{ active:true, since:Date.now(), level:assessment.level, reason });
            await this.prisma.raidIncident.create({ data:{ guildId, type:reason, risk:assessment.risk, details: JSON.stringify(assessment) }}).catch(()=>{});
            await this.alertStaff(guild, assessment, reason);
            // Auto recovery after 10 min if not manually handled
            setTimeout(()=> this.autoRecover(guild).catch(()=>{}), 10*60*1000);
            return assessment;
        }catch(e){ logger.error("raid","trigger failed",e); return null; }
    }
    async alertStaff(guild, assessment, reason){
        const cfg=await this.settings.get(guild.id).catch(()=>null);
        const chId=cfg?.modLogChannelId || cfg?.logChannelId;
        if(!chId) return;
        const ch=guild.channels.cache.get(chId) ?? await guild.channels.fetch(chId).catch(()=>null);
        if(!ch) return;
        await ch.send({ embeds:[embeds.warn("Raid protection — incident", `Risk **${assessment.level}** (${assessment.risk}/100)\nJoins 10s: **${assessment.joins}** • Msgs 10s: **${assessment.msgs}**\nReason: ${reason}\n\nAutomatic lockdown enabled. Use \`/fortress status\` or \`/fortress disable\` to review.`)] }).catch(()=>{});
    }
    async autoRecover(guild){
        const state=this.raidState.get(guild.id);
        if(!state?.active) return;
        // If joins/msg burst has calmed, auto-disable fortress if it was auto-enabled
        const a=await this.assess(guild.id);
        if(a.risk<20){
            await this.client?.services?.fortress?.autoDisable?.(guild).catch(()=>{});
            this.raidState.set(guild.id,{ active:false, since:null });
            await this.prisma.raidIncident.updateMany({ where:{ guildId:guild.id, resolved:false }, data:{ resolved:true }}).catch(()=>{});
            const cfg=await this.settings.get(guild.id).catch(()=>null);
            const chId=cfg?.modLogChannelId;
            const ch=chId? guild.channels.cache.get(chId) ?? await guild.channels.fetch(chId).catch(()=>null) : null;
            if(ch) await ch.send({ embeds:[embeds.success("Raid protection — recovered", `Risk lowered to **${a.level}** (${a.risk}). Lockdown auto-recovered.`)] }).catch(()=>{});
        }
    }
    async status(guildId){
        const a=await this.assess(guildId);
        const state=this.raidState.get(guildId)||{ active:false };
        const incidents=await this.prisma.raidIncident.findMany({ where:{ guildId }, orderBy:{ createdAt:"desc" }, take:5 }).catch(()=>[]);
        return { assessment:a, state, incidents };
    }
}
