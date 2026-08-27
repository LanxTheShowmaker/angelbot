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
    raidWindowMs: 30000,
    newAccountFilter: true,
    newAccountMaxAgeDays: 7,
    emojiSpamThreshold: 10,
    zalgoFilter: true,
    scamUrlFilter: true,
    clusterSpam: true,
    clusterSpamThreshold: 3,
    clusterSpamWindowMs: 60000,
    autoLockdown: true,
};

const SCAM_PATTERNS = [
    /discord\.gift/i,
    /free\s*(discord\s*)?nitro/i,
    /steam.*gift\s*card/i,
    /you\s*(have\s*)?won\s*(a|an)\s*\w+/i,
    /claim\s*(your\s*)?(reward|prize|gift)/i,
    /(free|cheap)\s*(v ?bucks|robux|game\s?pass)/i,
    /verify\s*(your\s*)?account\s*(now|here)/i,
];

export class AutomodService {
    prisma;
    client;
    settings;
    logging;
    spamMap = new Map();
    offenseMap = new Map();
    joinTimes = new Map();
    clusterMap = new Map();
    raidCooldown = new Map();
    constructor(prisma, client, settings, logging) {
        this.prisma = prisma;
        this.client = client;
        this.settings = settings;
        this.logging = logging;
    }
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
            newAccountFilter: bool("newAccountFilter", DEFAULTS.newAccountFilter),
            newAccountMaxAgeDays: num("newAccountMaxAgeDays", DEFAULTS.newAccountMaxAgeDays),
            emojiSpamThreshold: num("emojiSpamThreshold", DEFAULTS.emojiSpamThreshold),
            zalgoFilter: bool("zalgoFilter", DEFAULTS.zalgoFilter),
            scamUrlFilter: bool("scamUrlFilter", DEFAULTS.scamUrlFilter),
            clusterSpam: bool("clusterSpam", DEFAULTS.clusterSpam),
            clusterSpamThreshold: num("clusterSpamThreshold", DEFAULTS.clusterSpamThreshold),
            clusterSpamWindowMs: num("clusterSpamWindowMs", DEFAULTS.clusterSpamWindowMs),
            autoLockdown: bool("autoLockdown", DEFAULTS.autoLockdown),
        };
    }
    isNewAccount(member, am) {
        const ageMs = Date.now() - (member.user.createdAt?.getTime?.() ?? 0);
        return ageMs < am.newAccountMaxAgeDays * 86_400_000;
    }
    isZalgo(content) {
        const combining = (content.match(/\p{M}/gu) ?? []).length;
        return combining > 15;
    }
    countEmojis(content) {
        const custom = (content.match(/<a?:\w+:\d+>/g) ?? []).length;
        const unicode = (content.match(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu) ?? []).length;
        return custom + unicode;
    }
    isScamUrl(content) {
        return SCAM_PATTERNS.some((re) => re.test(content));
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
        const linkRe = /https?:\/\//i;
        if (am.inviteFilter && inviteRe.test(content)) {
            await this.punish(message, "Discord invite links are not allowed.", am);
            return;
        }
        if (am.linkFilter && linkRe.test(content) && !(am.inviteFilter && inviteRe.test(content))) {
            await this.punish(message, "Links are not allowed in this server.", am);
            return;
        }
        if (am.newAccountFilter && this.isNewAccount(member, am) && linkRe.test(content)) {
            await this.punish(message, "New accounts cannot post links or invites yet. Please try again later.", am);
            return;
        }
        if (am.zalgoFilter && this.isZalgo(content)) {
            await this.punish(message, "Excessive text corruption (zalgo) is not allowed.", am);
            return;
        }
        if (this.countEmojis(content) > am.emojiSpamThreshold) {
            await this.punish(message, `Too many emojis (${this.countEmojis(content)} > ${am.emojiSpamThreshold}).`, am);
            return;
        }
        if (am.scamUrlFilter && this.isScamUrl(content)) {
            await this.punish(message, "That message looked like a scam link and was removed.", am, 2);
            return;
        }
        if (am.clusterSpam && (await this.trackCluster(message, am)))
            return;
        await this.trackSpam(message, am);
    }
    async trackCluster(message, am) {
        const key = message.content.toLowerCase().replace(/\s+/g, " ").trim();
        if (key.length < 12)
            return false;
        const now = Date.now();
        let entry = this.clusterMap.get(key);
        if (!entry || now - entry.first > am.clusterSpamWindowMs)
            entry = { ids: new Set(), first: now };
        entry.ids.add(message.author.id);
        this.clusterMap.set(key, entry);
        if (entry.ids.size >= am.clusterSpamThreshold) {
            this.clusterMap.delete(key);
            await this.punish(message, `Duplicate spam detected across ${entry.ids.size} accounts.`, am);
            return true;
        }
        return false;
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
    async punish(message, reason, _am, weight = 1) {
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
        await this.trackOffense(member.guild, member, reason, weight);
    }
    async trackOffense(guild, member, reason, weight = 1) {
        const key = `${guild.id}:${member.id}`;
        const now = Date.now();
        const existing = this.offenseMap.get(key);
        if (!existing || now - existing.firstTs > OFFENSE_WINDOW_MS) {
            this.offenseMap.set(key, { count: weight, firstTs: now });
            return;
        }
        existing.count += weight;
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
        const now = Date.now();
        const last = this.raidCooldown.get(guild.id) ?? 0;
        if (now - last >= 60000) {
            this.raidCooldown.set(guild.id, now);
            try {
                await channel.send({
                    embeds: [
                        embeds.warn("Possible raid detected", `Detected **${count}** joins within **${Math.round(am.raidWindowMs / 1000)}s** (threshold ${am.raidJoinThreshold}). Review recent members; fortress mode can be enabled with \`/fortress enable\`.`),
                    ],
                });
            }
            catch (e) {
                logger.error("automod", "raid alert failed", e);
            }
        }
        if (am.autoLockdown) {
            await this.client.services.fortress?.autoEnable(guild, config).catch((e) => logger.error("automod", "auto fortress failed", e));
        }
    }
}
