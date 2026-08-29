import { SlashCommandBuilder, MessageFlags, EmbedBuilder } from "discord.js";
import { embeds } from "../../design/embeds.js";
import { isStaff } from "../../core/services.js";
export default {
    data: new SlashCommandBuilder().setName("diagnostics").setDescription("Diagnostics / Health")
        .addSubcommand(s=> s.setName("check").setDescription("Full diagnostics"))
        .addSubcommand(s=> s.setName("health").setDescription("Lightweight health")),
    category:"Utility",
    async execute(interaction){
        const sub=interaction.options.getSubcommand();
        if(sub==="health"){
            const h=await interaction.client.services.diagnostics.health(interaction.guildId).catch(()=>({overall:"ERROR"}));
            const col=h.overall==="OK"?0x6ee7b7:h.overall==="WARNING"?0xfbbf24:0xf87171;
            const e=new EmbedBuilder().setColor(col).setTitle(`Health — ${h.overall}`).setDescription(`${h.errors} errors • ${h.warns} warnings • ${h.total} checks`).setTimestamp();
            return interaction.reply({ embeds:[e], flags: MessageFlags.Ephemeral});
        }
        // Full check requires staff
        const cfg=await interaction.client.services.settings.get(interaction.guildId).catch(()=>null);
        if(!isStaff(interaction.member,cfg) && sub==="check") return interaction.reply({ embeds:[embeds.error("No perm","Staff only")], flags: MessageFlags.Ephemeral});
        await interaction.deferReply({ flags: MessageFlags.Ephemeral}).catch(()=>{});
        const checks=await interaction.client.services.diagnostics.check(interaction.guildId);
        const err=checks.filter(c=>c.status==="ERROR").length;
        const warn=checks.filter(c=>c.status==="WARNING").length;
        const col=err?0xf87171: warn?0xfbbf24:0x6ee7b7;
        const embed=new EmbedBuilder().setColor(col).setTitle(`Diagnostics — ${err?"ERROR":warn?"WARNING":"OK"}`).setDescription(checks.map(c=> `${c.status==="OK"?"🟢":c.status==="WARNING"?"🟡":"🔴"} **${c.name}** — ${c.detail.slice(0,120)}${c.fix?` *(fix: ${c.fix})*`:""}`).join("\n").slice(0,4000)).setFooter({ text:`${checks.length} checks • ${err} errors`}).setTimestamp();
        return interaction.editReply({ embeds:[embed]});
    }
};
