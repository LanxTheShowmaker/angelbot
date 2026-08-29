import { SlashCommandBuilder, MessageFlags, EmbedBuilder } from "discord.js";
import { embeds } from "../../design/embeds.js";
import { isStaff } from "../../core/services.js";
export default {
    data: new SlashCommandBuilder().setName("security").setDescription("Security center")
        .addSubcommand(s=> s.setName("status").setDescription("Security status"))
        .addSubcommand(s=> s.setName("scan").setDescription("Scan for issues"))
        .addSubcommand(s=> s.setName("incidents").setDescription("Recent incidents"))
        .addSubcommand(s=> s.setName("settings").setDescription("Security settings")),
    category:"Moderation",
    async execute(interaction){
        const sub=interaction.options.getSubcommand();
        const raid=interaction.client.services.raid;
        const diag=interaction.client.services.diagnostics;
        if(sub==="status"){
            const st=await raid.status(interaction.guildId);
            const embed=new EmbedBuilder().setColor(st.assessment.level==="CRITICAL"?0xf87171:0x6ee7b7).setTitle(`Security — ${st.assessment.level}`).addFields({name:"Risk",value:String(st.assessment.risk),inline:true},{name:"State",value: st.state.active?"🔴 Lockdown":"🟢 Normal",inline:true});
            return interaction.reply({ embeds:[embed], flags: MessageFlags.Ephemeral});
        }
        if(sub==="scan"){
            const checks=await diag.check(interaction.guildId);
            const errs=checks.filter(c=>c.status==="ERROR");
            return interaction.reply({ embeds:[embeds.info("Scan", errs.length? errs.map(c=> `🔴 ${c.name}: ${c.detail}`).join("\n") : "✅ No issues")], flags: MessageFlags.Ephemeral});
        }
        if(sub==="incidents"){
            const inc=await interaction.client.prisma.raidIncident.findMany({ where:{ guildId: interaction.guildId }, orderBy:{ createdAt:"desc" }, take:5}).catch(()=>[]);
            return interaction.reply({ embeds:[embeds.info("Incidents", inc.map(i=> `${i.type} ${i.risk} <t:${Math.floor(new Date(i.createdAt).getTime()/1000)}:R>`).join("\n")||"None")], flags: MessageFlags.Ephemeral});
        }
        if(sub==="settings"){
            return interaction.reply({ embeds:[embeds.info("Security Settings","Configure via /automod and /raid")], flags: MessageFlags.Ephemeral});
        }
    }
};