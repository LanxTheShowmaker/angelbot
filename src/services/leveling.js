import { EmbedBuilder } from "discord.js";
import { Theme } from "../design/theme.js";
import { logger } from "../core/logger.js";
const COOLDOWN = 60_000;
const cd = new Map();
function lvlXp(lvl){ return 5 * lvl * lvl + 50 * lvl + 100; }
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
                const embed = new EmbedBuilder().setColor(Theme.gold).setTitle(`Level Up — ${level}`).setDescription(`<@${message.author.id}> reached **level ${level}**!`).setThumbnail(message.author.displayAvatarURL()).setTimestamp();
                await ch.send({ content:`<@${message.author.id}>`, embeds:[embed] }).catch(()=>{});
            }
        }catch(e){ logger.error("leveling","xp failed",e); }
    }
    async getRank(guildId, userId){
        const row = await this.prisma.xp.findUnique({ where:{ guildId_userId:{ guildId, userId }}}).catch(()=>null);
        if(!row) return null;
        const all = await this.prisma.xp.findMany({ where:{ guildId }, orderBy:{ xp:"desc" } }).catch(()=>[]);
        const rank = all.findIndex(x=>x.userId===userId)+1;
        return { ...row, rank, next: lvlXp(row.level) };
    }
}
