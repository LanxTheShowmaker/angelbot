import { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, } from "discord.js";
import { embeds } from "../../design/embeds.js";
import { isStaff } from "../../core/services.js";
import { logger } from "../../core/logger.js";
const NUMERIC_KEYS = ["maxMentions", "spamThreshold", "spamWindowMs", "raidJoinThreshold", "raidWindowMs"];
const NUMERIC_LABELS = {
    maxMentions: "Max mentions",
    spamThreshold: "Spam threshold",
    spamWindowMs: "Spam window (ms)",
    raidJoinThreshold: "Raid join threshold",
    raidWindowMs: "Raid window (ms)",
};
const DEFAULTS = {
    maxMentions: 5,
    spamThreshold: 5,
    spamWindowMs: 5000,
    raidJoinThreshold: 10,
    raidWindowMs: 30000,
};
function num(a, k) {
    return typeof a[k] === "number" ? a[k] : DEFAULTS[k];
}
function bool(a, k) {
    return typeof a[k] === "boolean" ? a[k] : k === "inviteFilter";
}
function buildEmbed(automod) {
    const a = automod ?? {};
    return embeds.info("Automod settings", "Use the menu below to adjust filters and thresholds.", [
        { name: "Invite filter", value: bool(a, "inviteFilter") ? "On" : "Off", inline: true },
        { name: "Link filter", value: bool(a, "linkFilter") ? "On" : "Off", inline: true },
        { name: "Max mentions", value: `${num(a, "maxMentions")}`, inline: true },
        { name: "Spam threshold", value: `${num(a, "spamThreshold")}`, inline: true },
        { name: "Spam window (ms)", value: `${num(a, "spamWindowMs")}`, inline: true },
        { name: "Raid join threshold", value: `${num(a, "raidJoinThreshold")}`, inline: true },
        { name: "Raid window (ms)", value: `${num(a, "raidWindowMs")}`, inline: true },
    ]);
}
function menuRow() {
    const menu = new StringSelectMenuBuilder()
        .setCustomId("wings:automod:menu")
        .setPlaceholder("Select an automod setting to change")
        .addOptions([
        { label: "Toggle invite filter", value: "inviteFilter", description: "Block Discord invite links" },
        { label: "Toggle link filter", value: "linkFilter", description: "Block all http(s) links" },
        { label: "Set max mentions", value: "maxMentions", description: "Mention spam threshold" },
        { label: "Set spam threshold", value: "spamThreshold", description: "Messages in window before spam" },
        { label: "Set spam window (ms)", value: "spamWindowMs", description: "Spam detection window" },
        { label: "Set raid join threshold", value: "raidJoinThreshold", description: "Joins counted as a raid" },
        { label: "Set raid window (ms)", value: "raidWindowMs", description: "Raid detection window" },
    ]);
    return new ActionRowBuilder().addComponents(menu);
}
export default {
    data: new SlashCommandBuilder().setName("automod").setDescription("Configure the automoderation filters and thresholds"),
    category: "Config",
    async execute(interaction) {
        const client = interaction.client;
        const member = interaction.member;
        const config = await client.services.settings.get(interaction.guildId).catch(() => null);
        if (!isStaff(member, config)) {
            return interaction.reply({ embeds: [embeds.error("Missing permission", "Only staff can configure automod.")], ephemeral: true });
        }
        await interaction.deferReply({ ephemeral: true });
        const cfg = await client.services.settings.get(interaction.guildId).catch(() => null);
        if (!cfg) {
            await interaction.editReply({ embeds: [embeds.error("Could not load settings", "Try again later.")] }).catch(() => { });
            return;
        }
        const persisted = (g) => g.automod ?? {};
        client.components.set("wings:automod:menu", async (i) => {
            const action = i.values?.[0];
            if (!action) {
                await i.update({ components: [menuRow()] }).catch(() => { });
                return;
            }
            try {
                const current = await client.services.settings.get(i.guildId);
                const a = persisted(current);
                if (action === "inviteFilter" || action === "linkFilter") {
                    const next = { ...a, [action]: !bool(a, action) };
                    await client.services.settings.patch(i.guildId, { automod: next }).catch((e) => logger.error("automod", "patch failed", e));
                    const updated = await client.services.settings.get(i.guildId);
                    await i.update({ embeds: [buildEmbed(updated.automod)], components: [menuRow()] }).catch(() => { });
                    return;
                }
                if (NUMERIC_KEYS.includes(action)) {
                    const key = action;
                    const modal = new ModalBuilder().setCustomId(`wings:automod:modal:${key}`).setTitle(NUMERIC_LABELS[key]);
                    modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder()
                        .setCustomId("value")
                        .setLabel(NUMERIC_LABELS[key])
                        .setStyle(TextInputStyle.Short)
                        .setValue(String(num(a, key)))
                        .setRequired(true)));
                    await i.showModal(modal).catch(() => { });
                    return;
                }
                await i.update({ components: [menuRow()] }).catch(() => { });
            }
            catch (e) {
                logger.error("automod", "menu handler failed", e);
                await i.update({ embeds: [embeds.error("Something went wrong", "That change could not be applied.")], components: [menuRow()] }).catch(() => { });
            }
        });
        client.components.set("wings:automod:modal", async (i) => {
            try {
                const parts = i.customId.split(":");
                const key = parts[3];
                if (!key || !NUMERIC_KEYS.includes(key)) {
                    await i.update({ components: [menuRow()] }).catch(() => { });
                    return;
                }
                const raw = i.fields.getTextInputValue("value");
                const parsed = Number.parseInt(raw, 10);
                if (!Number.isFinite(parsed) || parsed <= 0) {
                    await i.reply({ embeds: [embeds.error("Invalid value", "Enter a positive number.")], ephemeral: true }).catch(() => { });
                    return;
                }
                const current = await client.services.settings.get(i.guildId);
                const a = persisted(current);
                const next = { ...a, [key]: Math.min(parsed, 1_000_000) };
                await client.services.settings.patch(i.guildId, { automod: next }).catch((e) => logger.error("automod", "patch failed", e));
                const updated = await client.services.settings.get(i.guildId);
                await i.update({ embeds: [buildEmbed(updated.automod)], components: [menuRow()] }).catch(() => { });
            }
            catch (e) {
                logger.error("automod", "modal handler failed", e);
                await i.update({ embeds: [embeds.error("Something went wrong", "That change could not be applied.")], components: [menuRow()] }).catch(() => { });
            }
        });
        await interaction.editReply({ embeds: [buildEmbed(cfg.automod)], components: [menuRow()] }).catch(() => { });
    },
};
//# sourceMappingURL=automod.js.map