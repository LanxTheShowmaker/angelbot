import { SlashCommandBuilder, MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { Theme } from "../../design/theme.js";
import { embeds } from "../../design/embeds.js";
export default {
    data: new SlashCommandBuilder().setName("about").setDescription("About A.N.G.E.L. — how to use the bot"),
    category:"Utility",
    async execute(interaction){
        const guild=interaction.guild;
        const client=interaction.client;
        const branding=await client.services.branding?.get(guild.id).catch(()=>null);
        const dispName=branding?.displayName || client.user.username;
        const dispIcon=branding?.avatarUrl || client.user.displayAvatarURL({ size:128 });
        const embed=new EmbedBuilder().setColor(Theme.panel)
            .setAuthor({ name:`${dispName} • About`, iconURL: dispIcon })
            .setTitle("A.N.G.E.L. — Let Us Wing Your Designs")
            .setDescription(
                `*A global, per-server configurable Discord atelier.*\n\n`+
                `**What it does:**\n`+
                `> 🎫 **Tickets** — ORDER-HERE panels, intelligent \`[category][user][id]\` (3 at once), HTML archives\n`+
                `> 🛡️ **Moderation** — cases, escalation, appeals, raid shield\n`+
                `> 🌱 **Leveling** — XP, streaks, prestige, leaderboards\n`+
                `> 💰 **Economy** — shop, jobs, gifts, history\n`+
                `> ⚙️ **Automation** — WHEN levelUp → DO give role, etc.\n\n`+
                `**How to start (3 steps):**\n`+
                `\`1.\` Invite with Manage Server → \`2.\` \`/autosetup\` → \`3.\` \`/setuptickets\` then select from dropdown.\n\n`+
                `**How to use daily:**\n`+
                `> Chat for XP/coins → \`/rank\` → \`/shop\` → \`/ticket list\` → \`/help\` for guide.\n\n`+
                `**Per-server branding:**\n`+
                `> \`/branding set name:MyBot avatar_file:…\` — name/pfp *per server*, not global.\n`
            )
            .addFields(
                { name:"  📚 Help", value:"```\n/help → interactive guide\n```", inline:true },
                { name:"  ⚙️ Config", value:"```\n/config → unified hub\n```", inline:true },
                { name:"  🎫 Support", value:"```\n/support → ticket hub\n```", inline:true },
                { name:"  📊 Stats", value:`> \`${client.guilds.cache.size} guilds\` • \`Node ${process.version}\` • <t:${Math.floor((Date.now()-client.uptime)/1000)}:R>`, inline:false },
                { name:"  Branches", value:"> `master` FULL SELF-HOSTED • `cherub` 320MB • `seraph` DIY AT HOME", inline:false }
            )
            .setThumbnail(dispIcon)
            .setImage(branding?.bannerUrl || null)
            .setFooter({ text:`${dispName} • ${guild.name} • heavenly service`}).setTimestamp();
        const row=new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel("Invite").setStyle(ButtonStyle.Link).setURL(`https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`),
            new ButtonBuilder().setCustomId("about:help").setLabel("Help").setStyle(ButtonStyle.Secondary).setEmoji("📖"),
            new ButtonBuilder().setCustomId("about:support").setLabel("Support").setStyle(ButtonStyle.Secondary).setEmoji("🛟")
        );
        client.components.set("about:help", async(i)=>{
            const e=embeds.info("Help","Run `/help` and pick a topic — Getting Started, Tickets, Moderation, etc.");
            await i.reply({ embeds:[e], flags: MessageFlags.Ephemeral}).catch(()=>{});
        });
        client.components.set("about:support", async(i)=>{
            await i.reply({ embeds:[embeds.info("Support","Open a ticket via panel or `/ticket list` — staff will claim.")], flags: MessageFlags.Ephemeral}).catch(()=>{});
        });
        await interaction.reply({ embeds:[embed], components:[row], flags: MessageFlags.Ephemeral}).catch(()=>{});
    }
};
