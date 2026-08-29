import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";
import { embeds } from "../../design/embeds.js";
import { isStaff } from "../../core/services.js";
export default {
    data: new SlashCommandBuilder().setName("clearwarnings").setDescription("Clear warnings for a user").addUserOption(o=>o.setName("user").setDescription("User").setRequired(true)),
    category:"Moderation",
    async execute(interaction){
        const cfg = await interaction.client.services.settings.get(interaction.guildId).catch(()=>null);
        if(!isStaff(interaction.member, cfg)) return interaction.reply({ embeds:[embeds.error("No perm","Staff only")], flags: MessageFlags.Ephemeral });
        const user = interaction.options.getUser("user");
        const before = await interaction.client.prisma.case.count({ where:{ guildId:interaction.guildId, targetId:user.id, action:"WARN", resolved:false }}).catch(()=>0);
        await interaction.client.prisma.case.updateMany({ where:{ guildId:interaction.guildId, targetId:user.id, action:"WARN", resolved:false }, data:{ resolved:true, resolvedById: interaction.user.id, resolvedByTag: interaction.user.tag, resolvedAt: new Date() }}).catch(()=>{});
        await interaction.reply({ embeds:[embeds.success("Cleared",`Cleared ${before} warnings for <@${user.id}>`)], flags: MessageFlags.Ephemeral });
    }
};
