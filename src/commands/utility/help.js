import { SlashCommandBuilder, MessageFlags, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { embeds } from "../../design/embeds.js";
import { Theme } from "../../design/theme.js";
const HELP_TOPICS = {
    start: {
        label: "Getting Started",
        emoji: "✦",
        description: "New to A.N.G.E.L.? Start here.",
        title: "✦ Getting Started — 3 Steps to Heaven",
        content: [
            { name:"  ① Invite & Setup", value:"```\n1. Invite bot with Manage Server + Moderation perms\n2. Run /autosetup → creates roles, log channels, welcome\n3. Run /setuptickets → choose panels (Orders, Assistance, Dashboard)\n4. Run /config → toggle modules, set branding\n```" },
            { name:"  ② Open a Ticket", value:"```\n• Go to #orders or #support panel\n• Select from dropdown (e.g., Uniform, GFX, General Support)\n• Answer questions → channel created like gfx-ultim-a1b2\n• Staff Claim → help you → Close → HTML archive\n• Use /ticket list to see [category][user][id]\n```" },
            { name:"  ③ Daily Use", value:"```\n• Chat → gain XP & coins (level up!)\n• /daily /weekly → free coins\n• /shop → buy roles/items\n• /rank /leaderboard → see progress\n```" },
        ]
    },
    tickets: {
        label: "Tickets & Orders",
        emoji: "🎫",
        title: "🎫 Tickets — Intelligent List",
        content: [
            { name:"  How Tickets Work", value:"```\n• Channel names: [category][user][id] e.g., uniform-ultim-a1b2\n• You can have 3 open tickets at once (was 1)\n• Staff claim, add/remove users, priority, close → archive (HTML)\n```" },
            { name:"  Commands", value:"```\n/ticket list [category][user][id] — intelligent list\n/ticket close /reopen /transfer /rename /add /remove\n/ticket priority /rate /stats\n/setuptickets → configure panels & types\n```" },
            { name:"  Panel Setup", value:"```\n/setuptickets → pick panel (ORDER/ASSISTANCE)\n• Set channel, banner (ORDER-HERE), ticket types\n• Each type can have custom questions, role, welcome\n```" },
        ]
    },
    moderation: {
        label: "Moderation Center",
        emoji: "🛡️",
        title: "🛡️ Moderation — Safe & Audited",
        content: [
            { name:"  Actions", value:"```\n/ban /kick /timeout /warn /note\n• Each creates a Case # + logs to modLog\n• Confirm dialogs for destructive actions\n```" },
            { name:"  Center", value:"```\n/modcenter browse → recent cases\n/modcenter history @user → infractions\n/modcenter stats → top mods\n/modcenter thresholds → auto-escalation\n```" },
            { name:"  Safety", value:"```\n• Timeout auto-expires, audit logged\n• Appeals: /modcenter appeal #case\n• Raid auto-lockdown via /raid status\n```" },
        ]
    },
    automod: {
        label: "AutoMod & Raid",
        emoji: "🤖",
        title: "🤖 AutoMod — Local Intelligence",
        content: [
            { name:"  What it Catches", value:"```\n• Spam, flood, duplicate, caps, emoji spam\n• Invites, links, words, regex/phrase rules\n• Unicode obfuscation (zalgo/zero-width)\n```" },
            { name:"  Configure", value:"```\n/automod → toggle detectors & thresholds\n/automod regex add → custom pattern\n• Whitelist channels/roles/users\n• Severity → auto escalation\n```" },
            { name:"  Raid", value:"```\n/raid status → risk 0-100\n• Detects join spike + msg flood\n• Auto-lockdown + auto-recover 10m\n```" },
        ]
    },
    leveling: {
        label: "Leveling V5",
        emoji: "🌱",
        title: "🌱 Leveling — Growth",
        content: [
            { name:"  Earn XP", value:"```\n• 5-15 XP per message (60s cooldown, anti-farm)\n• Multipliers: global + per-channel\n• Role rewards at levels, streaks (daily)\n```" },
            { name:"  Commands", value:"```\n/rank → your card (+ bar)\n/leaderboard → all-time\n/level weekly /monthly /streak /prestige (50)\n/profile → full card\n```" },
            { name:"  Config", value:"```\n/level config multiplier:1.5 announce:#channel\n• Achievements auto-unlock at 5/10/25\n```" },
        ]
    },
    economy: {
        label: "Economy V5",
        emoji: "💰",
        title: "💰 Economy — Heavenly Coins",
        content: [
            { name:"  Earn", value:"```\n• Message 10% chance 5-15 coins\n• /daily 100, /weekly 500\n• /economy work (miner/guard/scribe/healer) hourly\n```" },
            { name:"  Spend & Trade", value:"```\n/shop view → browse (roles/items, rarity, stock)\n/shop buy /gift /economy gift /trade\n/balance → your coins + shop hint\n```" },
            { name:"  History", value:"```\n/economy history → last 8 transactions\n/economy leaderboard → top wealth\n```" },
        ]
    },
    utility: {
        label: "Utilities & Fun",
        emoji: "🔧",
        title: "🔧 Utilities",
        content: [
            { name:"  Info", value:"```\n/info user|server|avatar\n/whois @user or /whois userid:123 → works even if left\n/profile → leveling+economy+achievements\n```" },
            { name:"  Tools", value:"```\n/poll • /remind • /giveaway • /suggest • /afk\n/schedule announce /tempvoice • /branding\n```" },
            { name:"  Fun", value:"```\n/8ball /coinflip /roll /rps\n/joke /meme /ship /hug /trivia\n```" },
        ]
    },
    config: {
        label: "Config Center",
        emoji: "⚙️",
        title: "⚙️ Unified Config",
        content: [
            { name:"  One Hub", value:"```\n/config → main panel: modules, logs, welcome, automod, tickets, etc.\n• Toggle modules (cherub light preset disables heavy)\n• Backup/restore, diagnostics\n```" },
            { name:"  Per-Server Branding", value:"```\n/branding set name:MyBot avatar_file:… banner:…\n• Per-server name/avatar/banner (not global)\n• Shows in tickets & embeds\n• /branding view /reset\n```" },
            { name:"  Modules", value:"```\n/modules list/enable/disable/preset\n• All 14 modules independently toggleable\n```" },
        ]
    },
};
function buildMainEmbed(guild, displayName){
    return new EmbedBuilder().setColor(Theme.panel)
        .setAuthor({ name: `${displayName} • Help`, iconURL: guild?.iconURL({ size:64 }) ?? undefined })
        .setTitle("✦  How to Use A.N.G.E.L.")
        .setDescription("*Heavenly service — from invite to mastery in 3 steps. Pick a topic below or run slash commands directly.*")
        .addFields(
            { name:"  🚀 Quick Start", value: "```\n/autosetup → foundation  •  /setuptickets → panels  •  /ticket list → your tickets\n```", inline:false },
            { name:"  ✨ V5 Highlights", value: "```\n• Intelligent [category][user][id] tickets (3 at once, HTML archive)\n• Per-server bot name/pfp via /branding\n• Leveling streaks + prestige, Economy jobs/gifts, Achievements\n```", inline:false },
            { name:"  📚 Topics", value: Object.values(HELP_TOPICS).map(t=> `${t.emoji} **${t.label}**`).join(" • ").slice(0,1024), inline:false }
        )
        .setThumbnail(guild?.client?.user?.displayAvatarURL({ size:128 }) ?? null)
        .setFooter({ text:"A.N.G.E.L. • select below for deep dive • /about for story"});
}
export default {
    data: new SlashCommandBuilder().setName("help").setDescription("How to use A.N.G.E.L. — interactive guide"),
    category:"Utility",
    async execute(interaction){
        const guild=interaction.guild;
        const branding=await interaction.client.services.branding?.get(guild.id).catch(()=>null);
        const dispName=branding?.displayName || interaction.client.user.username;
        const main=buildMainEmbed(guild, dispName);
        main.setColor(Theme.panel);
        const menu=new StringSelectMenuBuilder().setCustomId("help:topic").setPlaceholder("📖 Choose a topic").addOptions(Object.entries(HELP_TOPICS).map(([k,v])=> ({ label: v.label, value:k, description: v.description.slice(0,100), emoji: v.emoji })));
        const row=new ActionRowBuilder().addComponents(menu);
        const buttons=new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("help:about").setLabel("About").setStyle(ButtonStyle.Secondary).setEmoji("ℹ️"),
            new ButtonBuilder().setLabel("Invite").setStyle(ButtonStyle.Link).setURL(`https://discord.com/oauth2/authorize?client_id=${interaction.client.user.id}&permissions=8&scope=bot%20applications.commands`),
            new ButtonBuilder().setCustomId("help:support").setLabel("Support").setStyle(ButtonStyle.Secondary).setEmoji("🛟")
        );
        // Handlers
        interaction.client.components.set("help:topic", async(i)=>{
            const key=i.values[0];
            const t=HELP_TOPICS[key];
            if(!t) return i.reply({ embeds:[embeds.error("Not found","")], flags: MessageFlags.Ephemeral});
            const e=new EmbedBuilder().setColor(Theme.panel).setTitle(t.title).setDescription(t.content.map(f=> `**${f.name}**\n${f.value}`).join("\n\n").slice(0,4000))
                .setAuthor({ name: `${dispName} • Help`, iconURL: guild.iconURL() ?? undefined }).setFooter({ text:`A.N.G.E.L. • ${t.label}`}).setTimestamp();
            await i.reply({ embeds:[e], flags: MessageFlags.Ephemeral}).catch(()=>{});
        });
        interaction.client.components.set("help:about", async(i)=>{
            const about=await buildAboutEmbed(i.guild, i.client);
            await i.reply({ embeds:[about], flags: MessageFlags.Ephemeral}).catch(()=>{});
        });
        interaction.client.components.set("help:support", async(i)=>{
            await i.reply({ embeds:[embeds.info("Support", `Need help? Open a ticket via panel dropdown, or run \`/support\`.\nStaff will claim with grace.` )], flags: MessageFlags.Ephemeral}).catch(()=>{});
        });
        await interaction.reply({ embeds:[main], components:[row, buttons], flags: MessageFlags.Ephemeral }).catch(()=>{});
    }
};
async function buildAboutEmbed(guild, client){
    const branding=await client.services.branding?.get(guild.id).catch(()=>null);
    const disp=branding?.displayName || client.user.username;
    const icon=branding?.avatarUrl || client.user.displayAvatarURL();
    const e=new EmbedBuilder().setColor(Theme.panel).setAuthor({ name:`${disp} • About`, iconURL: icon }).setTitle("A.N.G.E.L. — Global, Per-Server Configurable")
        .setDescription("*Your atelier for bespoke design, moderation, tickets, leveling, economy — crafted with grace.*")
        .addFields(
            { name:"  🌟 V5", value:"> Intelligent tickets, HTML archives, per-server branding, achievements, automation, analytics", inline:false },
            { name:"  📊 Stats", value:`> \`${client.guilds.cache.size} guilds\` • \`Node ${process.version}\` • <t:${Math.floor((Date.now()-client.uptime)/1000)}:R>`, inline:true },
            { name:"  Branches", value:"> `master` FULL • `cherub` 320MB • `seraph` DIY", inline:true },
            { name:"  Quick Use", value:"```\n/help → guide  •  /config → setup  •  /ticket list → tickets\n```", inline:false }
        ).setThumbnail(icon).setFooter({ text:`A.N.G.E.L. • ${guild.name}`}).setTimestamp();
    return e;
}
