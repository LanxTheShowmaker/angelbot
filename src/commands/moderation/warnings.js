import { SlashCommandBuilder, MessageFlags, EmbedBuilder } from "discord.js";
import { embeds } from "../../design/embeds.js";
import { isStaff } from "../../core/services.js";
import { Theme } from "../../design/theme.js";
export default {
    data: new SlashCommandBuilder().setName("warnings").setDescription("List warnings for user").addUserOption(o=>o.setName("user").setDescription("User").setRequired(true)),
    category:"Moderation",
    async execute(interaction){
        const user=interaction.options.getUser("user",true);
        const cases=await interaction.client.services.cases.byTarget(interaction.guildId, user.id, 50).catch(()=>[]);
        const warns=cases.filter(c=> c.action==="WARN");
        const active=warns.filter(c=> !c.resolved);
        const embed=new EmbedBuilder().setColor(Theme.warn).setAuthor({ name:`${user.tag} — Warnings`, iconURL:user.displayAvatarURL()}).setDescription(`**${active.length}** active / **${warns.length}** total`)
            .addFields(warns.slice(0,10).map(c=> ({ name:`#${c.caseNumber} ${c.resolved?"✅":"⚠️"}`, value:`${c.reason||"No reason"} — <t:${Math.floor(new Date(c.createdAt).getTime()/1000)}:R> by <@${c.moderatorId}>`})))
            .setFooter({ text:`Use /unwarn to resolve`});
        return interaction.reply({ embeds:[embed], flags: MessageFlags.Ephemeral});
    }
};
