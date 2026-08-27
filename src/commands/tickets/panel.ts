import { SlashCommandBuilder, type GuildTextBasedChannel } from "discord.js";
import { embeds } from "../../design/embeds.js";
import { isStaff } from "../../core/services.js";
import { logger } from "../../core/logger.js";
import type { WingsClient } from "../../core/client.js";
import type { ChatInputCommandInteraction } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Ticket system commands")
    .addSubcommand((s) =>
      s.setName("panel").setDescription("Post the ticket panel with an Open Ticket button in this channel"),
    ),
  category: "Tickets",
  async execute(interaction: ChatInputCommandInteraction) {
    const client = interaction.client as WingsClient;
    const member = interaction.member as any;
    const config = await client.services.settings.get(interaction.guildId!).catch(() => null);
    if (!isStaff(member, config)) {
      await interaction.reply({ embeds: [embeds.error("Missing permission", "Only staff can post the ticket panel.")], ephemeral: true });
      return;
    }
    const sub = interaction.options.getSubcommand();
    if (sub === "panel") {
      await interaction.deferReply({ ephemeral: true });
      const service = client.services.tickets as any;
      const channel = interaction.channel as GuildTextBasedChannel;
      await channel.send({
        embeds: [service.buildPanelEmbed()],
        components: [service.buildOpenButton()],
      }).catch((e: any) => {
        logger.error("tickets", "panel send failed", e);
        return interaction.editReply({ embeds: [embeds.error("Could not post panel", "I may be missing permission to send messages here.")] });
      });
      await interaction.editReply({ embeds: [embeds.success("Panel posted", "The ticket panel was sent to this channel.")] });
    }
  },
};
