import { SlashCommandBuilder, MessageFlags, EmbedBuilder } from "discord.js";
export default {
    data: new SlashCommandBuilder().setName("uptime").setDescription("Bot uptime"),
    category:"Utility",
    async execute(interaction){
        const ms=interaction.client.uptime||0;
        const s=Math.floor(ms/1000); const d=Math.floor(s/86400); const h=Math.floor(s%86400/3600); const m=Math.floor(s%3600/60);
        return interaction.reply({ embeds:[new EmbedBuilder().setColor(0x9b8ecf).setDescription(`Uptime: ${d}d ${h}h ${m}m`)], flags: MessageFlags.Ephemeral});
    }
};