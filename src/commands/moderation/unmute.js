import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { embeds } from "../../design/embeds.js";
import { requireModerator, defer } from "./shared.js";
import { userTag } from "../../design/format.js";
export default {
    data: new SlashCommandBuilder().setName("unmute").setDescription("Unmute (remove timeout)").addUserOption(o=>o.setName("target").setDescription("User").setRequired(true)),
    category:"Moderation",
    async execute(interaction){
        if(!(await requireModerator(interaction))) return;
        await defer(interaction);
        const target=interaction.options.getUser("target",true);
        const member=await interaction.guild.members.fetch(target.id).catch(()=>null);
        if(!member) return interaction.editReply({ embeds:[embeds.error("Not found","")]});
        await member.timeout(null, "Unmuted").catch(()=>{});
        return interaction.editReply({ embeds:[embeds.success("Unmuted",`**${userTag(target)}**`)]});
    }
};
