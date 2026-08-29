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
            .setTitle("A.N.G.E.L. — Discord Management Platform")
            .setDescription(
                `A configurable server management platform providing moderation, ticketing, automation, leveling, economy, and administrative tools.\n`
            )
            .addFields(
                { name:"Core Capabilities", value:
                    `**Moderation**\nComprehensive moderation workflows, case management, automated protection, and administrative controls.\n\n`+
                    `**Ticketing**\nConfigurable support workflows with ticket panels, staff assignment, transcripts, and lifecycle management.\n\n`+
                    `**Automation**\nAutomated role management, scheduled actions, event handling, and server workflows.\n\n`+
                    `**Leveling**\nXP progression, levels, streaks, leaderboards, and configurable rewards.\n\n`+
                    `**Economy**\nServer currency, rewards, shop systems, and user account management.\n\n`+
                    `**Configuration**\nCentralized per-server configuration with granular controls and persistent settings.`, inline:false },
                { name:"Getting Started", value:
                    `**1.** Invite A.N.G.E.L. with the required server permissions.\n`+
                    `**2.** Run \`/autosetup\` to initialize the server configuration.\n`+
                    `**3.** Use \`/config\` to customize individual modules.\n\n`+
                    `For advanced configuration, use the relevant module's configuration commands.`, inline:false },
                { name:"Common Commands", value:
                    `\`/rank\` — View your progression and level.\n`+
                    `\`/shop\` — Browse available rewards.\n`+
                    `\`/ticket\` — Access ticket management.\n`+
                    `\`/help\` — Open the interactive command reference.`, inline:false },
                { name:"Server Branding", value:
                    `Customize A.N.G.E.L.'s presentation independently for each server, including display name, logo, colors, embeds, and other user-facing elements.`, inline:false },
                { name:"Deployment Variants", value:
                    `**master** — Full-featured self-hosted deployment.\n`+
                    `**cherub** — Resource-optimized deployment for low-memory hosting.\n`+
                    `**seraph** — Home-hosted deployment intended for users managing their own infrastructure.`, inline:false },
                { name:"System Status", value:
                    `Servers \`${client.guilds.cache.size}\`\n`+
                    `Node.js \`${process.version}\`\n`+
                    `Status Operational\n`+
                    `Last updated <t:${Math.floor((Date.now()-client.uptime)/1000)}:R>`, inline:false },
            )
            .setThumbnail(dispIcon)
            .setFooter({ text:`A.N.G.E.L. • Discord Management Platform`}).setTimestamp();
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
