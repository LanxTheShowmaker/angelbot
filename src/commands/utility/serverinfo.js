import { SlashCommandBuilder, MessageFlags } from "discord.js";
import info from "./info.js";
export default {
    data: new SlashCommandBuilder().setName("serverinfo").setDescription("Show server info (alias to /info server)"),
    category:"Utility",
    async execute(interaction){
        const fake={ ...interaction, options:{ ...interaction.options, getSubcommand:()=> "server", getString:()=>null, getUser:()=>null, getInteger:()=>null, getChannel:()=>null } };
        return info.execute(fake);
    }
};