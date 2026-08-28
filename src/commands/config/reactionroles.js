import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType } from "discord.js";
import { embeds } from "../../design/embeds.js";
export default {
    data: new SlashCommandBuilder().setName("reactionroles").setDescription("Self-roles panel").addChannelOption(o=>o.setName("channel").setDescription("Channel").addChannelTypes(ChannelType.GuildText).setRequired(true)).addStringOption(o=>o.setName("title").setDescription("Title").setRequired(true)).addStringOption(o=>o.setName("roles").setDescription("roleId:emoji:label, comma separated e.g. 123:🎮:Gamer,456:🎨:Artist").setRequired(true)),
    category:"Config",
    async execute(interaction){
        if(!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({ embeds:[embeds.error("No perm","ManageGuild needed")], flags: MessageFlags.Ephemeral });
        const ch = interaction.options.getChannel("channel");
        const title = interaction.options.getString("title");
        const raw = interaction.options.getString("roles");
        const mappings = raw.split(",").map(s=>{ const [roleId,emoji,label]=s.split(":"); return { roleId:roleId.trim(), emoji:emoji?.trim() ?? "•", label:(label??"Role").trim() }; });
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const msg = await interaction.client.services.reactionRoles.createPanel(interaction.guild, ch, title, mappings);
        await interaction.editReply({ content:`Created in <#${ch.id}> — ${msg.url}` });
    }
};
