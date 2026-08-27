import { SlashCommandBuilder } from "discord.js";
import { embeds } from "../../design/embeds.js";
import { isStaff } from "../../core/services.js";
import { logger } from "../../core/logger.js";
export default {
    data: new SlashCommandBuilder()
        .setName("ticket")
        .setDescription("Ticket system commands")
        .addSubcommand((s) => s.setName("panel").setDescription("Post the ticket panel with an Open Ticket button in this channel")),
    category: "Tickets",
    async execute(interaction) {
        const client = interaction.client;
        const member = interaction.member;
        const config = await client.services.settings.get(interaction.guildId).catch(() => null);
        if (!isStaff(member, config)) {
            await interaction.reply({ embeds: [embeds.error("Missing permission", "Only staff can post the ticket panel.")], ephemeral: true });
            return;
        }
        const sub = interaction.options.getSubcommand();
        if (sub === "panel") {
            await interaction.deferReply({ ephemeral: true });
            const service = client.services.tickets;
            const channel = interaction.channel;
            await channel.send({
                embeds: [service.buildPanelEmbed()],
                components: [service.buildOpenButton()],
            }).catch((e) => {
                logger.error("tickets", "panel send failed", e);
                return interaction.editReply({ embeds: [embeds.error("Could not post panel", "I may be missing permission to send messages here.")] });
            });
            await interaction.editReply({ embeds: [embeds.success("Panel posted", "The ticket panel was sent to this channel.")] });
        }
    },
};
//# sourceMappingURL=panel.js.map