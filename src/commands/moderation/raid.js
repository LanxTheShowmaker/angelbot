import { SlashCommandBuilder, MessageFlags, EmbedBuilder } from "discord.js";
import { embeds } from "../../design/embeds.js";
import { isStaff } from "../../core/services.js";
export default {
    data: new SlashCommandBuilder().setName("raid").setDescription("Raid protection")
        .addSubcommand(s=> s.setName("status").setDescription("Show raid status"))
        .addSubcommand(s=> s.setName("incidents").setDescription("Recent raid incidents"))
        .addSubcommand(s=> s.setName("simulate").setDescription("Simulate risk assessment (staff)").addStringOption(o=>o.setName("content").setDescription("Test message"))),
    category:"Moderation",
    async execute(interaction){
        const sub=interaction.options.getSubcommand();
        const raid=interaction.client.services.raid;
        const intel=interaction.client.services.intelligence;
        if(sub==="status"){
            const st=await raid.status(interaction.guildId);
            const embed=new EmbedBuilder().setColor(st.assessment.level==="CRITICAL"?0xf87171: st.assessment.level==="HIGH"?0xfbbf24:0x6ee7b7)
                .setTitle(`Raid Protection — ${st.assessment.level} (${st.assessment.risk}/100)`)
                .addFields(
                    { name:"Joins 30s", value:String(st.assessment.joins), inline:true },
                    { name:"Msgs 10s", value:String(st.assessment.msgs), inline:true },
                    { name:"State", value: st.state.active? `🔴 Active since <t:${Math.floor(st.state.since/1000)}:R>`:"🟢 Inactive", inline:true },
                    { name:"Recent Incidents", value: st.incidents.length? st.incidents.map(i=> `${i.type} risk ${i.risk} <t:${Math.floor(new Date(i.createdAt).getTime()/1000)}:R>`).join("\n") : "None" }
                ).setFooter({ text:"A.N.G.E.L. • deterministic" }).setTimestamp();
            return interaction.reply({ embeds:[embed], flags: MessageFlags.Ephemeral});
        }
        if(sub==="incidents"){
            const cfg=await interaction.client.services.settings.get(interaction.guildId).catch(()=>null);
            if(!isStaff(interaction.member,cfg)) return interaction.reply({ embeds:[embeds.error("No perm","Staff only")], flags: MessageFlags.Ephemeral});
            const incidents=await interaction.client.prisma.raidIncident.findMany({ where:{ guildId: interaction.guildId }, orderBy:{ createdAt:"desc" }, take:10}).catch(()=>[]);
            const embed=new EmbedBuilder().setColor(0xf87171).setTitle("Raid Incidents").setDescription(incidents.length? incidents.map(i=> `**${i.type}** risk ${i.risk} ${i.resolved?"✅":"⚠️"} <t:${Math.floor(new Date(i.createdAt).getTime()/1000)}:R>`).join("\n") : "*None*");
            return interaction.reply({ embeds:[embed], flags: MessageFlags.Ephemeral});
        }
        if(sub==="simulate"){
            const cfg=await interaction.client.services.settings.get(interaction.guildId).catch(()=>null);
            if(!isStaff(interaction.member,cfg)) return interaction.reply({ embeds:[embeds.error("No perm","Staff only")], flags: MessageFlags.Ephemeral});
            const content=interaction.options.getString("content")||"@everyone FREE NITRO discord.gift/abc";
            const mockMentions={ users:{size:(content.match(/<@!?\\d+>/g)||[]).length}, roles:{size:0}, everyone: content.includes("@everyone") };
            const score=intel.scoreMessage({ content, mentions: mockMentions, accountAgeMs: 2*86400*1000, velocity: 8, capsRatio: 0.8, links:true, invites:false });
            const embed=new EmbedBuilder().setColor(score.level==="CRITICAL"?0xf87171:0xfbbf24).setTitle(`Simulation — ${score.level} ${score.score}/100`).setDescription(`Reasons: ${score.reasons.join(", ")}`);
            return interaction.reply({ embeds:[embed], flags: MessageFlags.Ephemeral});
        }
    }
};
