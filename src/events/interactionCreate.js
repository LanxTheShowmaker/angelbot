import { MessageFlags } from "discord.js";
import { embeds } from "../design/embeds.js";
import { logger } from "../core/logger.js";
function resolveComponent(client, customId) {
    if (client.components.has(customId))
        return client.components.get(customId);
    for (const [key, handler] of client.components) {
        if (customId === key || customId.startsWith(key + ":"))
            return handler;
    }
    return undefined;
}
export default {
    name: "interactionCreate",
    async execute(interaction, client) {
        try {
            if (interaction.isChatInputCommand()) {
                const command = client.commands.get(interaction.commandName);
                if (!command)
                    return;
                await command.execute(interaction);
                return;
            }
            if (interaction.isAutocomplete()) {
                const command = client.commands.get(interaction.commandName);
                if (command?.autocomplete)
                    await command.autocomplete(interaction);
                return;
            }
            if (interaction.isMessageComponent()) {
                const handler = resolveComponent(client, interaction.customId);
                if (handler)
                    await handler(interaction);
                return;
            }
            if (interaction.isModalSubmit()) {
                const handler = resolveComponent(client, interaction.customId);
                if (handler)
                    await handler(interaction);
            }
        }
        catch (e) {
            logger.error("interaction", "unhandled error", e);
            const reply = embeds.error("Something went wrong", "That action could not be completed. Please try again or contact staff.");
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [reply], flags: MessageFlags.Ephemeral }).catch(() => { });
            }
            else {
                await interaction.reply({ embeds: [reply], flags: MessageFlags.Ephemeral }).catch(() => { });
            }
        }
    },
};
//# sourceMappingURL=interactionCreate.js.map