import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { embeds, confirmationRow } from "../../design/embeds.js";
import { isStaff } from "../../core/services.js";
export default {
    data: new SlashCommandBuilder()
        .setName("fortress")
        .setDescription("Server lockdown controls")
        .addSubcommand((s) => s.setName("enable").setDescription("Enable fortress mode (lock all channels to staff)"))
        .addSubcommand((s) => s.setName("disable").setDescription("Disable fortress mode and restore permissions"))
        .addSubcommand((s) => s.setName("status").setDescription("Show current fortress status")),
    category: "Moderation",
    async execute(interaction) {
        const client = interaction.client;
        const sub = interaction.options.getSubcommand();
        const config = await client.services.settings.get(interaction.guildId).catch(() => null);
        if (!isStaff(interaction.member, config)) {
            return interaction.reply({ embeds: [embeds.error("Missing permission", "Only staff can control fortress mode.")], ephemeral: true });
        }
        if (sub === "status") {
            const state = await client.services.fortress.getState(interaction.guild.id).catch(() => null);
            return interaction.reply({ embeds: [client.services.fortress.statusEmbed(interaction.guild, state)], ephemeral: true });
        }
        if (sub === "disable") {
            await interaction.deferReply({ ephemeral: true });
            const result = await client.services.fortress.disable(interaction.guild).catch((e) => {
                return { error: String(e) };
            });
            if (result?.error) {
                return interaction.editReply({ embeds: [embeds.error("Could not stand down", "An error occurred while restoring permissions.")] });
            }
            if (!result?.wasActive) {
                return interaction.editReply({ embeds: [embeds.info("Fortress inactive", "Fortress mode was not active.")] });
            }
            return interaction.editReply({ embeds: [embeds.success("Fortress stood down", "Channels have been restored to normal permissions.")] });
        }
        if (sub === "enable") {
            await interaction.deferReply({ ephemeral: true });
            const state = await client.services.fortress.getState(interaction.guild.id).catch(() => null);
            if (state?.active) {
                return interaction.editReply({ embeds: [embeds.warn("Already active", "Fortress mode is already enabled.")] });
            }
            client.components.set("wings:fortress:enable:confirm", async (i) => {
                await i.deferUpdate().catch(() => { });
                const result = await client.services.fortress.enable(i.guild, i.member).catch((e) => ({ error: String(e) }));
                if (result?.error) {
                    await i.editReply({ embeds: [embeds.error("Could not enable", "An error occurred while locking channels.")], components: [] }).catch(() => { });
                    return;
                }
                if (result?.alreadyActive) {
                    await i.editReply({ embeds: [embeds.warn("Already active", "Fortress mode is already enabled.")], components: [] }).catch(() => { });
                    return;
                }
                await i.editReply({ embeds: [embeds.success("Fortress enabled", "All channels are locked to staff only.")], components: [] }).catch(() => { });
            });
            client.components.set("wings:fortress:enable:cancel", async (i) => {
                await i.update({ embeds: [embeds.info("Cancelled", "Fortress mode was not enabled.")], components: [] }).catch(() => { });
            });
            return interaction.editReply({
                embeds: [embeds.warn("Enable fortress mode?", "This will lock every text channel so only staff can send messages. Members will still be able to read. Continue?")],
                components: [
                    confirmationRow({
                        acceptCustomId: "wings:fortress:enable:confirm",
                        cancelCustomId: "wings:fortress:enable:cancel",
                        acceptLabel: "Enable lockdown",
                        danger: true,
                    }),
                ],
            });
        }
    },
};
