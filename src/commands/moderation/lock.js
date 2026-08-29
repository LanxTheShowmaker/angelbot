import { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } from "discord.js";
import { embeds } from "../../design/embeds.js";
import { isStaff } from "../../core/services.js";
export default {
    data: new SlashCommandBuilder().setName("lock").setDescription("Lock channel (deny SendMessages for @everyone)").addChannelOption(o=>o.setName("channel").setDescription("Channel to lock").setRequired(false)),
    category:"Moderation",
    async execute(interaction){
        const cfg=await interaction.client.services.settings.get(interaction.guildId).catch(()=>null);
        if(!isStaff(interaction.member,cfg) && !interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ embeds:[embeds.error("No permission","ManageChannels or Staff")], flags: MessageFlags.Ephemeral});
        const ch=interaction.options.getChannel("channel") || interaction.channel;
        if(!ch.isTextBased()) return interaction.reply({ embeds:[embeds.error("Invalid","Text channel only")], flags: MessageFlags.Ephemeral});
        try{
            await ch.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages:false });
            await interaction.client.services.audit?.log(interaction.guildId,{ actorId:interaction.user.id, action:"lock", category:"moderation", details:{ channelId:ch.id }}).catch(()=>{});
            return interaction.reply({ embeds:[embeds.success("Locked",`<#${ch.id}> locked`)] , flags: MessageFlags.Ephemeral});
        }catch(e){ return interaction.reply({ embeds:[embeds.error("Failed",e.message.slice(0,300))], flags: MessageFlags.Ephemeral}); }
    }
};
