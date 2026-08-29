import { normalizeText } from "./normalizer.js";
import { isExempt } from "./exemptions.js";
import { pickViolation, getActionForViolation, canPerformAction, canModerateTarget } from "./actionEngine.js";
import { logger } from "../core/logger.js";
import { embeds } from "../design/embeds.js";
import { EscalationManager } from "./escalation.js";

// Detectors
import { detectSpam } from "./detectors/spam.js";
import { detectDuplicate } from "./detectors/duplicate.js";
import { detectMentions } from "./detectors/mentions.js";
import { detectInvites } from "./detectors/invites.js";
import { detectLinks, detectLinkFilter } from "./detectors/links.js";
import { detectWords } from "./detectors/words.js";
import { detectCaps } from "./detectors/caps.js";
import { detectEmojiSpam } from "./detectors/emojiSpam.js";
import { detectRaidBurst } from "./detectors/raid.js";
import { detectRegexRules } from "./detectors/regex.js";

const detectorsList = [
    { key: "mentions", fn: detectMentions },
    { key: "invites", fn: detectInvites },
    { key: "words", fn: detectWords },
    { key: "regex", fn: detectRegexRules },
    { key: "links", fn: detectLinks },
    { key: "links", fn: detectLinkFilter },
    { key: "caps", fn: detectCaps },
    { key: "emoji", fn: detectEmojiSpam },
    { key: "spam", fn: detectSpam },
    { key: "duplicate", fn: detectDuplicate },
    { key: "raid", fn: detectRaidBurst },
];

export class AutomodEngine {
    escalation = new EscalationManager();
    constructor(client, settings, logging, prisma) {
        this.client = client;
        this.settings = settings;
        this.logging = logging;
        this.prisma = prisma;
        // Cleanup escalation every 5m
        setInterval(() => this.escalation.cleanup(), 5 * 60 * 1000);
    }

    async handleMessage(message, opts = {}) {
        const guild = message.guild;
        const member = message.member;
        if (!guild || !member) return null;
        if (message.author?.bot) return null;
        if (isExempt(message, await this.getConfig(guild.id), "global")) {
            // Still check for critical detectors that staff should not bypass? isExempt already handles per-detector
        }

        const config = await this.settings.get(guild.id).catch(() => null);
        if (!config) return null;
        const am = this.resolveConfig(config.automod);
        if (!am.enabled) return null;
        if (config.modules?.automod === false) return null;

        // Normalize once
        const normalized = normalizeText(message.content ?? "");

        const violations = [];
        for (const det of detectorsList) {
            try {
                if (isExempt(message, config, det.key)) continue;
                const v = det.fn(message, config, am, { normalized });
                // Some detectors are async (spam, duplicate)
                const res = v instanceof Promise ? await v : v;
                if (res) {
                    // Attach detector key for logging if not set
                    if (!res.type) res.type = det.key;
                    violations.push(res);
                }
            } catch (e) {
                logger.error("automod", `detector ${det.key} failed`, e);
            }
        }

        if (!violations.length) return null;

        const violation = pickViolation(violations);
        const action = getActionForViolation(violation, config, am);
        const permCheck = canPerformAction(action, guild);
        if (!permCheck.ok) {
            logger.warn("automod", `cannot perform ${action}: ${permCheck.reason}`);
            // Downgrade to log only
            await this.logViolation(message, violation, "log", config, null);
            return { violation, action: "log", reason: `Missing ${permCheck.reason}` };
        }

        // Escalation
        const count = this.escalation.record(guild.id, member.id);
        const escalation = this.escalation.pickAction(count, am);
        let finalAction = action;
        let durationMs = null;
        // If escalation suggests stronger, use it (but not downgrade from ban to log)
        if (escalation && escalation.action !== action) {
            // Only escalate, not de-escalate, unless current is critical
            const order = { log: 1, delete: 2, warn: 3, timeout: 4, kick: 5, ban: 6 };
            if ((order[escalation.action] ?? 0) > (order[action] ?? 0)) {
                finalAction = escalation.action;
                durationMs = escalation.durationMs ?? null;
            }
        }
        // If escalation says timeout but we would have logged, honor escalation
        if (escalation && escalation.action === "timeout" && action === "log") {
            finalAction = "timeout";
            durationMs = escalation.durationMs;
        }

        // Dry run?
        if (opts.dryRun) {
            return { violation, action: finalAction, dryRun: true, escalation: count, durationMs };
        }

        // Execute
        const result = await this.executeAction(message, violation, finalAction, { durationMs, count });
        await this.logViolation(message, violation, finalAction, config, result);
        await this.maybeCase(guild, member, violation, finalAction, count);

        // User feedback (concise, not spammy)
        if (finalAction === "delete" || finalAction === "warn") {
            const shouldWarn = am.notifyUser ?? true;
            if (shouldWarn) {
                const warnText = violation.confidence < 0.9 ? `Your message was removed (${violation.reason}).` : `Your message was removed: ${violation.reason}`;
                try { await member.send({ embeds: [embeds.warn("AutoMod", warnText)] }).catch(()=>{}); } catch {}
            }
        }

        // Moderator alert for high/critical
        if (["HIGH", "CRITICAL"].includes(violation.severity) || violation.confidence >= 0.9) {
            await this.alertModerators(guild, message, violation, finalAction, config);
        }

        return { violation, action: finalAction, result };
    }

    async getConfig(guildId) {
        // Helper for isExempt pre-check (uses settings.get but cached)
        try { return await this.settings.get(guildId); } catch { return null; }
    }

    resolveConfig(automod) {
        const a = automod ?? {};
        const num = (k, d) => typeof a[k] === "number" ? a[k] : d;
        const bool = (k, d) => typeof a[k] === "boolean" ? a[k] : d;
        // Keep legacy defaults + new detectors defaults
        return {
            enabled: bool("enabled", true),
            maxMentions: num("maxMentions", 5),
            spamThreshold: num("spamThreshold", 5),
            spamWindowMs: num("spamWindowMs", 5000),
            inviteFilter: bool("inviteFilter", true),
            linkFilter: bool("linkFilter", false),
            raidJoinThreshold: num("raidJoinThreshold", 10),
            raidWindowMs: num("raidWindowMs", 30000),
            newAccountFilter: bool("newAccountFilter", true),
            newAccountMaxAgeDays: num("newAccountMaxAgeDays", 7),
            emojiSpamThreshold: num("emojiSpamThreshold", 10),
            zalgoFilter: bool("zalgoFilter", true),
            scamUrlFilter: bool("scamUrlFilter", true),
            clusterSpam: bool("clusterSpam", true),
            clusterSpamThreshold: num("clusterSpamThreshold", 3),
            clusterSpamWindowMs: num("clusterSpamWindowMs", 60000),
            autoLockdown: bool("autoLockdown", true),
            confidenceThreshold: num("confidenceThreshold", 0.6),
            detectors: a.detectors ?? {},
            escalation: a.escalation ?? null,
            notifyUser: bool("notifyUser", true),
            exemptions: a.exemptions ?? {},
        };
    }

    async executeAction(message, violation, action, { durationMs } = {}) {
        const guild = message.guild;
        const member = message.member;
        try {
            if (action === "log") return { ok: true, action };
            if (action === "delete") {
                if (message.deletable) await message.delete().catch(e => logger.error("automod","delete failed",e));
                return { ok: true, action };
            }
            if (action === "warn") {
                if (message.deletable) await message.delete().catch(()=>{});
                return { ok: true, action };
            }
            if (action === "timeout") {
                if (message.deletable) await message.delete().catch(()=>{});
                const targetCheck = canModerateTarget(member, guild);
                if (!targetCheck.ok) return { ok:false, reason: targetCheck.reason, action };
                const dur = durationMs ?? 10 * 60 * 1000;
                if (member.moderatable && guild.members.me?.permissions.has("ModerateMembers")) {
                    await member.disableCommunicationUntil(new Date(Date.now() + dur)).catch(e=>logger.error("automod","timeout",e));
                    return { ok:true, action, durationMs: dur };
                }
                return { ok:false, reason:"ModerateMembers missing", action };
            }
            if (action === "kick") {
                if (message.deletable) await message.delete().catch(()=>{});
                const chk = canModerateTarget(member, guild);
                if (!chk.ok) return { ok:false, reason: chk.reason, action };
                if (member.kickable) await member.kick(`AutoMod: ${violation.reason}`).catch(e=>logger.error("automod","kick",e));
                return { ok:true, action };
            }
            if (action === "ban") {
                if (message.deletable) await message.delete().catch(()=>{});
                const chk = canModerateTarget(member, guild);
                if (!chk.ok) return { ok:false, reason: chk.reason, action };
                if (member.bannable) await guild.members.ban(member.id, { reason:`AutoMod: ${violation.reason}` }).catch(e=>logger.error("automod","ban",e));
                return { ok:true, action };
            }
        } catch (e) {
            logger.error("automod","execute failed", e);
            return { ok:false, reason: String(e.message), action };
        }
        return { ok:false, reason:"Unknown action", action };
    }

    async logViolation(message, violation, action, config, result) {
        try {
            const guild = message.guild;
            const ch = await this.logging.channel(guild, "mod");
            if (!ch) return;
            const embed = embeds.moderation(`AutoMod • ${violation.type}`, violation.reason, [
                { name: "User", value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
                { name: "Action", value: action, inline: true },
                { name: "Channel", value: `<#${message.channel.id}>`, inline: true },
                { name: "Detector", value: violation.type, inline: true },
                { name: "Severity", value: violation.severity, inline: true },
                { name: "Confidence", value: `${Math.round((violation.confidence ?? 0)*100)}%`, inline: true },
                { name: "Content", value: (message.content ?? "").slice(0, 1000) || "[no text]", inline: false },
                { name: "Case", value: result?.caseNumber ? `#${result.caseNumber}` : "—", inline: true },
            ]);
            // Preserve message ID
            embed.setFooter({ text: `ID: ${message.id} • ${new Date().toISOString()} | ${guild.name}` });
            await ch.send({ embeds: [embed] }).catch(e=>logger.error("automod","log failed",e));
        } catch (e) { logger.error("automod","logViolation failed",e); }
    }

    async maybeCase(guild, member, violation, action, count) {
        // Only create case for punish actions, not just log/delete
        if (!["warn","timeout","kick","ban"].includes(action)) return null;
        try {
            const botUser = this.client.user;
            if (!botUser) return null;
            // Reuse existing moderation service warn/case
            let c = null;
            if (action === "warn") c = await this.client.services.moderation.warn(guild, member, botUser, `AutoMod ${violation.type}: ${violation.reason}`).catch(()=>null);
            else if (action === "timeout") c = await this.client.services.moderation.warn(guild, member, botUser, `AutoMod timeout ${violation.type}: ${violation.reason}`).catch(()=>null);
            else if (action === "kick") c = await this.client.services.moderation.kick(guild, member, botUser, `AutoMod: ${violation.reason}`).catch(()=>null);
            else if (action === "ban") c = await this.client.services.moderation.ban(guild, member, botUser, `AutoMod: ${violation.reason}`).catch(()=>null);
            return c;
        } catch (e) { logger.error("automod","case failed",e); return null; }
    }

    async alertModerators(guild, message, violation, action, config) {
        try {
            const id = config.modLogChannelId;
            if (!id) return;
            const ch = guild.channels.cache.get(id) ?? await guild.channels.fetch(id).catch(()=>null);
            if (!ch || !ch.isTextBased()) return;
            // Avoid pinging @everyone, use configured modRole ping responsibly (if set)
            const rolePing = config.moderatorRoleIds?.[0] ? `<@&${config.moderatorRoleIds[0]}>` : "";
            const embed = embeds.warn("AutoMod Alert", `Potential **${violation.type}** detected.`, [
                { name: "User", value: `<@${message.author.id}>`, inline: true },
                { name: "Channel", value: `<#${message.channel.id}>`, inline: true },
                { name: "Confidence", value: `${Math.round((violation.confidence??0)*100)}%`, inline: true },
                { name: "Action", value: action, inline: true },
                { name: "Reason", value: violation.reason.slice(0,500), inline: false },
            ]);
            await ch.send({ content: rolePing || undefined, embeds: [embed] }).catch(()=>{});
        } catch (e) { logger.error("automod","alert failed",e); }
    }
}
