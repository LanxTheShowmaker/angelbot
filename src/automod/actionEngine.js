import { PermissionFlagsBits } from "discord.js";
import { logger } from "../core/logger.js";

/**
 * Unified AutoMod action engine.
 * Input: violations[] from detectors, each { type, severity, confidence, reason, metadata }
 * Output: selected { action, severity, confidence, reason, detector }
 * Actions: log | delete | warn | timeout | kick | ban
 */

const SEVERITY_ORDER = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
export const ACTIONS = ["log", "delete", "warn", "timeout", "kick", "ban"];

export function pickViolation(violations) {
    if (!violations.length) return null;
    // Prefer highest severity, then highest confidence
    return [...violations].sort((a, b) => {
        const s = (SEVERITY_ORDER[b.severity] ?? 0) - (SEVERITY_ORDER[a.severity] ?? 0);
        if (s !== 0) return s;
        return (b.confidence ?? 0) - (a.confidence ?? 0);
    })[0];
}

export function getActionForViolation(violation, config, am) {
    // Per-detector action override: am.detectors[violation.type]?.action
    const detCfg = am.detectors?.[violation.type] ?? {};
    let action = detCfg.action ?? violation.action ?? null;
    // Fallback to defaults per severity if not configured
    if (!action) {
        switch (violation.severity) {
            case "LOW": action = "log"; break;
            case "MEDIUM": action = "delete"; break;
            case "HIGH": action = "delete"; break;
            case "CRITICAL": action = "delete"; break;
            default: action = "delete";
        }
    }
    // Confidence gate: only punish above threshold for heuristic detectors
    const heuristic = ["scam", "phishing", "url", "raid", "bannedWord".toLowerCase()];
    const isHeuristic = heuristic.includes(violation.type) || violation.confidence < 1;
    const threshold = detCfg.confidenceThreshold ?? am.confidenceThreshold ?? 0.6;
    if (isHeuristic && violation.confidence < threshold && ["warn", "timeout", "kick", "ban"].includes(action)) {
        // Downgrade to delete+log
        if (violation.severity === "CRITICAL") action = "delete";
        else action = "delete";
        logger.debug?.("automod", `downgraded ${violation.type} confidence ${violation.confidence} < ${threshold} to ${action}`);
    }
    return action;
}

// Permission check before enabling actions
export function canPerformAction(action, guild) {
    const me = guild.members.me;
    if (!me) return { ok: false, reason: "Bot not cached" };
    switch (action) {
        case "delete": return me.permissions.has(PermissionFlagsBits.ManageMessages) ? { ok: true } : { ok: false, reason: "ManageMessages" };
        case "timeout": return me.permissions.has(PermissionFlagsBits.ModerateMembers) ? { ok: true } : { ok: false, reason: "ModerateMembers" };
        case "kick": return me.permissions.has(PermissionFlagsBits.KickMembers) ? { ok: true } : { ok: false, reason: "KickMembers" };
        case "ban": return me.permissions.has(PermissionFlagsBits.BanMembers) ? { ok: true } : { ok: false, reason: "BanMembers" };
        case "warn":
        case "log": return { ok: true };
        default: return { ok: true };
    }
}

export function canModerateTarget(member, guild) {
    if (!member) return { ok: false, reason: "No member" };
    if (member.id === guild.ownerId) return { ok: false, reason: "Server owner" };
    const me = guild.members.me;
    if (!me) return { ok: false, reason: "Bot not cached" };
    if (member.roles.highest.position >= me.roles.highest.position) return { ok: false, reason: "Role hierarchy" };
    if (!member.moderatable) return { ok: false, reason: "Not moderatable" };
    return { ok: true };
}
