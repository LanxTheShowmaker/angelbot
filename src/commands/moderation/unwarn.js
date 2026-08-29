import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { embeds } from "../../design/embeds.js";
import { isStaff } from "../../core/services.js";
export default {
    data: new SlashCommandBuilder().setName("unwarn").setDescription("Remove last warning (resolve case)").addUserOption(o=>o.setName("user").setDescription("User").setRequired(true)).addIntegerOption(o=>o.setName("case").setDescription("Case # (optional)")),
    category:"Moderation",
    async execute(interaction){
        const cfg=await interaction.client.services.settings.get(interaction.guildId).catch(()=>null);
        if(!isStaff(interaction.member,cfg)) return interaction.reply({ embeds:[embeds.error("No perm","Staff only")], flags: MessageFlags.Ephemeral});
        const user=interaction.options.getUser("user",true);
        const caseNum=interaction.options.getInteger("case");
        if(caseNum){
            const c=await interaction.client.services.cases.resolve(interaction.guildId, caseNum, interaction.user).catch(()=>null);
            if(!c) return interaction.reply({ embeds:[embeds.error("Not found",`#${caseNum}`)], flags: MessageFlags.Ephemeral});
            return interaction.reply({ embeds:[embeds.success("Unwarned",`Case #${caseNum} resolved for <@${user.id}>`)], flags: MessageFlags.Ephemeral});
        }
        // Find last warn
        const cases=await interaction.client.services.cases.byTarget(interaction.guildId, user.id, 25).catch(()=>[]);
        const last=cases.find(c=> c.action==="WARN" && !c.resolved);
        if(!last) return interaction.reply({ embeds:[embeds.warn("No warnings",`No active warnings for <@${user.id}>`)], flags: MessageFlags.Ephemeral});
        await interaction.client.services.cases.resolve(interaction.guildId, last.caseNumber, interaction.user);
        return interaction.reply({ embeds:[embeds.success("Unwarned",`Removed #${last.caseNumber} for <@${user.id}>`)], flags: MessageFlags.Ephemeral});
    }
};
