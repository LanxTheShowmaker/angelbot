import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";
import { embeds } from "../../design/embeds.js";
import { isStaff } from "../../core/services.js";
export default {
    data: new SlashCommandBuilder().setName("untimeout").setDescription("Remove timeout from a member").addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true)),
    category:"Moderation",
    async execute(interaction){
        const cfg = await interaction.client.services.settings.get(interaction.guildId).catch(()=>null);
        if(!isStaff(interaction.member, cfg)) return interaction.reply({ embeds:[embeds.error("No perm","Staff only")], flags: MessageFlags.Ephemeral });
        const user = interaction.options.getUser("user");
        const member = await interaction.guild.members.fetch(user.id).catch(()=>null);
        if(!member) return interaction.reply({ embeds:[embeds.error("Not found","Member not in guild")], flags: MessageFlags.Ephemeral });
        const me = interaction.guild.members.me;
        if(!me.permissions.has(PermissionFlagsBits.ModerateMembers)) return interaction.reply({ embeds:[embeds.error("Missing","Need ModerateMembers")], flags: MessageFlags.Ephemeral });
        try{
            await member.timeout(null, "Untimeout");
            await interaction.reply({ embeds:[embeds.success("Removed timeout",`Cleared timeout for <@${user.id}>`)], flags: MessageFlags.Ephemeral });
        }catch(e){ await interaction.reply({ embeds:[embeds.error("Failed", String(e.message).slice(0,200))], flags: MessageFlags.Ephemeral }); }
    }
};
