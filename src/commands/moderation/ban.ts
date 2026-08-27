import { SlashCommandBuilder } from "discord.js";
import { defer, requireModerator, confirmDestructive } from "./shared.js";
import { userTag } from "../../design/format.js";
import { embeds } from "../../design/embeds.js";
import type { WingsClient } from "../../core/client.js";
import type { ChatInputCommandInteraction } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member and open a case")
    .addUserOption((o) => o.setName("target").setDescription("Member to ban").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Reason for the ban"))
    .addIntegerOption((o) => o.setName("delete_days").setDescription("Days of messages to delete").setMinValue(0).setMaxValue(7)),
  category: "Moderation",
  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await requireModerator(interaction))) return;
    await defer(interaction);
    const client = interaction.client as WingsClient;
    const target = interaction.options.getUser("target", true);
    const reason = interaction.options.getString("reason") ?? "No reason provided";
    const days = interaction.options.getInteger("delete_days") ?? 0;

    const member = await interaction.guild!.members.fetch(target.id).catch(() => null);
    if (member && !member.bannable) {
      await interaction.editReply({ embeds: [embeds.error("Cannot ban", "I do not have permission to ban this member.")] });
      return;
    }
    const ok = await confirmDestructive(interaction, `Ban **${userTag(target)}**? This opens a case and notifies staff logs.`);
    if (!ok) return;

    const c = await client.services.moderation.ban(interaction.guild!, target, interaction.user, reason, days);
    await interaction.editReply({
      embeds: [embeds.success("Member banned", `**${userTag(target)}** was banned.`, [
        { name: "Case", value: `#${c.caseNumber}`, inline: true },
        { name: "Reason", value: reason, inline: true },
        { name: "Deleted", value: `${days} day(s)`, inline: true },
      ])],
      components: [],
    });
  },
};
