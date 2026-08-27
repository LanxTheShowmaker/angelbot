import { SlashCommandBuilder } from "discord.js";
import { defer, confirmDestructive } from "../moderation/shared.js";
import { embeds } from "../../design/embeds.js";
import { logger } from "../../core/logger.js";
import { isModerator } from "../../core/services.js";
import type { WingsClient } from "../../core/client.js";
import type { ChatInputCommandInteraction, GuildMember, TextChannel } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Delete recent messages (moderators only)")
    .addIntegerOption((o) => o.setName("count").setDescription("Number of messages (1-100)").setRequired(true).setMinValue(1).setMaxValue(100))
    .addUserOption((o) => o.setName("user").setDescription("Only delete messages from this user").setRequired(false)),
  category: "Utility",
  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await requireModerator(interaction))) return;
    await defer(interaction);
    const client = interaction.client as WingsClient;
    const guild = interaction.guild!;
    const channel = interaction.channel! as TextChannel;
    const count = interaction.options.getInteger("count", true);
    const targetUser = interaction.options.getUser("user");

    const confirmed = await confirmDestructive(interaction, `Delete up to **${count}** message(s)${targetUser ? ` from <@${targetUser.id}>` : ""}?`);
    if (!confirmed) return;

    try {
      const fetched = await channel.messages.fetch({ limit: count });
      const toDelete = targetUser ? fetched.filter((m) => m.author.id === targetUser.id) : fetched;

      if (toDelete.size === 0) {
        await interaction.editReply({ embeds: [embeds.warn("Nothing to delete", "No matching messages were found.")] });
        return;
      }

      let deletedCount = 0;
      try {
        const deleted = await channel.bulkDelete(toDelete, false);
        deletedCount = deleted instanceof Map ? deleted.size : Number(deleted);
      } catch (bulkErr) {
        logger.warn("utility", "bulkDelete without filter failed, retrying filtered", bulkErr);
        const deleted = await channel.bulkDelete(toDelete, true).catch(() => null);
        if (deleted) deletedCount = deleted instanceof Map ? deleted.size : Number(deleted);
      }

      await interaction.editReply({
        embeds: [embeds.success("Messages purged", `Deleted **${deletedCount}** message(s). Messages older than 14 days cannot be bulk deleted.`)],
        components: [],
      });
    } catch (e) {
      logger.error("utility", "purge failed", e);
      await interaction.editReply({ embeds: [embeds.error("Purge failed", "Could not delete those messages.")], components: [] });
    }
  },
};

async function requireModerator(interaction: ChatInputCommandInteraction): Promise<boolean> {
  const client = interaction.client as WingsClient;
  const member = interaction.member as GuildMember;
  const config = await client.services.settings.get(interaction.guildId!).catch(() => null);
  if (!isModerator(member, config)) {
    await interaction.reply({ embeds: [embeds.error("Missing permission", "You need moderator permissions to use this.")], ephemeral: true });
    return false;
  }
  return true;
}
