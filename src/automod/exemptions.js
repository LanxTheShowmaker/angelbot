import { isIgnored } from "../core/services.js";
import { PermissionFlagsBits } from "discord.js";

/**
 * Central exemption checker.
 * Each detector can call isExempt(message, config, detectorKey)
 * where detectorKey e.g. "spam", "mentions", "invites", "words" etc.
 * Exemptions are conservative: false positives worse than misses.
 */

export function isBotExempt(message, config) {
    // Default: ignore bots and webhooks unless explicitly configured to check them
    if (message.author?.bot) return true;
    if (message.webhookId) return true;
    return false;
}

export function isExempt(message, config, detectorKey) {
    const member = message.member;
    const guild = message.guild;
    if (!guild || !member) return true; // DM or missing

    // Bot safety first
    if (isBotExempt(message, config)) return true;

    // Global exemptions from GuildConfig.ignored* and automod.exemptions
    const am = config.automod ?? {};
    const globalExemptRoles = am.exemptions?.roles ?? [];
    const globalExemptUsers = am.exemptions?.users ?? [];
    const globalExemptChannels = am.exemptions?.channels ?? [];
    const globalExemptCategories = am.exemptions?.categories ?? [];

    // Per-detector exemptions (optional)
    const detExempt = am.detectors?.[detectorKey]?.exemptions ?? null;

    const checkRoles = detExempt?.roles ?? globalExemptRoles;
    const checkUsers = detExempt?.users ?? globalExemptUsers;
    const checkChannels = detExempt?.channels ?? globalExemptChannels;
    const checkCategories = detExempt?.categories ?? globalExemptCategories;

    // Channel / category
    if (checkChannels.includes(message.channel.id)) return true;
    if (checkCategories.includes(message.channel.parentId)) return true;
    if (config.ignoredChannelIds?.includes(message.channel.id)) return true;

    // User / role (via isIgnored helper which checks ignoredUserIds/RoleIds)
    if (checkUsers.includes(member.id)) return true;
    if (isIgnored(member, config)) return true;
    // Explicit role list (staff may bypass spam but not phishing if configured)
    if (checkRoles.some((id) => member.roles.cache.has(id))) return true;

    // Staff / admin exemptions per detector — configurable
    // Example: staff may bypass spam but not phishing if administrator configures
    const detectorExemptStaff = detExempt?.exemptStaff;
    const detectorExemptAdmin = detExempt?.exemptAdmin;
    // If per-detector not set, fall back to sensible defaults:
    // - Spam/mention/caps/emoji: staff/admin exempt by default
    // - Security (phishing/scam/raid/words): not exempt unless explicitly
    const isStaff = (() => {
        const roleIds = new Set(member.roles.cache.keys());
        if (member.permissions.has(PermissionFlagsBits.Administrator) || member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
        if (config.staffRoleIds?.some((id) => roleIds.has(id))) return true;
        if (config.moderatorRoleIds?.some((id) => roleIds.has(id))) return true;
        return false;
    })();
    const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);

    if (detectorExemptStaff !== undefined) {
        if (detectorExemptStaff && isStaff) return true;
    } else {
        // Default: staff exempt for low-severity detectors
        if (["spam", "duplicate", "mentions", "caps", "emoji", "repeat"].includes(detectorKey) && isStaff) return true;
    }
    if (detectorExemptAdmin !== undefined) {
        if (detectorExemptAdmin && isAdmin) return true;
    } else {
        if (["spam", "duplicate", "mentions", "caps", "emoji", "repeat"].includes(detectorKey) && isAdmin) return true;
    }

    return false;
}

// Helper for invite whitelist: allow staff-posted invites if configured
export function isStaffMember(member, config) {
    if (!member) return false;
    if (member.permissions.has(PermissionFlagsBits.Administrator) || member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
    const roleIds = new Set(member.roles.cache.keys());
    if (config?.staffRoleIds?.some((id) => roleIds.has(id))) return true;
    if (config?.moderatorRoleIds?.some((id) => roleIds.has(id))) return true;
    return false;
}
