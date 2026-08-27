import { SlashCommandBuilder } from "discord.js";
import { defer } from "../moderation/shared.js";
import { embeds } from "../../design/embeds.js";
import { isStaff } from "../../core/services.js";
import { logger } from "../../core/logger.js";
export default {
    data: new SlashCommandBuilder()
        .setName("slowmode")
        .setDescription("Set the channel slowmode")
        .addIntegerOption((o) => o.setName("seconds").setDescription("Slowmode in seconds (0 to disable)").setRequired(true).setMinValue(0).setMaxValue(21600)),
    category: "Utility",
    async execute(interaction) {
        await defer(interaction, true);
        const client = interaction.client;
        const guild = interaction.guild;
        const channel = interaction.channel;
        const member = interaction.member;
        const seconds = interaction.options.getInteger("seconds", true);
        const config = await client.services.settings.get(guild.id).catch(() => null);
        const hasChannelPerm = member.permissions.has("ManageChannels");
        if (!isStaff(member, config) && !hasChannelPerm) {
            await interaction.editReply({ embeds: [embeds.error("Missing permission", "You need staff role or Manage Channels permission.")] });
            return;
        }
        try {
            await channel.setRateLimitPerUser(seconds);
            await interaction.editReply({
                embeds: [embeds.success("Slowmode updated", seconds === 0 ? "Slowmode disabled." : `Slowmode set to **${seconds}** second(s).`)],
            });
        }
        catch (e) {
            logger.error("utility", "slowmode failed", e);
            await interaction.editReply({ embeds: [embeds.error("Slowmode failed", "Could not update the channel slowmode.")] });
        }
    },
};
//# sourceMappingURL=slowmode.js.map