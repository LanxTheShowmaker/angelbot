import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, time } from "discord.js";
import { Theme, Brand } from "./theme.js";
const COLORS = {
    success: Theme.success,
    error: Theme.danger,
    warn: Theme.warn,
    info: Theme.info,
    moderation: Theme.accent,
    neutral: Theme.accent,
};
function build(kind, opts) {
    const embed = new EmbedBuilder()
        .setColor(COLORS[kind])
        .setTitle(opts.title)
        .setFooter({ text: Brand.footer })
        .setTimestamp();
    if (opts.description)
        embed.setDescription(opts.description);
    if (opts.fields?.length)
        embed.addFields(opts.fields);
    if (opts.thumbnailUrl)
        embed.setThumbnail(opts.thumbnailUrl);
    if (opts.imageUrl)
        embed.setImage(opts.imageUrl);
    return embed;
}
export const embeds = {
    success: (title, description, fields) => build("success", { title, description, fields }),
    error: (title, description, fields) => build("error", { title, description, fields }),
    warn: (title, description, fields) => build("warn", { title, description, fields }),
    info: (title, description, fields) => build("info", { title, description, fields }),
    moderation: (title, description, fields) => build("moderation", { title, description, fields }),
    neutral: (title, description, fields) => build("neutral", { title, description, fields }),
};
export function confirmationRow(opts) {
    const accept = new ButtonBuilder()
        .setCustomId(opts.acceptCustomId)
        .setLabel(opts.acceptLabel ?? "Confirm")
        .setStyle(opts.danger ? ButtonStyle.Danger : ButtonStyle.Primary);
    const cancel = new ButtonBuilder()
        .setCustomId(opts.cancelCustomId)
        .setLabel(opts.cancelLabel ?? "Cancel")
        .setStyle(ButtonStyle.Secondary);
    return new ActionRowBuilder().addComponents(accept, cancel);
}
export function categorySelect(customId, placeholder, options) {
    const menu = new StringSelectMenuBuilder().setCustomId(customId).setPlaceholder(placeholder).addOptions(options);
    return new ActionRowBuilder().addComponents(menu);
}
export function formatCaseLine(c) {
    return `#${c.caseNumber} · ${c.action} · ${c.reason ?? "No reason"} · ${time(c.createdAt, "R")}`;
}
//# sourceMappingURL=embeds.js.map