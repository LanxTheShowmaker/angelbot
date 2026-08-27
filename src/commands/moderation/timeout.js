import { SlashCommandBuilder } from "discord.js";
import { defer, requireModerator, confirmDestructive, parseDuration } from "./shared.js";
import { userTag } from "../../design/format.js";
import { embeds } from "../../design/embeds.js";
export default {
    data: new SlashCommandBuilder()
        .setName("timeout")
        .setDescription("Temporarily timeout a member")
        .addUserOption((o) => o.setName("target").setDescription("Member to timeout").setRequired(true))
        .addStringOption((o) => o.setName("duration").setDescription("e.g. 10m, 1h, 1d").setRequired(true))
        .addStringOption((o) => o.setName("reason").setDescription("Reason for the timeout")),
    category: "Moderation",
    async execute(interaction) {
        if (!(await requireModerator(interaction)))
            return;
        await defer(interaction);
        const client = interaction.client;
        const user = interaction.options.getUser("target", true);
        const target = await interaction.guild.members.fetch(user.id).catch(() => null);
        const reason = interaction.options.getString("reason") ?? "No reason provided";
        const duration = parseDuration(interaction.options.getString("duration", true));
        if (!target) {
            await interaction.editReply({ embeds: [embeds.error("Not found", "That member is not in the server.")] });
            return;
        }
        if (!duration) {
            await interaction.editReply({ embeds: [embeds.error("Invalid duration", "Use a format like `10m`, `1h`, or `1d`.")] });
            return;
        }
        if (!target.moderatable) {
            await interaction.editReply({ embeds: [embeds.error("Cannot timeout", "I cannot timeout this member (role hierarchy or permissions).")] });
            return;
        }
        const ok = await confirmDestructive(interaction, `Timeout **${userTag(target.user)}** for ${durationLabel(duration)}?`);
        if (!ok)
            return;
        const c = await client.services.moderation.timeout(target, interaction.user, duration, reason);
        await interaction.editReply({
            embeds: [embeds.success("Member timed out", `**${userTag(target.user)}** was timed out for ${durationLabel(duration)}.`, [
                    { name: "Case", value: `#${c.caseNumber}`, inline: true },
                    { name: "Reason", value: reason, inline: true },
                ])],
            components: [],
        });
    },
};
function durationLabel(ms) {
    const seconds = Number(ms) / 1000;
    if (seconds < 60)
        return `${seconds}s`;
    if (seconds < 3600)
        return `${Math.round(seconds / 60)}m`;
    if (seconds < 86400)
        return `${Math.round(seconds / 3600)}h`;
    return `${Math.round(seconds / 86400)}d`;
}
//# sourceMappingURL=timeout.js.map