import { SlashCommandBuilder } from "discord.js";
import { defer, requireModerator } from "./shared.js";
import { userTag } from "../../design/format.js";
import { embeds } from "../../design/embeds.js";
export default {
    data: new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Issue a formal warning (creates a case)")
        .addUserOption((o) => o.setName("target").setDescription("Member to warn").setRequired(true))
        .addStringOption((o) => o.setName("reason").setDescription("Reason for the warning").setRequired(true)),
    category: "Moderation",
    async execute(interaction) {
        if (!(await requireModerator(interaction)))
            return;
        await defer(interaction);
        const client = interaction.client;
        const user = interaction.options.getUser("target", true);
        const target = await interaction.guild.members.fetch(user.id).catch(() => null);
        const reason = interaction.options.getString("reason", true);
        if (!target) {
            await interaction.editReply({ embeds: [embeds.error("Not found", "That member is not in the server.")] });
            return;
        }
        const c = await client.services.moderation.warn(interaction.guild, target, interaction.user, reason);
        try {
            await target.send({ embeds: [embeds.warn("You received a warning", `**${interaction.guild.name}**\n${reason}\nCase #${c.caseNumber}`)] }).catch(() => { });
        }
        catch { }
        await interaction.editReply({
            embeds: [embeds.success("Warning issued", `**${userTag(target.user)}** was warned.`, [
                    { name: "Case", value: `#${c.caseNumber}`, inline: true },
                    { name: "Reason", value: reason, inline: true },
                ])],
        });
    },
};
//# sourceMappingURL=warn.js.map