import { SlashCommandBuilder, MessageFlags, EmbedBuilder } from "discord.js";
import { Theme } from "../../design/theme.js";
import { embeds } from "../../design/embeds.js";
export default {
    data: new SlashCommandBuilder().setName("rank").setDescription("Show leveling rank").addUserOption(o=>o.setName("user").setDescription("User").setRequired(false)),
    category:"Utility",
    async execute(interaction){
        const user = interaction.options.getUser("user") ?? interaction.user;
        const data = await interaction.client.services.leveling.getRank(interaction.guildId, user.id);
        if(!data) return interaction.reply({ embeds:[new EmbedBuilder().setColor(Theme.muted).setDescription(`No XP yet for ${user.tag} — chat to earn XP!`)], flags: MessageFlags.Ephemeral });
        const svc = interaction.client.services.leveling;
        const prog = svc.formatProgress(data.xp, data.level);
        const rankLine = data.total ? `**Rank:** #${data.rank} / ${data.total}` : `**Rank:** #${data.rank}`;
        const embed = new EmbedBuilder().setColor(Theme.gold).setAuthor({ name:`${user.tag} — Level ${data.level}`, iconURL:user.displayAvatarURL() })
            .setDescription(`**XP:** ${data.xp}/${prog.need} • ${rankLine}\n${prog.bar} ${prog.pct}%\n\n*Next level in **${prog.need - data.xp}** XP • Try **/leaderboard***`)
            .setThumbnail(user.displayAvatarURL({ size:256 }))
            .setFooter({ text:"A.N.G.E.L. • leveling" }).setTimestamp();
        await interaction.reply({ embeds:[embed], flags: MessageFlags.Ephemeral });
    }
};
