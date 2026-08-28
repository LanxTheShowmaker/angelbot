import { isIgnored } from "../core/services.js";
import { embeds } from "../design/embeds.js";
import { logger } from "../core/logger.js";
import { AutomodEngine } from "../automod/engine.js";

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
    // New modular defaults (extended)
    confidenceThreshold: 0.65,
    detectors: {},
    escalation: null,
    notifyUser: true,
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
    engine;
    // Keep legacy maps for compat (not used by engine but kept to avoid breaking external refs)
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
        this.engine = new AutomodEngine(client, settings, logging, prisma);
    }
    resolveConfig(automod) {
        // Delegate to engine for unified defaults
        return this.engine.resolveConfig(automod);
    }
    // Preserve legacy helpers for external callers
    isNewAccount(member, am) {
        const ageMs = Date.now() - (member.user.createdAt?.getTime?.() ?? 0);
        return ageMs < (am.newAccountMaxAgeDays ?? 7) * 86_400_000;
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
    async handleMessage(message, opts) {
        // Modular engine: MESSAGE → NORMALIZE → DETECT → EXEMPT → ACTION → LOG → CASE
        // opts.dryRun supported for preview/test
        return this.engine.handleMessage(message, opts);
    }
    async handleMessageUpdate(oldMsg, newMsg) {
        // Edited message detection — evaluate edited content, deduplicate via content check
        if (!newMsg.guild || !newMsg.member) return;
        if (oldMsg?.content === newMsg.content) return;
        // Avoid double-punish if same violation already handled within 30s
        return this.engine.handleMessage(newMsg, { isEdit: true });
    }
    // Keep old punish/track for compat — delegate to engine escalation
    async punish(message, reason, _am, weight = 1) {
        // For legacy callers, use engine's execute path
        return this.engine.executeAction(message, { type: "legacy", severity: "MEDIUM", confidence: 0.9, reason }, "delete", {});
    }
    async trackOffense(guild, member, reason, weight = 1) {
        return this.engine.escalation.record(guild.id, member.id);
    }
    async escalate(guild, member, reason) {
        const am = this.resolveConfig((await this.settings.get(guild.id).catch(()=>null))?.automod);
        const count = this.engine.escalation.getCount(guild.id, member.id);
        const pick = this.engine.escalation.pickAction(count, am);
        if (pick.action === "timeout") {
            await member.disableCommunicationUntil(new Date(Date.now() + (pick.durationMs ?? 600000))).catch(()=>{});
        }
        await this.engine.maybeCase(guild, member, { type:"escalation", severity:"HIGH", confidence:0.9, reason }, pick.action, count);
    }
    async handleJoin(member) {
        const guild = member.guild;
        const config = await this.settings.get(guild.id).catch(() => null);
        if (!config) return;
        const modules = config.modules ?? {};
        if (modules.automod === false) return;
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
        if (!id) return;
        const channel = guild.channels.cache.get(id);
        if (!channel) return;
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
    // Test/preview helpers
    async testMessage(guild, content, member) {
        // Build a fake message-like object for detector dry run
        const fake = {
            content,
            guild,
            member,
            author: member.user,
            channel: { id: guild.systemChannelId ?? "0" },
            mentions: { users: new Map(), members: new Map(), roles: new Map() },
            deletable: false,
        };
        // Approx mention counts from content
        const userMentions = (content.match(/<@!?(\d+)>/g) ?? []).length;
        fake.mentions.users.size = userMentions;
        return this.engine.handleMessage(fake, { dryRun: true });
    }
}
