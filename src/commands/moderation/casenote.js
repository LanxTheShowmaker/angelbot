import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { embeds } from "../../design/embeds.js";
import { isStaff } from "../../core/services.js";
export default {
    data: new SlashCommandBuilder().setName("casenote").setDescription("Add note to case/user").addStringOption(o=>o.setName("content").setDescription("Note").setRequired(true)).addIntegerOption(o=>o.setName("case").setDescription("Case #")).addUserOption(o=>o.setName("user").setDescription("User")),
    category:"Moderation",
    async execute(interaction){
        const cfg=await interaction.client.services.settings.get(interaction.guildId).catch(()=>null);
        if(!isStaff(interaction.member,cfg)) return interaction.reply({ embeds:[embeds.error("Staff only","")], flags: MessageFlags.Ephemeral});
        const cnum=interaction.options.getInteger("case");
        const user=interaction.options.getUser("user");
        const content=interaction.options.getString("content",true);
        const targetId=user? user.id : null;
        if(!cnum && !targetId) return interaction.reply({ embeds:[embeds.error("Need case or user","")], flags: MessageFlags.Ephemeral});
        if(cnum){
            const c=await interaction.client.services.cases.get(interaction.guildId, cnum);
            if(!c) return interaction.reply({ embeds:[embeds.error("Not found","")] , flags: MessageFlags.Ephemeral});
            await interaction.client.services.cases.addNote(interaction.guildId, c.targetId, interaction.user.id, interaction.user.tag, content, cnum);
            return interaction.reply({ embeds:[embeds.success("Note","Added to #"+cnum)], flags: MessageFlags.Ephemeral});
        } else {
            await interaction.client.services.cases.addNote(interaction.guildId, targetId, interaction.user.id, interaction.user.tag, content, null);
            return interaction.reply({ embeds:[embeds.success("Note","Added to user")], flags: MessageFlags.Ephemeral});
        }
    }
};