import { SlashCommandBuilder, MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelSelectMenuBuilder, RoleSelectMenuBuilder } from "discord.js";
import { embeds } from "../../design/embeds.js";
import { Theme } from "../../design/theme.js";
import { isStaff } from "../../core/services.js";
const MODULES = [
    { id:"moderation", label:"Moderation", emoji:"🛡️" },
    { id:"automod", label:"AutoMod", emoji:"🤖" },
    { id:"tickets", label:"Tickets", emoji:"🎫" },
    { id:"leveling", label:"Leveling", emoji:"🌱" },
    { id:"economy", label:"Economy", emoji:"💰" },
    { id:"welcome", label:"Welcome", emoji:"👋" },
    { id:"starboard", label:"Starboard", emoji:"⭐" },
    { id:"reactionRoles", label:"Reaction Roles", emoji:"🎭" },
    { id:"analytics", label:"Analytics", emoji:"📊" },
    { id:"achievements", label:"Achievements", emoji:"🏆" },
    { id:"automation", label:"Automation", emoji:"⚙️" },
];
function mainEmbed(guild, cfg){
    const mods=Object.entries(cfg.modules||{}).map(([k,v])=> `${v?"🟢":"🔴"} ${k}`).join(" • ").slice(0,1000) || "—";
    return new EmbedBuilder().setColor(Theme.panel).setAuthor({ name:`${guild.name} • Angel Configuration`, iconURL: guild.iconURL()??undefined }).setDescription("*Centralized control — choose a module to configure*\n\n**Modules**\n"+mods)
        .addFields(
            { name:"Log Channel", value: cfg.logChannelId? `<#${cfg.logChannelId}>`:"Not set", inline:true },
            { name:"Mod Log", value: cfg.modLogChannelId? `<#${cfg.modLogChannelId}>`:"Not set", inline:true },
            { name:"Welcome", value: cfg.welcomeChannelId? `<#${cfg.welcomeChannelId}>`:"Not set", inline:true }
        ).setFooter({ text:"A.N.G.E.L. • unified config" }).setTimestamp();
}
export default {
    data: new SlashCommandBuilder().setName("config").setDescription("Unified configuration center (V5)"),
    category:"Config",
    async execute(interaction){
        const cfg=await interaction.client.services.settings.get(interaction.guildId).catch(()=>null);
        if(!isStaff(interaction.member, cfg)) return interaction.reply({ embeds:[embeds.error("No permission","Staff only")], flags: MessageFlags.Ephemeral});
        await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(()=>{});
        const guild=interaction.guild;
        const embed=mainEmbed(guild, await interaction.client.services.settings.get(guild.id));
        const menu=new StringSelectMenuBuilder().setCustomId("angel:config:module").setPlaceholder("Choose module").addOptions(MODULES.map(m=> ({ label:m.label, value:m.id, emoji:m.emoji })));
        const row=new ActionRowBuilder().addComponents(menu);
        const buttons=new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("angel:config:modules").setLabel("Toggle Modules").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("angel:config:backup").setLabel("Backup").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("angel:config:diagnostics").setLabel("Diagnostics").setStyle(ButtonStyle.Secondary)
        );
        // Register handlers
        interaction.client.components.set("angel:config:module", async(i)=>{
            const mod=i.values[0];
            const c=await i.client.services.settings.get(i.guildId);
            const info={
                moderation:"Moderation thresholds, logging, escalation — use /modcenter",
                automod:"Filters, regex, spam, raid — use /automod",
                tickets:"Panels, forms, claiming — use /setuptickets",
                leveling:"XP multipliers, role rewards, streaks — use /levelconfig",
                economy:"Shop, jobs, trading — use /shop /economy",
                welcome:"Join/leave channels — set via /settings",
                starboard:"Starboard channel/threshold — /starboard set",
                reactionRoles:"Reaction roles — /reactionroles",
                analytics:"View via /analytics",
                achievements:"View via /achievements",
                automation:"Rules — /automation",
            }[mod]||"No details";
            await i.reply({ embeds:[embeds.info(`${mod}`, info)], flags: MessageFlags.Ephemeral}).catch(()=>{});
        });
        interaction.client.components.set("angel:config:modules", async(i)=>{
            const c=await i.client.services.settings.get(i.guildId);
            const opts=MODULES.map(m=> ({ label:m.label, value:m.id, default: !!c.modules[m.id] }));
            const sel=new StringSelectMenuBuilder().setCustomId("angel:config:modules:toggle").setPlaceholder("Toggle modules").setMinValues(0).setMaxValues(MODULES.length).addOptions(opts.map(o=> ({ label:o.label, value:o.value, default:o.default })));
            await i.reply({ embeds:[embeds.info("Modules","Select enabled modules")], components:[new ActionRowBuilder().addComponents(sel)], flags: MessageFlags.Ephemeral}).catch(()=>{});
        });
        interaction.client.components.set("angel:config:modules:toggle", async(i)=>{
            const chosen=new Set(i.values);
            const cfg2=await i.client.services.settings.get(i.guildId);
            const next={}; for(const m of MODULES) next[m.id]=chosen.has(m.id);
            await i.client.services.settings.patch(i.guildId,{ modules: next });
            await i.update({ embeds:[embeds.success("Updated","Modules saved")], components:[] }).catch(()=>{});
        });
        interaction.client.components.set("angel:config:backup", async(i)=>{
            const b=await i.client.services.backup.create(i.guildId, i.user).catch(e=>null);
            if(!b) return i.reply({ embeds:[embeds.error("Backup failed","")], flags: MessageFlags.Ephemeral});
            await i.reply({ embeds:[embeds.success("Backup created",`ID \`${b.id}\``)], flags: MessageFlags.Ephemeral});
        });
        interaction.client.components.set("angel:config:diagnostics", async(i)=>{
            const d=await i.client.services.diagnostics.check(i.guildId);
            const errs=d.filter(x=>x.status==="ERROR").length;
            const warns=d.filter(x=>x.status==="WARNING").length;
            const embed=new EmbedBuilder().setColor(errs?0xf87171: warns?0xfbbf24:0x6ee7b7).setTitle("Diagnostics").setDescription(d.map(x=> `${x.status==="OK"?"🟢":x.status==="WARNING"?"🟡":"🔴"} **${x.name}** — ${x.detail.slice(0,80)}`).join("\n").slice(0,4000));
            await i.reply({ embeds:[embed], flags: MessageFlags.Ephemeral});
        });
        await interaction.editReply({ embeds:[embed], components:[row, buttons]});
    }
};
