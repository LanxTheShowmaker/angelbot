import { SlashCommandBuilder, MessageFlags, ChannelType } from "discord.js";
import { embeds } from "../../design/embeds.js";
export default {
    data: new SlashCommandBuilder().setName("suggest").setDescription("Submit a suggestion").addStringOption(o=>o.setName("content").setDescription("Your suggestion").setRequired(true)).addChannelOption(o=>o.setName("channel").setDescription("Channel").addChannelTypes(ChannelType.GuildText)),
    category:"Utility",
    async execute(interaction){
        const content=interaction.options.getString("content");
        const ch = interaction.options.getChannel("channel") ?? interaction.channel;
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const msg = await interaction.client.services.suggestions.create(interaction.guild, ch, interaction.user, content);
        await interaction.editReply({ content:`Suggested — ${msg.url}` });
    }
};
