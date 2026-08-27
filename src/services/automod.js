import { isIgnored } from "../core/services.js";
import { embeds } from "../design/embeds.js";
import { logger } from "../core/logger.js";
const OFFENSE_WINDOW_MS = 600_000;
const ESCALATE_AFTER = 3;
const TIMEOUT_MS = 600_000;
const DEFAULTS = {
    enabled: true,
    maxMentions: 5,
    spamThreshold: 5,
    spamWindowMs: 5000,
    inviteFilter: true,
    linkFilter: false,
    raidJoinThreshold: 10,
    raidWindowMs: 30_000,
};
export class AutomodService {
    prisma;
    client;
    settings;
    logging;
    constructor(prisma, client, settings, logging) {
        this.prisma = prisma;
        this.client = client;
        this.settings = settings;
        this.logging = logging;
    }
    spamMap = new Map();
    offenseMap = new Map();
    joinTimes = new Map();
    resolveConfig(automod) {
        const a = automod ?? {};
        const num = (k, d) => (typeof a[k] === "number" ? a[k] : d);
        const bool = (k, d) => (typeof a[k] === "boolean" ? a[k] : d);
        return {
            enabled: bool("enabled", DEFAULTS.enabled),
            maxMentions: num("maxMentions", DEFAULTS.maxMentions),
            spamThreshold: num("spamThreshold", DEFAULTS.spamThreshold),
            spamWindowMs: num("spamWindowMs", DEFAULTS.spamWindowMs),
            inviteFilter: bool("inviteFilter", DEFAULTS.inviteFilter),
            linkFilter: bool("linkFilter", DEFAULTS.linkFilter),
            raidJoinThreshold: num("raidJoinThreshold", DEFAULTS.raidJoinThreshold),
            raidWindowMs: num("raidWindowMs", DEFAULTS.raidWindowMs),
        };
    }
    async handleMessage(message) {
        const guild = message.guild;
        const member = message.member;
        if (!guild || !member)
            return;
        const config = await this.settings.get(guild.id).catch(() => null);
        if (!config)
            return;
        const modules = config.modules ?? {};
        if (modules.automod === false)
            return;
        if (isIgnored(member, config))
            return;
        if (config.ignoredChannelIds.includes(message.channel.id))
            return;
        const am = this.resolveConfig(config.automod);
        if (!am.enabled)
            return;
        const content = message.content ?? "";
        const mentionCount = Math.max(message.mentions.users.size, message.mentions.members?.size ?? 0);
        if (mentionCount > am.maxMentions) {
            await this.punish(message, `Too many mentions (${mentionCount} > ${am.maxMentions}).`, am);
            return;
        }
        const inviteRe = /discord\.(gg|com\/invite)/i;
        if (am.inviteFilter && inviteRe.test(content)) {
            await this.punish(message, "Discord invite links are not allowed.", am);
            return;
        }
        const linkRe = /https?:\/\//i;
        if (am.linkFilter && linkRe.test(content) && !(am.inviteFilter && inviteRe.test(content))) {
            await this.punish(message, "Links are not allowed in this server.", am);
            return;
        }
        await this.trackSpam(message, am);
    }
    async trackSpam(message, am) {
        const guildId = message.guild?.id;
        if (!guildId)
            return;
        const key = `${guildId}:${message.author.id}`;
        const now = Date.now();
        const entry = this.spamMap.get(key);
        if (!entry || now - entry.firstTs > am.spamWindowMs) {
            this.spamMap.set(key, { text: message.content, count: 1, firstTs: now });
            return;
        }
        entry.count += 1;
        if (entry.count >= am.spamThreshold) {
            this.spamMap.delete(key);
            await this.punish(message, `Sending messages too quickly (spam, ${am.spamThreshold} in ${am.spamWindowMs}ms).`, am);
        }
    }
    async punish(message, reason, _am) {
        if (message.deletable) {
            await message.delete().catch((e) => logger.error("automod", "delete failed", e));
        }
        const member = message.member;
        if (!member)
            return;
        try {
            await member.send({ embeds: [embeds.warn("Automod", reason)] }).catch(() => { });
        }
        catch (e) {
            logger.error("automod", "dm failed", e);
        }
        await this.trackOffense(member.guild, member, reason);
    }
    async trackOffense(guild, member, reason) {
        const key = `${guild.id}:${member.id}`;
        const now = Date.now();
        const existing = this.offenseMap.get(key);
        if (!existing || now - existing.firstTs > OFFENSE_WINDOW_MS) {
            this.offenseMap.set(key, { count: 1, firstTs: now });
            return;
        }
        existing.count += 1;
        if (existing.count > ESCALATE_AFTER) {
            await this.escalate(guild, member, reason);
        }
    }
    async escalate(guild, member, reason) {
        try {
            if (member.moderatable && guild.members.me?.permissions.has("ModerateMembers")) {
                await member.disableCommunicationUntil(new Date(Date.now() + TIMEOUT_MS)).catch((e) => logger.error("automod", "timeout failed", e));
            }
        }
        catch (e) {
            logger.error("automod", "timeout failed", e);
        }
        try {
            const wings = this.client;
            if (wings.user) {
                await wings.services.moderation.warn(guild, member, wings.user, `Automod: ${reason}`).catch((e) => logger.error("automod", "warn case failed", e));
            }
        }
        catch (e) {
            logger.error("automod", "warn case failed", e);
        }
    }
    async handleJoin(member) {
        const guild = member.guild;
        const config = await this.settings.get(guild.id).catch(() => null);
        if (!config)
            return;
        const modules = config.modules ?? {};
        if (modules.automod === false)
            return;
        const am = this.resolveConfig(config.automod);
        const now = Date.now();
        const arr = this.joinTimes.get(guild.id) ?? [];
        arr.push(now);
        const windowStart = now - am.raidWindowMs;
        const recent = arr.filter((t) => t >= windowStart);
        this.joinTimes.set(guild.id, recent);
        if (recent.length >= am.raidJoinThreshold) {
            await this.sendRaidAlert(guild, config, recent.length, am);
        }
    }
    async sendRaidAlert(guild, config, count, am) {
        const id = config.modLogChannelId;
        if (!id)
            return;
        const channel = guild.channels.cache.get(id);
        if (!channel)
            return;
        try {
            await channel.send({
                embeds: [
                    embeds.warn("Possible raid detected", `Detected **${count}** joins within **${Math.round(am.raidWindowMs / 1000)}s** (threshold ${am.raidJoinThreshold}). Review recent members and consider enabling verification or a temporary lockdown.`),
                ],
            });
        }
        catch (e) {
            logger.error("automod", "raid alert failed", e);
        }
    }
}
//# sourceMappingURL=automod.js.map