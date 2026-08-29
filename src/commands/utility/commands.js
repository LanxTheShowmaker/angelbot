import { SlashCommandBuilder, MessageFlags, EmbedBuilder } from "discord.js";
export default {
    data: new SlashCommandBuilder().setName("commands").setDescription("List all commands"),
    category:"Utility",
    async execute(interaction){
        const cmds=interaction.client.commands;
        const embed=new EmbedBuilder().setColor(0x9b8ecf).setTitle("Commands — "+cmds.size).setDescription([...cmds.keys()].sort().join(", ").slice(0,4000));
        return interaction.reply({ embeds:[embed], flags: MessageFlags.Ephemeral});
    }
};