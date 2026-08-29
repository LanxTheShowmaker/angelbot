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
            { name:"  ① Invite & Setup", value:"```\n1. Invite bot with Manage Server + Moderation perms\n2. Run /autosetup or !autosetup → creates roles, log channels, welcome\n3. Run /setuptickets or !setuptickets → choose panels (Orders, Assistance, Dashboard)\n4. Run /config or !config → toggle modules, set branding & prefix\n```" },
            { name:"  ② Open a Ticket", value:"```\n• Go to #orders or #support panel\n• Select from dropdown (e.g., Uniform, GFX, General Support)\n• Answer questions → channel created like gfx-ultim-a1b2\n• Staff Claim → help you → Close → HTML archive\n• Use /ticket list or !ticket list to see [category][user][id]\n```" },
            { name:"  ③ Daily Use", value:"```\n• Chat → gain XP & coins (level up!)\n• Slash: /daily /weekly  •  Prefix: !daily !weekly → free coins\n• Slash: /shop  •  Prefix: !shop → buy roles/items\n• Slash: /rank /leaderboard  •  Prefix: !rank !leaderboard → see progress\n```" },
        ]
    },
    tickets: {
        label: "Tickets & Orders",
        emoji: "🎫",
        description: "Tickets & Orders",
        title: "🎫 Tickets — Intelligent List",
        content: [
            { name:"  How Tickets Work", value:"```\n• Channel names: [category][user][id] e.g., uniform-ultim-a1b2\n• You can have 3 open tickets at once\n• Staff claim, add/remove users, priority, close → archive (HTML)\n```" },
            { name:"  Commands (Both)", value:"```\nSlash: /ticket list /close /reopen /transfer\nPrefix: !ticket list !ticket close !ticket transfer\nSlash: /setuptickets  •  Prefix: !setuptickets\n```" },
            { name:"  Panel Setup", value:"```\n/setuptickets or !setuptickets → pick panel (ORDER/ASSISTANCE)\n• Set channel, banner (ORDER-HERE), ticket types\n```" },
        ]
    },
    moderation: {
        label: "Moderation Center",
        emoji: "🛡️",
        description: "Moderation Center",
        title: "🛡️ Moderation — Safe & Audited",
        content: [
            { name:"  Actions (Both)", value:"```\nSlash: /ban /kick /timeout /warn  •  Prefix: !ban !kick !timeout !warn\n• Each creates a Case # + logs to modLog\n```" },
            { name:"  Center", value:"```\nSlash: /modcenter browse  •  Prefix: !modcenter browse\nSlash: /modcenter history @user  •  Prefix: !modcenter history @user\n```" },
            { name:"  Safety", value:"```\n• Timeout auto-expires, audit logged\n• Appeals: /modcenter appeal #case or !appeal\n• Raid: /raid status or !raid status\n```" },
        ]
    },
    automod: {
        label: "AutoMod & Raid",
        emoji: "🤖",
        description: "AutoMod & Raid",
        title: "🤖 AutoMod — Local Intelligence",
        content: [
            { name:"  What it Catches", value:"```\n• Spam, flood, duplicate, caps, emoji spam\n• Invites, links, words, regex/phrase rules\n• Unicode obfuscation (zalgo/zero-width)\n```" },
            { name:"  Configure (Both)", value:"```\nSlash: /automod  •  Prefix: !automod\nSlash: /automod status  •  Prefix: !automod status\n```" },
            { name:"  Raid", value:"```\nSlash: /raid status  •  Prefix: !raid status → risk 0-100\n```" },
        ]
    },
    leveling: {
        label: "Leveling V5",
        emoji: "🌱",
        description: "Leveling V5",
        title: "🌱 Leveling — Growth",
        content: [
            { name:"  Earn XP", value:"```\n• 5-15 XP per message (60s cooldown, anti-farm)\n• Multipliers: global + per-channel\n```" },
            { name:"  Commands (Both)", value:"```\nSlash: /rank /leaderboard  •  Prefix: !rank !leaderboard\nSlash: /level weekly  •  Prefix: !level weekly\nSlash: /profile  •  Prefix: !profile\n```" },
            { name:"  Config", value:"```\nSlash: /level config  •  Prefix: !level config\n```" },
        ]
    },
    economy: {
        label: "Economy V5",
        emoji: "💰",
        description: "Economy V5",
        title: "💰 Economy — Heavenly Coins",
        content: [
            { name:"  Earn", value:"```\n• Message 10% chance 5-15 coins\n• Slash: /daily /weekly  •  Prefix: !daily !weekly\n• Slash: /economy work  •  Prefix: !work\n```" },
            { name:"  Spend & Trade (Both)", value:"```\nSlash: /shop  •  Prefix: !shop\nSlash: /balance  •  Prefix: !balance or !bal\nSlash: /economy gift @user  •  Prefix: !gift @user\n```" },
            { name:"  History", value:"```\nSlash: /economy history  •  Prefix: !economy history\n```" },
        ]
    },
    utility: {
        label: "Utilities & Fun",
        emoji: "🔧",
        description: "Utilities & Fun",
        title: "🔧 Utilities",
        content: [
            { name:"  Info (Both)", value:"```\nSlash: /info user @user  •  Prefix: !info @user\nSlash: /whois @user  •  Prefix: !whois @user\nSlash: /profile  •  Prefix: !profile\n```" },
            { name:"  Tools (Both)", value:"```\nSlash: /poll /remind  •  Prefix: !poll !remind\nSlash: /schedule announce  •  Prefix: !schedule\n```" },
            { name:"  Fun (Both)", value:"```\nSlash: /8ball /coinflip  •  Prefix: !8ball !coinflip\n```" },
        ]
    },
    config: {
        label: "Config Center",
        emoji: "⚙️",
        description: "Config Center",
        title: "⚙️ Unified Config",
        content: [
            { name:"  One Hub (Both)", value:"```\nSlash: /config  •  Prefix: !config\nSlash: /prefix view|set|reset  •  Prefix: !prefix view|set\n```" },
            { name:"  Per-Server Branding", value:"```\nSlash: /botprofile or /branding\nPrefix: !botprofile, !branding\n• Per-server name/avatar/banner (not global)\n```" },
            { name:"  Prefix Config", value:"```\nCurrent: ! (per-server) — change via\nSlash: /prefix set ?  •  Prefix: !prefix set ?\nServer A: !  Server B: ?  — isolated\n```" },
        ]
    },
    prefix: {
        label: "Prefix System",
        emoji: "💬",
        description: "Traditional prefix commands",
        title: "💬 Prefix Commands — Traditional",
        content: [
            { name:"  How It Works", value:"```\n• Guild prefix default: !  (per-server, cached 5m)\n• Supports: !ping  and  ! ping  and  !ban @user reason\n• Quoted: !poll \"my question\" \"opt 1\" \"opt 2\"\n• Mentions: @user, #channel, @role, IDs all work\n```" },
            { name:"  Examples (Both)", value:"```\n!ping  ↔  /ping\n!whois @user  ↔  /whois @user\n!ban @user spam  ↔  /ban target:@user reason:spam\n!ticket close  ↔  /ticket close\n!help  ↔  /help\n```" },
            { name:"  Config", value:"```\n!prefix view  ↔  /prefix view\n!prefix set ?  ↔  /prefix set ?\n!prefix reset  ↔  /prefix reset\n• Same permissions, same services\n```" },
        ]
    },
};
async function buildMainEmbed(guild, displayName){
    const prefixService = guild.client?.services?.prefix;
    const prefix = prefixService ? await prefixService.getPrefix(guild.id).catch(()=> "!") : "!";
    return new EmbedBuilder().setColor(Theme.panel)
        .setAuthor({ name: `${displayName} • Help`, iconURL: guild?.iconURL({ size:64 }) ?? undefined })
        .setTitle("✦  How to Use A.N.G.E.L.")
        .setDescription(`*Heavenly service — use **slash** \`/\` or **prefix** \`${prefix}\` — both call the same logic.*`)
        .addFields(
            { name:"  🚀 Quick Start", value: "```\n/autosetup → foundation  •  /setuptickets → panels  •  /ticket list → your tickets\n```", inline:false },
            { name:"  💬 Two Ways", value: `**Slash:** \`/ban @user\` \`/ticket close\` \`/ping\` \`/whois @user\`\n**Prefix:** \`${prefix}ban @user\` \`${prefix}ticket close\` \`${prefix}ping\` \`${prefix}whois @user\`\n*Same permissions, same services, same results.*`, inline:false },
            { name:"  🔧 Prefix Config", value: `\`Current: \\\`${prefix}\\\`\` • \`/prefix view\` or \`${prefix}prefix\` • \`/prefix set ?\` or \`${prefix}prefix set ?\` → Server B can be \`?\` while Server A stays \`${prefix}\``, inline:false },
            { name:"  ✨ V5 Highlights", value: "```\n• Intelligent [category][user][id] tickets (3 at once, HTML archive)\n• Per-server bot name/pfp via /botprofile\n• Leveling streaks + prestige, Economy jobs/gifts, Achievements\n```", inline:false },
            { name:"  📚 Topics", value: Object.values(HELP_TOPICS).map(t=> `${t.emoji} **${t.label}**`).join(" • ").slice(0,1024), inline:false }
        )
        .setThumbnail(guild?.client?.user?.displayAvatarURL({ size:128 }) ?? null)
        .setFooter({ text:`A.N.G.E.L. • prefix \`${prefix}\` per-server • /about for story`});
}
export default {
    data: new SlashCommandBuilder().setName("help").setDescription("How to use A.N.G.E.L. — interactive guide"),
    category:"Utility",
    async execute(interaction){
        const guild=interaction.guild;
        const branding=await interaction.client.services.branding?.get(guild.id).catch(()=>null);
        const dispName=branding?.displayName || interaction.client.user.username;
        const main=await buildMainEmbed(guild, dispName);
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
