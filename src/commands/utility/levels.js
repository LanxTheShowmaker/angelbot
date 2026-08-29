import { SlashCommandBuilder, MessageFlags, EmbedBuilder } from "discord.js";
export default {
    data: new SlashCommandBuilder().setName("levels").setDescription("Show levels config"),
    category:"Utility",
    async execute(interaction){
        const cfg=await interaction.client.services.leveling.getConfig(interaction.guildId);
        const embed=new EmbedBuilder().setColor(0x9b8ecf).setTitle("Levels Config").setDescription(`Multiplier x${cfg.xpMultiplier} • Streak ${cfg.streakEnabled?"on":"off"} • AntiFarm ${cfg.antiFarmEnabled?"on":"off"}`);
        return interaction.reply({ embeds:[embed], flags: MessageFlags.Ephemeral});
    }
};