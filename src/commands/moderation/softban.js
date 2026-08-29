import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { embeds } from "../../design/embeds.js";
import { requireModerator, defer, confirmDestructive } from "./shared.js";
import { userTag } from "../../design/format.js";
export default {
    data: new SlashCommandBuilder().setName("softban").setDescription("Softban — ban and immediate unban to delete messages").addUserOption(o=>o.setName("target").setDescription("User").setRequired(true)).addStringOption(o=>o.setName("reason").setDescription("Reason")).addIntegerOption(o=>o.setName("days").setDescription("Days to delete (0-7)").setMinValue(0).setMaxValue(7)),
    category:"Moderation",
    async execute(interaction){
        if(!(await requireModerator(interaction))) return;
        await defer(interaction);
        const target=interaction.options.getUser("target",true);
        const reason=interaction.options.getString("reason")||"Softban";
        const days=interaction.options.getInteger("days")||1;
        if(!await confirmDestructive(interaction, `Softban **${userTag(target)}**? Will ban then unban, deleting ${days} day(s) messages.`)) return;
        const c1=await interaction.client.services.moderation.ban(interaction.guild, target, interaction.user, `[Softban] ${reason}`, days).catch(()=>null);
        await new Promise(r=>setTimeout(r,800));
        const c2=await interaction.client.services.moderation.unban(interaction.guild, target.id, userTag(target), interaction.user, `Softban unban: ${reason}`).catch(()=>null);
        await interaction.editReply({ embeds:[embeds.success("Softbanned", `**${userTag(target)}** softbanned — messages deleted`, [{name:"Cases", value:`Ban #${c1?.caseNumber||"?"} → Unban #${c2?.caseNumber||"?"}`}])], components:[] }).catch(()=>{});
    }
};
