import type { Client } from "discord.js";
import { ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder, time } from "discord.js";
import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { logger } from "../core/logger.js";
import { embeds } from "../design/embeds.js";
import type { WingsClient } from "../core/client.js";

interface PollOption {
  label: string;
  votes: number;
}

export class UtilityService {
  private pollVoters = new Map<string, Set<string>>();
  private interval: ReturnType<typeof setInterval>;

  constructor(
    private prisma: PrismaClient,
    private client: Client,
  ) {
    this.interval = setInterval(() => {
      this.tickReminders().catch((e) => logger.error("utility", "reminder tick failed", e));
    }, 15000);

    const wings = this.client as WingsClient;
    wings.components.set("wings:poll:vote", async (interaction: any) => {
      await this.handlePollVote(interaction).catch((e) =>
        logger.error("utility", "poll vote failed", e),
      );
    });

    process.once("beforeExit", () => clearInterval(this.interval));
  }

  private async tickReminders() {
    let due: { id: string; guildId: string; channelId: string; userId: string; message: string }[] = [];
    try {
      due = await this.prisma.reminder.findMany({
        where: { remindAt: { lte: new Date() } },
        select: { id: true, guildId: true, channelId: true, userId: true, message: true },
      });
    } catch (e) {
      logger.error("utility", "failed to query reminders", e);
      return;
    }

    for (const r of due) {
      try {
        const guild = this.client.guilds.cache.get(r.guildId);
        if (!guild) {
          await this.prisma.reminder.delete({ where: { id: r.id } }).catch(() => {});
          continue;
        }
        const channel = guild.channels.cache.get(r.channelId);
        if (!channel || !("send" in channel)) {
          await this.prisma.reminder.delete({ where: { id: r.id } }).catch(() => {});
          continue;
        }
        await channel.send({
          embeds: [
            embeds.info("Reminder", r.message, [
              { name: "Set by", value: `<@${r.userId}>`, inline: true },
            ]),
          ],
        });
        await this.prisma.reminder.delete({ where: { id: r.id } });
      } catch (e) {
        logger.error("utility", "reminder send failed", { id: r.id, error: e });
      }
    }
  }

  private buildPollEmbed(question: string, options: PollOption[]): EmbedBuilder {
    const fields = options.map((o, i) => ({
      name: `${i + 1}. ${o.label}`.slice(0, 256),
      value: `${o.votes} vote${o.votes === 1 ? "" : "s"}`,
      inline: true,
    }));
    return embeds.neutral("Poll", question, fields);
  }

  private async handlePollVote(interaction: any) {
    const parts = interaction.customId.split(":");
    const messageId = parts[3];
    const indexStr = parts[4];
    if (!messageId || indexStr === undefined) {
      await interaction.reply({ embeds: [embeds.error("Invalid vote", "This poll is no longer valid.")], ephemeral: true });
      return;
    }
    const index = Number(indexStr);
    const userId = interaction.user.id;

    const poll = await this.prisma.poll.findUnique({ where: { messageId } }).catch(() => null);
    if (!poll) {
      await interaction.reply({ embeds: [embeds.error("Poll ended", "This poll no longer exists.")], ephemeral: true });
      return;
    }

    const options = (poll.options as unknown as PollOption[]) ?? [];
    if (!Number.isInteger(index) || index < 0 || index >= options.length) {
      await interaction.reply({ embeds: [embeds.error("Invalid option", "That option does not exist.")], ephemeral: true });
      return;
    }

    let voters = this.pollVoters.get(messageId);
    if (!voters) {
      voters = new Set<string>();
      this.pollVoters.set(messageId, voters);
    }
    if (voters.has(userId)) {
      await interaction.reply({ embeds: [embeds.warn("Already voted", "You have already voted in this poll.")], ephemeral: true });
      return;
    }
    voters.add(userId);

    options[index] = { ...options[index]!, votes: options[index]!.votes + 1 };
    await this.prisma.poll.update({ where: { messageId }, data: { options: options as unknown as Prisma.InputJsonValue } }).catch(() => {});

    const message = interaction.message;
    if (message?.editable) {
      await message.edit({ embeds: [this.buildPollEmbed(poll.question, options)] }).catch(() => {});
    }

    await interaction.reply({ embeds: [embeds.success("Vote recorded", `You voted for **${options[index]!.label}**.`)], ephemeral: true });
  }

  public buildPollButtons(messageId: string, options: PollOption[]): ActionRowBuilder<ButtonBuilder>[] {
    const wrap = (start: number, end: number) => {
      const row = new ActionRowBuilder<ButtonBuilder>();
      options.slice(start, end).forEach((o, i) => {
        const idx = start + i;
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`wings:poll:vote:${messageId}:${idx}`)
            .setLabel(`${idx + 1}. ${o.label}`.slice(0, 80))
            .setStyle(ButtonStyle.Secondary),
        );
      });
      return row;
    };
    const rows = [wrap(0, 5)];
    if (options.length > 5) rows.push(wrap(5, 10));
    return rows;
  }

  public makeAvatarButton(url: string): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setLabel("Open avatar").setURL(url).setStyle(ButtonStyle.Link),
    );
  }

  public async createPoll(data: {
    guildId: string;
    channelId: string;
    messageId: string;
    authorId: string;
    question: string;
    options: PollOption[];
  }): Promise<void> {
    await this.prisma.poll.create({ data: { ...data, options: data.options as unknown as Prisma.InputJsonValue } });
  }

  public async createReminder(data: {
    guildId: string;
    channelId: string;
    userId: string;
    message: string;
    remindAt: Date;
  }): Promise<void> {
    await this.prisma.reminder.create({ data });
  }
}
