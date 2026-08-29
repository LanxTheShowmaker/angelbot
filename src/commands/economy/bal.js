import { SlashCommandBuilder, MessageFlags, EmbedBuilder } from "discord.js";
import { Theme } from "../../design/theme.js";
export default {
    data: new SlashCommandBuilder().setName("bal").setDescription("Check your coins (alias to /balance)").addUserOption(o=>o.setName("user").setDescription("User")),
    category:"Economy",
    async execute(interaction){
        const balMod=await import("./balance.js");
        return balMod.default.execute(interaction);
    }
};