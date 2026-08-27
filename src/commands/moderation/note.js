import { SlashCommandBuilder } from "discord.js";
import { defer, requireModerator } from "./shared.js";
import { userTag } from "../../design/format.js";
import { embeds } from "../../design/embeds.js";
export default {
    data: new SlashCommandBuilder()
        .setName("note")
        .setDescription("Add a private moderation note (staff only)")
        .addUserOption((o) => o.setName("target").setDescription("Member to note").setRequired(true))
        .addStringOption((o) => o.setName("note").setDescription("Private note").setRequired(true)),
    category: "Moderation",
    async execute(interaction) {
        if (!(await requireModerator(interaction)))
            return;
        await defer(interaction);
        const client = interaction.client;
        const user = interaction.options.getUser("target", true);
        const target = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!target) {
            await interaction.editReply({ embeds: [embeds.error("Not found", "That member is not in the server.")] });
            return;
        }
        const note = interaction.options.getString("note", true);
        const c = await client.services.moderation.note(interaction.guild, target, interaction.user, note);
        await interaction.editReply({
            embeds: [embeds.neutral("Note added", `Private note recorded for **${userTag(target.user)}**.`, [
                    { name: "Case", value: `#${c.caseNumber}`, inline: true },
                    { name: "Note", value: note, inline: true },
                ])],
        });
    },
};
//# sourceMappingURL=note.js.map