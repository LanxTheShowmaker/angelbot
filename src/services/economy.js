import { EmbedBuilder } from "discord.js";
import { Theme } from "../design/theme.js";
import { logger } from "../core/logger.js";
export class EconomyService {
    prisma; client;
    constructor(prisma, client){ this.prisma=prisma; this.client=client; }
    async add(guildId, userId, amount){
        const row = await this.prisma.economy.findUnique({ where:{ guildId_userId:{ guildId, userId }}}).catch(()=>null);
        const bal = (row?.balance ?? 0) + amount;
        await this.prisma.economy.upsert({ where:{ guildId_userId:{ guildId, userId }}, update:{ balance: bal }, create:{ guildId, userId, balance: amount }});
        return bal;
    }
    async get(guildId, userId){ const r=await this.prisma.economy.findUnique({ where:{ guildId_userId:{ guildId, userId }}}).catch(()=>null); return r?.balance ?? 0; }
    async handleMessage(message){
        if(message.author.bot || !message.guild) return;
        // 5-15 coins per minute, reuse leveling cooldown style via random chance 10%
        if(Math.random()>0.1) return;
        await this.add(message.guild.id, message.author.id, Math.floor(Math.random()*10)+5).catch(()=>{});
    }
}
