import {
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ComponentType,
  EmbedBuilder,
} from "discord.js";
import { embeds } from "../../design/embeds.js";
import { isStaff } from "../../core/services.js";
import type { WingsClient } from "../../core/client.js";
import type { ChatInputCommandInteraction } from "discord.js";
import type { GuildConfig } from "@prisma/client";

const CATEGORIES = [
  { value: "logging", label: "Logging", description: "Log & mod-log channels" },
  { value: "moderation", label: "Moderation", description: "Prefix, case behavior" },
  { value: "welcome", label: "Welcome & Goodbye", description: "Join/leave channels" },
  { value: "tickets", label: "Tickets", description: "Ticket system" },
  { value: "automod", label: "Automod", description: "Filters & thresholds" },
  { value: "general", label: "General", description: "Overview & roles" },
];

function mainEmbed(config: GuildConfig) {
  return embeds.info("WINGS · Server Settings", "Select a category to configure.", [
    { name: "Prefix", value: config.prefix, inline: true },
    { name: "Staff roles", value: `${config.staffRoleIds.length}`, inline: true },
    { name: "Mod roles", value: `${config.moderatorRoleIds.length}`, inline: true },
  ]);
}

function mainRow() {
  const menu = new StringSelectMenuBuilder().setCustomId("wings:settings:menu").setPlaceholder("Choose a category").addOptions(CATEGORIES);
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

function backRow() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("wings:settings:back").setLabel("Back").setStyle(ButtonStyle.Secondary),
  );
}

function channelRow(customId: string, placeholder: string) {
  const menu = new ChannelSelectMenuBuilder().setCustomId(customId).setPlaceholder(placeholder);
  return new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(menu);
}

export default {
  data: new SlashCommandBuilder().setName("settings").setDescription("Configure WINGS for this server"),
  category: "Config",
  async execute(interaction: ChatInputCommandInteraction) {
    const client = interaction.client as WingsClient;
    const member = interaction.member as any;
    const config = await client.services.settings.get(interaction.guildId!).catch(() => null);
    if (!isStaff(member, config)) {
      return interaction.reply({ embeds: [embeds.error("Missing permission", "Only staff can configure WINGS.")], ephemeral: true });
    }
    await interaction.deferReply({ ephemeral: true });
    const cfg = await client.services.settings.get(interaction.guildId!);

    client.components.set("wings:settings:menu", async (i: any) => {
      const category = i.values[0];
      await renderCategory(i, category, await client.services.settings.get(i.guildId!));
    });
    client.components.set("wings:settings:back", async (i: any) => {
      await i.update({ embeds: [mainEmbed(await client.services.settings.get(i.guildId!))], components: [mainRow()] });
    });
    client.components.set("wings:settings:channel:logChannelId", async (i: any) => {
      const id = i.values[0];
      await client.services.settings.patch(i.guildId!, { logChannelId: id });
      await renderCategory(i, "logging", await client.services.settings.get(i.guildId!));
    });
    client.components.set("wings:settings:channel:modLogChannelId", async (i: any) => {
      const id = i.values[0];
      await client.services.settings.patch(i.guildId!, { modLogChannelId: id });
      await renderCategory(i, "logging", await client.services.settings.get(i.guildId!));
    });
    client.components.set("wings:settings:channel:welcomeChannelId", async (i: any) => {
      const id = i.values[0];
      await client.services.settings.patch(i.guildId!, { welcomeChannelId: id });
      await renderCategory(i, "welcome", await client.services.settings.get(i.guildId!));
    });
    client.components.set("wings:settings:channel:goodbyeChannelId", async (i: any) => {
      const id = i.values[0];
      await client.services.settings.patch(i.guildId!, { goodbyeChannelId: id });
      await renderCategory(i, "welcome", await client.services.settings.get(i.guildId!));
    });
    client.components.set("wings:settings:prefix", async (i: any) => {
      const modal = new ModalBuilder().setCustomId("wings:settings:prefix:modal").setTitle("Set command prefix");
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("prefix").setLabel("Prefix").setStyle(TextInputStyle.Short).setMaxLength(3).setValue(cfg.prefix),
        ),
      );
      await i.showModal(modal);
    });
    client.components.set("wings:settings:prefix:modal", async (i: any) => {
      const prefix = i.fields.getTextInputValue("prefix");
      await client.services.settings.patch(i.guildId!, { prefix });
      await i.reply({ embeds: [embeds.success("Prefix updated", `Commands prefix set to \`${prefix}\`.`)], ephemeral: true });
    });

    await interaction.editReply({ embeds: [mainEmbed(cfg)], components: [mainRow()] });
  },
};

async function renderCategory(i: any, category: string, cfg: GuildConfig) {
  if (category === "logging") {
    const embed = embeds.info("Settings · Logging", "Choose where WINGS sends logs.", [
      { name: "Log channel", value: cfg.logChannelId ? `<#${cfg.logChannelId}>` : "Not set", inline: true },
      { name: "Mod-log channel", value: cfg.modLogChannelId ? `<#${cfg.modLogChannelId}>` : "Not set", inline: true },
    ]);
    await i.update({
      embeds: [embed],
      components: [channelRow("wings:settings:channel:logChannelId", "Log channel"), channelRow("wings:settings:channel:modLogChannelId", "Mod-log channel"), backRow()],
    });
    return;
  }
  if (category === "welcome") {
    const embed = embeds.info("Settings · Welcome & Goodbye", "Choose where join/leave messages are sent.", [
      { name: "Welcome channel", value: cfg.welcomeChannelId ? `<#${cfg.welcomeChannelId}>` : "Not set", inline: true },
      { name: "Goodbye channel", value: cfg.goodbyeChannelId ? `<#${cfg.goodbyeChannelId}>` : "Not set", inline: true },
    ]);
    await i.update({
      embeds: [embed],
      components: [channelRow("wings:settings:channel:welcomeChannelId", "Welcome channel"), channelRow("wings:settings:channel:goodbyeChannelId", "Goodbye channel"), backRow()],
    });
    return;
  }
  if (category === "moderation") {
    const embed = embeds.info("Settings · Moderation", "Adjust moderation behavior.", [
      { name: "Prefix", value: cfg.prefix, inline: true },
    ]);
    const prefixBtn = new ButtonBuilder().setCustomId("wings:settings:prefix").setLabel("Edit prefix").setStyle(ButtonStyle.Primary);
    await i.update({ embeds: [embed], components: [new ActionRowBuilder<ButtonBuilder>().addComponents(prefixBtn), backRow()] });
    return;
  }
  if (category === "tickets") {
    await i.update({ embeds: [embeds.info("Settings · Tickets", "The ticket system can be configured here once enabled.")], components: [backRow()] });
    return;
  }
  if (category === "automod") {
    const automod = cfg.automod as Record<string, unknown>;
    await i.update({ embeds: [embeds.info("Settings · Automod", "Current automod configuration.", [{ name: "Config", value: `\`\`\`json\n${JSON.stringify(automod, null, 2)}\n\`\`\`` }])], components: [backRow()] });
    return;
  }
  await i.update({ embeds: [mainEmbed(cfg)], components: [mainRow()] });
}
