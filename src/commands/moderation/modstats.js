import { SlashCommandBuilder, MessageFlags, EmbedBuilder } from "discord.js";
import { isStaff } from "../../core/services.js";
import { Theme } from "../../design/theme.js";
export default {
    data: new SlashCommandBuilder().setName("modstats").setDescription("Moderator statistics").addUserOption(o=>o.setName("moderator").setDescription("Moderator")),
    category:"Moderation",
    async execute(interaction){
        const target=interaction.options.getUser("moderator");
        const svc=interaction.client.services.moderation;
        const data=target? await svc.getModStats(interaction.guildId, target.id) : await svc.getModStats(interaction.guildId);
        const embed=new EmbedBuilder().setColor(Theme.accent).setTitle(target? `${target.tag} — Stats` : "Mod Stats");
        if(target) embed.setDescription(`**${data.count}** cases`).addFields({ name:"Recent", value: data.recent.slice(0,5).map(c=> `#${c.caseNumber} ${c.action}`).join("\n")||"—"});
        else embed.setDescription(`Total ${data.total}`).addFields({name:"By Action", value: data.byAction.map(a=> `${a.action}: ${a._count._all}`).join("\n")||"—"});
        return interaction.reply({ embeds:[embed], flags: MessageFlags.Ephemeral});
    }
};