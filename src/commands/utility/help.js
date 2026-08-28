import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { embeds } from "../../design/embeds.js";
import { Theme } from "../../design/theme.js";

export default {
    data: new SlashCommandBuilder().setName("help").setDescription("A.N.G.E.L. — command guide"),
    category: "Utility",
    async execute(interaction) {
        const embed = embeds.panel("✦  A.N.G.E.L.  •  Help", "*Heavenly service, elegantly organised.*\nChoose a category below or run the command directly.", [
            { name: "  ✦  Setup  •  One-time", value: "```\n/autosetup       —  Server foundation (roles, logs, welcome)\n/setuptickets    —  Panels & ticket types (Orders, Assistance, Regulations, Dashboard)\n/settings        —  Fine-tune logging, welcome, prefix\n/automod         —  Filters, spam, raid, scam\n```", inline: false },
            { name: "  🛡️  Moderation  •  Staff", value: "```\n/ban /kick /timeout /warn /note  —  with case\n/case view | resolve | user | moderator\n/fortress enable|disable|status  —  lockdown\n/purge  —  bulk delete   •   /slowmode  —  channel cooldown\n```", inline: false },
            { name: "  🎫  Tickets & Orders", value: "```\nPanels via /setuptickets → dropdown to open ticket\nClaim / Status / Priority / Add/Remove / Info / Close / Transcript\n/order  —  legacy design orders (use /setuptickets Orders)\n```", inline: false },
            { name: "  🔍  Info & Utility", value: "```\n/info user|server|avatar  —  unified info\n/poll  —  up to 10 options    •   /remind  —  DM reminder\n/ping  —  latency    •   /help  —  this guide\n```", inline: false },
        ], {
            author: { name: `A.N.G.E.L. • ${interaction.guild?.name ?? "Help"}`, iconURL: interaction.guild?.iconURL({ size: 64 }) ?? undefined },
            footer: `A.N.G.E.L.  •  ${interaction.client.user?.tag ?? "Help"}  •  heavenly service`,
        });
        embed.setColor(Theme.panel);
        embed.setThumbnail(interaction.client.user?.displayAvatarURL({ size: 128 }) ?? null);
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral }).catch(() => {});
    },
};
