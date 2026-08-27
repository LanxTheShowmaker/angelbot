import { SlashCommandBuilder } from "discord.js";
import { defer } from "../moderation/shared.js";
import { embeds } from "../../design/embeds.js";
import { logger } from "../../core/logger.js";
import type { WingsClient } from "../../core/client.js";
import type { ChatInputCommandInteraction } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Show a user's avatar")
    .addUserOption((o) => o.setName("user").setDescription("Member to view").setRequired(false)),
  category: "Utility",
  async execute(interaction: ChatInputCommandInteraction) {
    await defer(interaction);
    const client = interaction.client as WingsClient;
    const user = interaction.options.getUser("user") ?? interaction.user;
    try {
      const url = user.displayAvatarURL({ size: 512, forceStatic: false });
      await interaction.editReply({
        embeds: [embeds.info(`${user.username}'s avatar`, undefined).setImage(url)],
        components: [client.services.utility.makeAvatarButton(url)],
      });
    } catch (e) {
      logger.error("utility", "avatar failed", e);
      await interaction.editReply({ embeds: [embeds.error("Lookup failed", "Could not fetch that avatar.")] });
    }
  },
};
