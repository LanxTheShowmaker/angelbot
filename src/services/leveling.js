import { EmbedBuilder } from "discord.js";
import { Theme } from "../design/theme.js";
import { logger } from "../core/logger.js";
const COOLDOWN = 60_000;
const cd = new Map();
export function lvlXp(lvl){ return 5 * lvl * lvl + 50 * lvl + 100; }
export function totalXpForLevel(lvl){
    let total=0;
    for(let i=0;i<lvl;i++) total+=lvlXp(i);
    return total;
}
export class LevelingService {
    prisma; client;
    constructor(prisma, client){ this.prisma=prisma; this.client=client; }
    async handleMessage(message){
        if (message.author.bot || !message.guild) return;
        const key = `${message.guild.id}:${message.author.id}`;
        const now = Date.now();
        if (cd.get(key) && now - cd.get(key) < COOLDOWN) return;
        cd.set(key, now);
        try{
            const row = await this.prisma.xp.findUnique({ where:{ guildId_userId:{ guildId:message.guild.id, userId:message.author.id }}}).catch(()=>null);
            let xp = (row?.xp ?? 0) + Math.floor(Math.random()*15+5);
            let level = row?.level ?? 0;
            let needed = lvlXp(level);
            let leveled=false;
            while(xp >= needed){ xp-=needed; level++; needed=lvlXp(level); leveled=true; }
            await this.prisma.xp.upsert({ where:{ guildId_userId:{ guildId:message.guild.id, userId:message.author.id }}, update:{ xp, level }, create:{ guildId:message.guild.id, userId:message.author.id, xp, level }});
            if(leveled){
                const ch = message.channel;
                const embed = new EmbedBuilder().setColor(Theme.gold).setTitle(`✦  Level Up — ${level}`).setDescription(`<@${message.author.id}> reached **level ${level}**!`).setThumbnail(message.author.displayAvatarURL()).setTimestamp()
                    .setFooter({ text: "A.N.G.E.L.  •  keep chatting to earn XP" });
                await ch.send({ content:`<@${message.author.id}>`, embeds:[embed] }).catch(()=>{});
            }
        }catch(e){ logger.error("leveling","xp failed",e); }
    }
    async getRank(guildId, userId){
        const row = await this.prisma.xp.findUnique({ where:{ guildId_userId:{ guildId, userId }}}).catch(()=>null);
        if(!row) return null;
        // Correct rank: order by level desc, xp desc — matches leaderboard semantics
        const all = await this.prisma.xp.findMany({ where:{ guildId }, orderBy:[{ level:"desc" }, { xp:"desc" }] }).catch(()=>[]);
        const rank = all.findIndex(x=>x.userId===userId)+1;
        const total = all.length;
        return { ...row, rank, total, next: lvlXp(row.level) };
    }
    async getLeaderboard(guildId, limit=10, offset=0){
        limit = Math.min(Math.max(limit,1),25);
        offset = Math.max(offset,0);
        const [rows, total] = await Promise.all([
            this.prisma.xp.findMany({ where:{ guildId }, orderBy:[{ level:"desc" }, { xp:"desc" }], take: limit, skip: offset }).catch(()=>[]),
            this.prisma.xp.count({ where:{ guildId } }).catch(()=>0)
        ]);
        return { rows, total };
    }
    formatProgress(xp, level){
        const need = lvlXp(level);
        const pct = Math.min(100, Math.floor((xp/need)*100));
        const filled = Math.floor(pct/10);
        const bar = "▰".repeat(filled) + "▱".repeat(10-filled);
        return { need, pct, bar };
    }
}
