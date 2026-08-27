import { SlashCommandBuilder } from "discord.js";
import { defer, requireModerator, confirmDestructive } from "./shared.js";
import { userTag } from "../../design/format.js";
import { embeds } from "../../design/embeds.js";
export default {
    data: new SlashCommandBuilder()
        .setName("kick")
        .setDescription("Kick a member and open a case")
        .addUserOption((o) => o.setName("target").setDescription("Member to kick").setRequired(true))
        .addStringOption((o) => o.setName("reason").setDescription("Reason for the kick")),
    category: "Moderation",
    async execute(interaction) {
        if (!(await requireModerator(interaction)))
            return;
        await defer(interaction);
        const client = interaction.client;
        const user = interaction.options.getUser("target", true);
        const target = await interaction.guild.members.fetch(user.id).catch(() => null);
        const reason = interaction.options.getString("reason") ?? "No reason provided";
        if (!target) {
            await interaction.editReply({ embeds: [embeds.error("Not found", "That member is not in the server.")] });
            return;
        }
        if (!target.kickable) {
            await interaction.editReply({ embeds: [embeds.error("Cannot kick", "I do not have permission to kick this member.")] });
            return;
        }
        const ok = await confirmDestructive(interaction, `Kick **${userTag(target.user)}**?`);
        if (!ok)
            return;
        const c = await client.services.moderation.kick(interaction.guild, target, interaction.user, reason);
        await interaction.editReply({
            embeds: [embeds.success("Member kicked", `**${userTag(target.user)}** was kicked.`, [
                    { name: "Case", value: `#${c.caseNumber}`, inline: true },
                    { name: "Reason", value: reason, inline: true },
                ])],
            components: [],
        });
    },
};
//# sourceMappingURL=kick.js.map