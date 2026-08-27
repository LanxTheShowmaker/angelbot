import { SlashCommandBuilder, time } from "discord.js";
import { defer } from "../moderation/shared.js";
import { embeds } from "../../design/embeds.js";
import { logger } from "../../core/logger.js";
import type { WingsClient } from "../../core/client.js";
import type { ChatInputCommandInteraction } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("whois")
    .setDescription("Show information about a member")
    .addUserOption((o) => o.setName("user").setDescription("Member to inspect").setRequired(true)),
  category: "Utility",
  async execute(interaction: ChatInputCommandInteraction) {
    await defer(interaction);
    const client = interaction.client as WingsClient;
    const user = interaction.options.getUser("user", true);
    try {
      const guild = interaction.guild!;
      const member = await guild.members.fetch(user.id).catch(() => null);
      const roles = member
        ? member.roles.cache
            .filter((r) => r.id !== guild.id)
            .sort((a, b) => b.position - a.position)
            .first(10)
            .map((r) => r.name)
            .join(", ") || "None"
        : "Unknown";
      await interaction.editReply({
        embeds: [
          embeds.info(`Member: ${user.username}`, undefined, [
            { name: "ID", value: user.id, inline: true },
            { name: "Username", value: user.username, inline: true },
            { name: "Global name", value: user.globalName ?? "None", inline: true },
            { name: "Nickname", value: member?.nickname ?? "None", inline: true },
            { name: "Joined", value: member?.joinedAt ? time(member.joinedAt, "R") : "Unknown", inline: true },
            { name: "Created", value: time(user.createdAt, "R"), inline: true },
            { name: "Top roles", value: roles },
          ]),
        ],
      });
    } catch (e) {
      logger.error("utility", "whois failed", e);
      await interaction.editReply({ embeds: [embeds.error("Lookup failed", "Could not fetch that member.")] });
    }
  },
};
