import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { embeds } from "../../design/embeds.js";
import { requireModerator, defer } from "./shared.js";
import { userTag } from "../../design/format.js";
export default {
    data: new SlashCommandBuilder().setName("mute").setDescription("Mute via timeout (alias to /timeout)").addUserOption(o=>o.setName("target").setDescription("User").setRequired(true)).addStringOption(o=>o.setName("duration").setDescription("e.g. 10m, 1h, 1d").setRequired(true)).addStringOption(o=>o.setName("reason").setDescription("Reason")),
    category:"Moderation",
    async execute(interaction){
        if(!(await requireModerator(interaction))) return;
        await defer(interaction);
        const target=interaction.options.getUser("target",true);
        const durStr=interaction.options.getString("duration",true);
        const reason=interaction.options.getString("reason")||"Muted";
        const member=await interaction.guild.members.fetch(target.id).catch(()=>null);
        if(!member) return interaction.editReply({ embeds:[embeds.error("Not found","Member not in guild")]});
        const ms=require("./shared.js").parseDuration(durStr);
        if(!ms) return interaction.editReply({ embeds:[embeds.error("Invalid duration","Use 10s, 5m, 2h, 1d")]});
        await interaction.client.services.moderation.timeout(member, interaction.user, ms, reason);
        return interaction.editReply({ embeds:[embeds.success("Muted",`**${userTag(target)}** muted for ${durStr}`)]});
    }
};
