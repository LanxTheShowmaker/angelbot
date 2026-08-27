import type { ChatInputCommandInteraction, ModalSubmitInteraction } from "discord.js";
import { ComponentType, EmbedBuilder } from "discord.js";
import { embeds, confirmationRow } from "../../design/embeds.js";
import { isModerator } from "../../core/services.js";
import type { WingsClient } from "../../core/client.js";

export async function requireModerator(interaction: ChatInputCommandInteraction): Promise<boolean> {
  const client = interaction.client as WingsClient;
  const member = interaction.member as any;
  const config = await client.services.settings.get(interaction.guildId!).catch(() => null);
  if (!isModerator(member, config)) {
    await interaction.reply({ embeds: [embeds.error("Missing permission", "You need moderator permissions or a moderator role to use this.")], ephemeral: true });
    return false;
  }
  return true;
}

export async function defer(interaction: ChatInputCommandInteraction, ephemeral = true) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral });
}

export async function confirmDestructive(interaction: ChatInputCommandInteraction, label: string): Promise<boolean> {
  const acceptId = `wings:confirm:${interaction.id}:yes`;
  const cancelId = `wings:confirm:${interaction.id}:no`;
  await interaction.editReply({
    embeds: [embeds.warn("Confirm action", label)],
    components: [confirmationRow({ acceptCustomId: acceptId, cancelCustomId: cancelId, danger: true })],
  });
  const response = await interaction.fetchReply();
  return new Promise<boolean>((resolve) => {
    const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000, max: 1 });
    collector.on("collect", async (i) => {
      if (i.customId === acceptId) {
        await i.update({ components: [] }).catch(() => {});
        resolve(true);
      } else {
        await i.update({ embeds: [embeds.info("Cancelled", "Action was not performed.")], components: [] }).catch(() => {});
        resolve(false);
      }
    });
    collector.on("end", (collected) => {
      if (collected.size === 0) resolve(false);
    });
  });
}

export function parseDuration(input: string): bigint | null {
  const match = input.trim().match(/^(\d+)\s*(s|m|h|d|w)$/i);
  if (!match) return null;
  const value = BigInt(match[1]!);
  const unit = match[2]!.toLowerCase();
  const mult: Record<string, bigint> = { s: 1n, m: 60n, h: 3600n, d: 86400n, w: 604800n };
  return value * mult[unit]! * 1000n;
}

export function durationLabel(ms?: bigint): string | undefined {
  if (!ms) return undefined;
  const seconds = Number(ms) / 1000;
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}
