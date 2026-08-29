import { logger } from "../core/logger.js";
// Deterministic internal intelligence — heuristics, no LLM
export class IntelligenceService {
    prisma; client;
    constructor(prisma, client){ this.prisma=prisma; this.client=client; }
    // Risk scoring: 0-100
    scoreMessage({ content="", mentions={ users:{size:0}, roles:{size:0}, everyone:false }, accountAgeMs=null, velocity=null, capsRatio=null, links=null, invites=null }){
        let score=0; const reasons=[];
        const len=content.length;
        if(mentions.everyone){ score+=25; reasons.push("everyone"); }
        const totalMentions=(mentions.users?.size||0)+(mentions.roles?.size||0);
        if(totalMentions>5){ score+=30; reasons.push(`mentions:${totalMentions}`); }
        else if(totalMentions>2){ score+=10; reasons.push("mentions medium"); }
        if(len>0 && capsRatio!==null && capsRatio>0.7 && len>20){ score+=15; reasons.push("caps"); }
        if(links){ score+=10; reasons.push("links"); }
        if(invites){ score+=15; reasons.push("invites"); }
        if(content.match(/(discord\.gift|free.*nitro|steam.*gift)/i)){ score+=20; reasons.push("scam"); }
        if(velocity!==null && velocity>5){ score+=20; reasons.push(`velocity:${velocity}`); }
        if(accountAgeMs!==null && accountAgeMs < 7*86400*1000){ score+=10; reasons.push("new account"); }
        // Obfuscation: zero-width, zalgo
        const zw = (content.match(/[\u200B\u200C\u200D\uFEFF]/g)||[]).length;
        if(zw>0){ score+=10; reasons.push("obfuscation"); }
        const combining = (content.match(/\p{M}/gu)||[]).length;
        if(combining>15){ score+=10; reasons.push("zalgo"); }
        score=Math.min(100,score);
        let level="LOW"; if(score>=70) level="CRITICAL"; else if(score>=45) level="HIGH"; else if(score>=20) level="MEDIUM";
        return { score, level, reasons };
    }
    scoreJoin({ accountAgeMs, recentJoinsCount=0, isBot=false }){
        let score=0; const reasons=[];
        if(accountAgeMs!==null && accountAgeMs < 3*86400*1000){ score+=25; reasons.push("very new"); }
        else if(accountAgeMs < 7*86400*1000){ score+=10; reasons.push("new"); }
        if(recentJoinsCount>10){ score+=30; reasons.push(`burst:${recentJoinsCount}`); }
        else if(recentJoinsCount>5){ score+=15; reasons.push("burst medium"); }
        if(isBot){ score+=10; reasons.push("bot"); }
        score=Math.min(100,score);
        let level="LOW"; if(score>=60) level="HIGH"; else if(score>=30) level="MEDIUM";
        return { score, level, reasons };
    }
    classifyActivity(metrics){
        // Correlate multiple signals
        const { joinBurst=0, msgVelocity=0, mentionSpam=0, newAccounts=0 } = metrics;
        let risk=0;
        if(joinBurst>8) risk+=30;
        if(msgVelocity>10) risk+=30;
        if(mentionSpam>5) risk+=20;
        if(newAccounts>5) risk+=20;
        risk=Math.min(100,risk);
        return risk;
    }
    async getUserHistory(guildId, userId){
        try{
            const cases = await this.prisma.case.findMany({ where:{ guildId, targetId:userId }, orderBy:{ createdAt:"desc" }, take:10 }).catch(()=>[]);
            const xp = await this.prisma.xp.findUnique({ where:{ guildId_userId:{ guildId, userId }}}).catch(()=>null);
            const bal = await this.prisma.economy.findUnique({ where:{ guildId_userId:{ guildId, userId }}}).catch(()=>null);
            return { cases, xp, economy: bal };
        }catch(e){ logger.error("intelligence","history failed",e); return { cases:[], xp:null, economy:null }; }
    }
}
