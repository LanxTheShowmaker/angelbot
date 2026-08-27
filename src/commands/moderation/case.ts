import { SlashCommandBuilder } from "discord.js";
import { defer, requireModerator } from "./shared.js";
import { embeds, formatCaseLine } from "../../design/embeds.js";
import { time } from "discord.js";
import type { WingsClient } from "../../core/client.js";
import type { ChatInputCommandInteraction } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("case")
    .setDescription("View and manage moderation cases")
    .addSubcommand((s) => s.setName("view").setDescription("View a case by number").addIntegerOption((o) => o.setName("number").setDescription("Case number").setRequired(true)))
    .addSubcommand((s) => s.setName("resolve").setDescription("Resolve a case").addIntegerOption((o) => o.setName("number").setDescription("Case number").setRequired(true)))
    .addSubcommand((s) => s.setName("user").setDescription("Cases for a member").addUserOption((o) => o.setName("target").setDescription("Member").setRequired(true)))
    .addSubcommand((s) => s.setName("moderator").setDescription("Cases by a moderator").addUserOption((o) => o.setName("mod").setDescription("Moderator").setRequired(true))),
  category: "Moderation",
  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await requireModerator(interaction))) return;
    await defer(interaction);
    const client = interaction.client as WingsClient;
    const sub = interaction.options.getSubcommand();

    if (sub === "view") {
      const n = interaction.options.getInteger("number", true);
      const c = await client.services.cases.get(interaction.guildId!, n);
      if (!c) return interaction.editReply({ embeds: [embeds.error("Not found", `Case #${n} does not exist.`)] });
      return interaction.editReply({
        embeds: [embeds.moderation(`Case #${c.caseNumber} · ${c.action}`, c.reason ?? "No reason provided", [
          { name: "Target", value: `${c.targetTag} (\`${c.targetId}\`)`, inline: true },
          { name: "Moderator", value: c.moderatorTag, inline: true },
          { name: "Opened", value: time(c.createdAt), inline: true },
          { name: "Duration", value: c.duration ?? "—", inline: true },
          { name: "Status", value: c.resolved ? `Resolved by ${c.resolvedByTag ?? "—"}` : "Active", inline: true },
        ])],
      });
    }

    if (sub === "resolve") {
      const n = interaction.options.getInteger("number", true);
      const c = await client.services.cases.resolve(interaction.guildId!, n, { id: interaction.user.id, tag: interaction.user.tag });
      if (!c) return interaction.editReply({ embeds: [embeds.error("Not found", `Case #${n} does not exist.`)] });
      if (!c.resolved) return interaction.editReply({ embeds: [embeds.warn("Already resolved", `Case #${n} was already resolved.`)] });
      return interaction.editReply({ embeds: [embeds.success("Case resolved", `Case #${n} marked resolved.`)] });
    }

    if (sub === "user") {
      const target = interaction.options.getUser("target", true);
      const cases = await client.services.cases.byTarget(interaction.guildId!, target.id);
      const lines = cases.length ? cases.map(formatCaseLine).join("\n") : "No cases on record.";
      return interaction.editReply({ embeds: [embeds.info(`${target.tag} · ${cases.length} case(s)`, lines)] });
    }

    if (sub === "moderator") {
      const mod = interaction.options.getUser("mod", true);
      const cases = await client.services.cases.byModerator(interaction.guildId!, mod.id);
      const lines = cases.length ? cases.map(formatCaseLine).join("\n") : "No cases by this moderator.";
      return interaction.editReply({ embeds: [embeds.info(`${mod.tag} · ${cases.length} case(s)`, lines)] });
    }
  },
};
