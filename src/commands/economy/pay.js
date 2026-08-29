import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { embeds } from "../../design/embeds.js";
export default {
    data: new SlashCommandBuilder().setName("pay").setDescription("Pay coins to user").addUserOption(o=>o.setName("user").setDescription("User").setRequired(true)).addIntegerOption(o=>o.setName("amount").setDescription("Amount").setRequired(true).setMinValue(1)),
    category:"Economy",
    async execute(interaction){
        const user=interaction.options.getUser("user",true); const amt=interaction.options.getInteger("amount",true);
        const res=await interaction.client.services.economy.gift(interaction.guildId, interaction.user.id, user.id, amt);
        if(!res.success) return interaction.reply({ embeds:[embeds.error("Failed",res.reason)], flags: MessageFlags.Ephemeral});
        return interaction.reply({ embeds:[embeds.success("Paid",`Gave ${amt} to <@${user.id}>`)], flags: MessageFlags.Ephemeral});
    }
};