import { SlashCommandBuilder, MessageFlags, EmbedBuilder } from "discord.js";
import { embeds } from "../../design/embeds.js";
import { isStaff } from "../../core/services.js";
export default {
    data: new SlashCommandBuilder().setName("cases").setDescription("List recent cases").addIntegerOption(o=>o.setName("page").setDescription("Page").setMinValue(1)),
    category:"Moderation",
    async execute(interaction){
        const page=Math.max(1, interaction.options.getInteger("page")||1);
        const list=await interaction.client.services.cases.recent(interaction.guildId, 10);
        const embed=new EmbedBuilder().setColor(0x9b8ecf).setTitle(`Cases — Page ${page}`).setDescription(list.map(c=> `#${c.caseNumber} ${c.action} <@${c.targetId}> — ${c.reason?.slice(0,40)||""}`).join("\n")||"*None*");
        return interaction.reply({ embeds:[embed], flags: MessageFlags.Ephemeral});
    }
};