import { EmbedBuilder } from "discord.js";
import { logger } from "../core/logger.js";
export class StarboardService {
    prisma; client;
    constructor(prisma, client){ this.prisma=prisma; this.client=client; }
    async handleReactionAdd(reaction, user){
        if(user.bot) return;
        const msg = reaction.message;
        if(!msg.guild) return;
        const cfg = await this.prisma.starboardConfig.findUnique({ where:{ guildId: msg.guild.id }}).catch(()=>null);
        if(!cfg) return;
        if(reaction.emoji.name !== cfg.emoji) return;
        const count = reaction.count ?? 1;
        if(count < cfg.threshold) return;
        const ch = msg.guild.channels.cache.get(cfg.channelId) ?? await msg.guild.channels.fetch(cfg.channelId).catch(()=>null);
        if(!ch || !ch.isTextBased()) return;
        const embed = new EmbedBuilder().setColor(0xfacc15).setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() }).setDescription(msg.content?.slice(0,4000) || "[image]").setFooter({ text:`⭐ ${count} • #${msg.channel.name}`}).setTimestamp();
        if(msg.attachments.first()) embed.setImage(msg.attachments.first().url);
        await ch.send({ embeds:[embed], content:`**Starred** ${msg.url}` }).catch(e=>logger.error("starboard","send",e));
    }
}
