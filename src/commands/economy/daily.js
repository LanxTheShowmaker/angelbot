import { SlashCommandBuilder, MessageFlags, EmbedBuilder } from "discord.js";
import { Theme } from "../../design/theme.js";
const cooldown = new Map();
export default {
    data: new SlashCommandBuilder().setName("daily").setDescription("Claim daily 100 coins"),
    category:"Economy",
    async execute(interaction){
        const key=`${interaction.guildId}:${interaction.user.id}`;
        const now=Date.now();
        const last=cooldown.get(key) ?? 0;
        if(now-last < 24*3600*1000) return interaction.reply({ content:`Already claimed — <t:${Math.floor((last+24*3600*1000)/1000)}:R>`, flags: MessageFlags.Ephemeral });
        cooldown.set(key, now);
        const bal = await interaction.client.services.economy.add(interaction.guildId, interaction.user.id, 100);
        const embed = new EmbedBuilder().setColor(Theme.success).setDescription(`Claimed **100** coins — balance **${bal}**`);
        await interaction.reply({ embeds:[embed], flags: MessageFlags.Ephemeral });
    }
};
