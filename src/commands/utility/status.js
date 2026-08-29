import { SlashCommandBuilder, MessageFlags } from "discord.js";
import diagnostics from "./diagnostics.js";
export default {
    data: new SlashCommandBuilder().setName("status").setDescription("Bot status (alias to /diagnostics health)"),
    category:"Utility",
    async execute(interaction){
        const fake={ ...interaction, options:{ ...interaction.options, getSubcommand:()=> "health", getString:()=>null, getInteger:()=>null } };
        return diagnostics.execute(fake);
    }
};