import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { embeds } from "../../design/embeds.js";
import { Theme } from "../../design/theme.js";

export default {
    data: new SlashCommandBuilder().setName("help").setDescription("A.N.G.E.L. — command guide"),
    category: "Utility",
    async execute(interaction) {
        const embed = embeds.panel("✦  A.N.G.E.L.  •  Help", "*Heavenly service, elegantly organised — packed with features.*\nChoose a category below or run the command directly.", [
            { name: "  ✦  Setup  •  One-time", value: "```\n/autosetup       —  Server foundation (roles, logs, welcome)\n/setuptickets    —  Panels & ticket types (Orders, Assistance, Regulations, Dashboard)\n/settings        —  Fine-tune logging, welcome, prefix\n/automod         —  Filters, spam, raid, scam (modular)\n```", inline: false },
            { name: "  🛡️  Moderation  •  Staff", value: "```\n/ban /kick /timeout /warn /note  —  with case\n/case view | resolve | user | moderator\n/fortress enable|disable|status  —  lockdown\n/purge  —  bulk delete   •   /slowmode  —  channel cooldown\n```", inline: false },
            { name: "  🎫  Tickets & Orders", value: "```\nPanels via /setuptickets → dropdown to open ticket\nClaim / Status / Priority / Add/Remove / Info / Close / Transcript\n/order  —  legacy design orders (use /setuptickets Orders)\n```", inline: false },
            { name: "  🔍  Info & Utility", value: "```\n/info user|server|avatar  —  unified info\n/poll  —  up to 10 options    •   /remind  —  DM reminder\n/ping  —  latency    •   /botinfo  —  about\n/support  —  ticket hub\n```", inline: false },
            { name: "  🎮  Fun  •  Packed", value: "```\n/8ball /coinflip /roll /rps  —  games\n/joke /meme /ship /hug /trivia  —  social fun\n```", inline: false },
            { name: "  🌱  Growth  •  Engagement", value: "```\n/rank /leaderboard  —  leveling & boards\n/balance /daily /shop  —  economy & heavenly shop\n/reactionroles /giveaway /suggest /starboard /afk\n```", inline: false },
        ], {
            author: { name: `A.N.G.E.L. • ${interaction.guild?.name ?? "Help"}`, iconURL: interaction.guild?.iconURL({ size: 64 }) ?? undefined },
            footer: `A.N.G.E.L.  •  ${interaction.client.user?.tag ?? "Help"}  •  heavenly service`,
        });
        embed.setColor(Theme.panel);
        embed.setThumbnail(interaction.client.user?.displayAvatarURL({ size: 128 }) ?? null);
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral }).catch(() => {});
    },
};
