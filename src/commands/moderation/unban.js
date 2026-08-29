import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";
import { embeds } from "../../design/embeds.js";
import { isStaff } from "../../core/services.js";
export default {
    data: new SlashCommandBuilder().setName("unban").setDescription("Unban a user").addStringOption(o=>o.setName("userid").setDescription("User ID").setRequired(true)).addStringOption(o=>o.setName("reason").setDescription("Reason")),
    category:"Moderation",
    async execute(interaction){
        const cfg = await interaction.client.services.settings.get(interaction.guildId).catch(()=>null);
        if(!isStaff(interaction.member, cfg)) return interaction.reply({ embeds:[embeds.error("No perm","Staff only")], flags: MessageFlags.Ephemeral });
        const userId = interaction.options.getString("userid");
        const reason = interaction.options.getString("reason") ?? "Unbanned";
        const me = interaction.guild.members.me;
        if(!me.permissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply({ embeds:[embeds.error("Missing","Need BanMembers")], flags: MessageFlags.Ephemeral });
        try{
            await interaction.guild.members.unban(userId, reason);
            await interaction.client.services.moderation.unban?.(interaction.guild, userId, userId, interaction.user, reason).catch(()=>{});
            await interaction.reply({ embeds:[embeds.success("Unbanned",`Unbanned <@${userId}> — ${reason}`)], flags: MessageFlags.Ephemeral });
        }catch(e){ await interaction.reply({ embeds:[embeds.error("Failed", String(e.message).slice(0,200))], flags: MessageFlags.Ephemeral }); }
    }
};
