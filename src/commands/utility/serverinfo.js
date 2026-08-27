import { SlashCommandBuilder, time } from "discord.js";
import { defer } from "../moderation/shared.js";
import { embeds } from "../../design/embeds.js";
import { logger } from "../../core/logger.js";
export default {
    data: new SlashCommandBuilder()
        .setName("serverinfo")
        .setDescription("Show information about this server"),
    category: "Utility",
    async execute(interaction) {
        await defer(interaction);
        const client = interaction.client;
        const guild = interaction.guild;
        try {
            await interaction.editReply({
                embeds: [
                    embeds.info(`Server: ${guild.name}`, undefined, [
                        { name: "ID", value: guild.id, inline: true },
                        { name: "Owner", value: `<@${guild.ownerId}>`, inline: true },
                        { name: "Members", value: String(guild.memberCount), inline: true },
                        { name: "Boosts", value: String(guild.premiumSubscriptionCount ?? 0), inline: true },
                        { name: "Channels", value: String(guild.channels.cache.size), inline: true },
                        { name: "Roles", value: String(guild.roles.cache.size), inline: true },
                        { name: "Created", value: time(guild.createdAt, "R"), inline: true },
                    ]),
                ],
            });
        }
        catch (e) {
            logger.error("utility", "serverinfo failed", e);
            await interaction.editReply({ embeds: [embeds.error("Lookup failed", "Could not fetch server info.")] });
        }
    },
};
//# sourceMappingURL=serverinfo.js.map