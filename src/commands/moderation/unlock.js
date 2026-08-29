import { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } from "discord.js";
import { embeds } from "../../design/embeds.js";
import { isStaff } from "../../core/services.js";
export default {
    data: new SlashCommandBuilder().setName("unlock").setDescription("Unlock channel").addChannelOption(o=>o.setName("channel").setDescription("Channel").setRequired(false)),
    category:"Moderation",
    async execute(interaction){
        const cfg=await interaction.client.services.settings.get(interaction.guildId).catch(()=>null);
        if(!isStaff(interaction.member,cfg) && !interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ embeds:[embeds.error("No permission","")], flags: MessageFlags.Ephemeral});
        const ch=interaction.options.getChannel("channel") || interaction.channel;
        try{
            await ch.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages:null });
            await interaction.client.services.audit?.log(interaction.guildId,{ actorId:interaction.user.id, action:"unlock", category:"moderation", details:{ channelId:ch.id }}).catch(()=>{});
            return interaction.reply({ embeds:[embeds.success("Unlocked",`<#${ch.id}>`)], flags: MessageFlags.Ephemeral});
        }catch(e){ return interaction.reply({ embeds:[embeds.error("Failed",e.message.slice(0,300))], flags: MessageFlags.Ephemeral}); }
    }
};
