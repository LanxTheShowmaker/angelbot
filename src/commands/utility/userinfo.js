import { SlashCommandBuilder, MessageFlags } from "discord.js";
import whois from "./whois.js";
export default {
    data: new SlashCommandBuilder().setName("userinfo").setDescription("Show user info (alias to /whois)").addUserOption(o=>o.setName("user").setDescription("User").setRequired(false)).addStringOption(o=>o.setName("userid").setDescription("User ID")),
    category:"Utility",
    async execute(interaction){
        return whois.execute(interaction);
    }
};