import { SlashCommandBuilder, MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
export default {
    data: new SlashCommandBuilder().setName("invite").setDescription("Invite bot"),
    category:"Utility",
    async execute(interaction){
        const url=`https://discord.com/oauth2/authorize?client_id=${interaction.client.user.id}&permissions=8&scope=bot%20applications.commands`;
        const row=new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel("Invite").setStyle(ButtonStyle.Link).setURL(url));
        return interaction.reply({ embeds:[new EmbedBuilder().setColor(0x9b8ecf).setDescription(`[Invite](${url})`)], components:[row], flags: MessageFlags.Ephemeral});
    }
};