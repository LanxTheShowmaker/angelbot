import { GuildMember, Guild, User } from "discord.js";
import { PrismaClient, type Case } from "@prisma/client";
import { CasesService, type CaseAction } from "./cases.js";
import { LoggingService } from "./logging.js";
import { userTag } from "../design/format.js";
import { logger } from "../core/logger.js";

export class ModerationService {
  constructor(
    private prisma: PrismaClient,
    private cases: CasesService,
    private logging: LoggingService,
  ) {}

  private async record(
    guild: Guild,
    target: GuildMember | User,
    moderator: User,
    action: CaseAction,
    reason?: string,
    duration?: { label: string; ms?: bigint },
  ): Promise<Case> {
    const created = await this.cases.create({
      guildId: guild.id,
      targetId: target.id,
      targetTag: userTag(target instanceof GuildMember ? target.user : target),
      moderatorId: moderator.id,
      moderatorTag: userTag(moderator),
      action,
      reason,
      duration: duration?.label,
      durationMs: duration?.ms,
    });
    await this.logging.logCase(created).catch((e) => logger.error("moderation", "case log failed", e));
    return created;
  }

  async ban(guild: Guild, target: User, moderator: User, reason?: string, days = 0): Promise<Case> {
    const c = await this.record(guild, target, moderator, "BAN", reason);
    await guild.bans
      .create(target.id, { reason: `${reason ?? "No reason"} · Case #${c.caseNumber}`, deleteMessageSeconds: days * 86400 })
      .catch((e) => logger.error("moderation", "ban failed", e));
    return c;
  }

  async unban(guild: Guild, userId: string, userTagStr: string, moderator: User, reason?: string): Promise<Case> {
    const c = await this.cases.create({ guildId: guild.id, targetId: userId, targetTag: userTagStr, moderatorId: moderator.id, moderatorTag: userTag(moderator), action: "UNBAN", reason });
    await guild.bans.remove(userId, reason).catch((e) => logger.error("moderation", "unban failed", e));
    await this.logging.logCase(c).catch(() => {});
    return c;
  }

  async kick(guild: Guild, target: GuildMember, moderator: User, reason?: string): Promise<Case> {
    const c = await this.record(guild, target, moderator, "KICK", reason);
    await target.kick(reason).catch((e) => logger.error("moderation", "kick failed", e));
    return c;
  }

  async timeout(target: GuildMember, moderator: User, ms: bigint, reason?: string): Promise<Case> {
    const c = await this.record(target.guild, target, moderator, "TIMEOUT", reason, { label: timeLabel(ms), ms });
    await target.disableCommunicationUntil(new Date(Date.now() + Number(ms))).catch((e) => logger.error("moderation", "timeout failed", e));
    return c;
  }

  async warn(guild: Guild, target: GuildMember, moderator: User, reason?: string): Promise<Case> {
    return this.record(guild, target, moderator, "WARN", reason);
  }

  async note(guild: Guild, target: GuildMember, moderator: User, reason?: string): Promise<Case> {
    return this.record(guild, target, moderator, "NOTE", reason);
  }
}

function timeLabel(ms: bigint): string {
  const seconds = Number(ms) / 1000;
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}
