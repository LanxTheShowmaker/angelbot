import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType } from "discord.js";
import { embeds } from "../../design/embeds.js";
export default {
    data: new SlashCommandBuilder().setName("starboard").setDescription("Starboard").addSubcommand(s=>s.setName("set").setDescription("Set channel").addChannelOption(o=>o.setName("channel").setDescription("Channel").addChannelTypes(ChannelType.GuildText).setRequired(true)).addIntegerOption(o=>o.setName("threshold").setDescription("Stars needed").setMinValue(1).setMaxValue(20))),
    category:"Config",
    async execute(interaction){
        const sub=interaction.options.getSubcommand();
        if(sub==="set"){
            if(!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({ embeds:[embeds.error("No perm","ManageGuild")], flags: MessageFlags.Ephemeral });
            const ch=interaction.options.getChannel("channel");
            const thr=interaction.options.getInteger("threshold") ?? 3;
            await interaction.client.prisma.starboardConfig.upsert({ where:{ guildId:interaction.guildId }, update:{ channelId:ch.id, threshold:thr }, create:{ guildId:interaction.guildId, channelId:ch.id, threshold:thr }});
            await interaction.reply({ embeds:[embeds.success("Starboard",`Set to <#${ch.id}> threshold ${thr}`)], flags: MessageFlags.Ephemeral });
        }
    }
};
