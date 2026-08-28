import { SlashCommandBuilder, MessageFlags, EmbedBuilder } from "discord.js";
import { Theme } from "../../design/theme.js";
export default {
    data: new SlashCommandBuilder().setName("rank").setDescription("Show leveling rank").addUserOption(o=>o.setName("user").setDescription("User").setRequired(false)),
    category:"Utility",
    async execute(interaction){
        const user = interaction.options.getUser("user") ?? interaction.user;
        const data = await interaction.client.services.leveling.getRank(interaction.guildId, user.id);
        if(!data) return interaction.reply({ embeds:[new EmbedBuilder().setColor(Theme.muted).setDescription(`No XP yet for ${user.tag}`)], flags: MessageFlags.Ephemeral });
        const embed = new EmbedBuilder().setColor(Theme.gold).setAuthor({ name:`${user.tag} — Level ${data.level}`, iconURL:user.displayAvatarURL() }).setDescription(`**XP:** ${data.xp}/${data.next} • **Rank:** #${data.rank}`).setThumbnail(user.displayAvatarURL({ size:256 }));
        await interaction.reply({ embeds:[embed], flags: MessageFlags.Ephemeral });
    }
};
