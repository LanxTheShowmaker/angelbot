import { SlashCommandBuilder, MessageFlags, EmbedBuilder } from "discord.js";
import { Theme } from "../../design/theme.js";
export default {
    data: new SlashCommandBuilder().setName("balance").setDescription("Check your coins").addUserOption(o=>o.setName("user").setDescription("User")),
    category:"Economy",
    async execute(interaction){
        const user = interaction.options.getUser("user") ?? interaction.user;
        const bal = await interaction.client.services.economy.get(interaction.guildId, user.id);
        const embed = new EmbedBuilder().setColor(Theme.gold).setDescription(`<@${user.id}> has **${bal}** coins${user.id===interaction.user.id?"\n*Visit* `/shop view` *to spend them!*":""}`)
            .setAuthor({ name:`Balance — ${user.tag}`, iconURL:user.displayAvatarURL()})
            .setFooter({ text:"A.N.G.E.L. • economy" }).setTimestamp();
        await interaction.reply({ embeds:[embed], flags: MessageFlags.Ephemeral });
    }
};
