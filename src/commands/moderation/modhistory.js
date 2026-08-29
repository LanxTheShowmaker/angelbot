import { SlashCommandBuilder, MessageFlags, EmbedBuilder } from "discord.js";
import { embeds } from "../../design/embeds.js";
export default {
    data: new SlashCommandBuilder().setName("modhistory").setDescription("Moderation history for user").addUserOption(o=>o.setName("user").setDescription("User").setRequired(true)),
    category:"Moderation",
    async execute(interaction){
        const user=interaction.options.getUser("user",true);
        const hist=await interaction.client.services.moderation.getUserHistory(interaction.guildId, user.id);
        const embed=new EmbedBuilder().setColor(0x9b8ecf).setAuthor({ name: user.tag, iconURL: user.displayAvatarURL()}).setDescription(`**${hist.total}** cases • ${hist.warns} warns`);
        if(hist.history.length) embed.addFields({ name:"Recent", value: hist.history.slice(0,8).map(c=> `#${c.caseNumber} ${c.action} ${c.reason?.slice(0,30)||""}`).join("\n").slice(0,1024)});
        return interaction.reply({ embeds:[embed], flags: MessageFlags.Ephemeral});
    }
};