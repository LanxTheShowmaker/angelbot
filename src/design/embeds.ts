import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, time } from "discord.js";
import { Theme, Brand, type StatusKind } from "./theme.js";

const COLORS: Record<StatusKind, number> = {
  success: Theme.success,
  error: Theme.danger,
  warn: Theme.warn,
  info: Theme.info,
  moderation: Theme.accent,
  neutral: Theme.accent,
};

export interface EmbedOptions {
  title: string;
  description?: string;
  fields?: { name: string; value: string; inline?: boolean }[];
  thumbnailUrl?: string;
  imageUrl?: string;
  kind?: StatusKind;
}

function build(kind: StatusKind, opts: EmbedOptions): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(COLORS[kind])
    .setTitle(opts.title)
    .setFooter({ text: Brand.footer })
    .setTimestamp();
  if (opts.description) embed.setDescription(opts.description);
  if (opts.fields?.length) embed.addFields(opts.fields);
  if (opts.thumbnailUrl) embed.setThumbnail(opts.thumbnailUrl);
  if (opts.imageUrl) embed.setImage(opts.imageUrl);
  return embed;
}

export const embeds = {
  success: (title: string, description?: string, fields?: EmbedOptions["fields"]) =>
    build("success", { title, description, fields }),
  error: (title: string, description?: string, fields?: EmbedOptions["fields"]) =>
    build("error", { title, description, fields }),
  warn: (title: string, description?: string, fields?: EmbedOptions["fields"]) =>
    build("warn", { title, description, fields }),
  info: (title: string, description?: string, fields?: EmbedOptions["fields"]) =>
    build("info", { title, description, fields }),
  moderation: (title: string, description?: string, fields?: EmbedOptions["fields"]) =>
    build("moderation", { title, description, fields }),
  neutral: (title: string, description?: string, fields?: EmbedOptions["fields"]) =>
    build("neutral", { title, description, fields }),
};

export function confirmationRow(opts: {
  acceptCustomId: string;
  cancelCustomId: string;
  acceptLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}): ActionRowBuilder<ButtonBuilder> {
  const accept = new ButtonBuilder()
    .setCustomId(opts.acceptCustomId)
    .setLabel(opts.acceptLabel ?? "Confirm")
    .setStyle(opts.danger ? ButtonStyle.Danger : ButtonStyle.Primary);
  const cancel = new ButtonBuilder()
    .setCustomId(opts.cancelCustomId)
    .setLabel(opts.cancelLabel ?? "Cancel")
    .setStyle(ButtonStyle.Secondary);
  return new ActionRowBuilder<ButtonBuilder>().addComponents(accept, cancel);
}

export function categorySelect(customId: string, placeholder: string, options: { label: string; value: string; description?: string }[]): ActionRowBuilder<StringSelectMenuBuilder> {
  const menu = new StringSelectMenuBuilder().setCustomId(customId).setPlaceholder(placeholder).addOptions(options);
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

export function formatCaseLine(c: { caseNumber: number; action: string; reason: string | null; createdAt: Date }): string {
  return `#${c.caseNumber} · ${c.action} · ${c.reason ?? "No reason"} · ${time(c.createdAt, "R")}`;
}
