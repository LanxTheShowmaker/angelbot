import { GuildMember } from "discord.js";
import { userTag } from "../design/format.js";
import { logger } from "../core/logger.js";
export class ModerationService {
    prisma;
    cases;
    logging;
    constructor(prisma, cases, logging) {
        this.prisma = prisma;
        this.cases = cases;
        this.logging = logging;
    }
    async record(guild, target, moderator, action, reason, duration) {
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
    async ban(guild, target, moderator, reason, days = 0) {
        const c = await this.record(guild, target, moderator, "BAN", reason);
        await guild.bans
            .create(target.id, { reason: `${reason ?? "No reason"} · Case #${c.caseNumber}`, deleteMessageSeconds: days * 86400 })
            .catch((e) => logger.error("moderation", "ban failed", e));
        return c;
    }
    async unban(guild, userId, userTagStr, moderator, reason) {
        const c = await this.cases.create({ guildId: guild.id, targetId: userId, targetTag: userTagStr, moderatorId: moderator.id, moderatorTag: userTag(moderator), action: "UNBAN", reason });
        await guild.bans.remove(userId, reason).catch((e) => logger.error("moderation", "unban failed", e));
        await this.logging.logCase(c).catch(() => { });
        return c;
    }
    async kick(guild, target, moderator, reason) {
        const c = await this.record(guild, target, moderator, "KICK", reason);
        await target.kick(reason).catch((e) => logger.error("moderation", "kick failed", e));
        return c;
    }
    async timeout(target, moderator, ms, reason) {
        const c = await this.record(target.guild, target, moderator, "TIMEOUT", reason, { label: timeLabel(ms), ms });
        await target.disableCommunicationUntil(new Date(Date.now() + Number(ms))).catch((e) => logger.error("moderation", "timeout failed", e));
        return c;
    }
    async warn(guild, target, moderator, reason) {
        return this.record(guild, target, moderator, "WARN", reason);
    }
    async note(guild, target, moderator, reason) {
        return this.record(guild, target, moderator, "NOTE", reason);
    }
}
function timeLabel(ms) {
    const seconds = Number(ms) / 1000;
    if (seconds < 60)
        return `${seconds}s`;
    if (seconds < 3600)
        return `${Math.round(seconds / 60)}m`;
    if (seconds < 86400)
        return `${Math.round(seconds / 3600)}h`;
    return `${Math.round(seconds / 86400)}d`;
}
//# sourceMappingURL=moderation.js.map