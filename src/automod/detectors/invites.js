import { isStaffMember } from "../exemptions.js";

const INVITE_RE = /discord\.(gg|com\/invite)\/([a-zA-Z0-9-]+)/gi;

function getCfg(am) {
    const d = am.detectors?.invites ?? {};
    return {
        enabled: d.enabled ?? (am.inviteFilter ?? true),
        blockExternal: d.blockExternal ?? true,
        allowServers: d.allowServers ?? am.whitelistServers ?? [],
        allowChannels: d.allowChannels ?? am.whitelistInviteChannels ?? [],
        allowStaff: d.allowStaff ?? true,
        whitelistDomains: d.whitelistDomains ?? am.whitelistDomains ?? [],
        action: d.action ?? "delete",
        severity: d.severity ?? "MEDIUM",
    };
}

export function detectInvites(message, config, am) {
    const cfg = getCfg(am);
    if (!cfg.enabled) return null;
    const content = message.content ?? "";
    const matches = [...content.matchAll(INVITE_RE)];
    if (!matches.length) return null;

    // Exemptions
    if (cfg.allowStaff && isStaffMember(message.member, config)) return null;
    if (cfg.allowChannels.includes(message.channel.id)) return null;
    if (config.ignoredChannelIds?.includes(message.channel.id)) return null;

    // Check each invite code against whitelist (if we can resolve, but we conservatively block unless whitelisted domain)
    // For MVP: if allowServers contains codes, allow those
    const codes = matches.map((m) => m[2].toLowerCase());
    const allowedCodes = cfg.allowServers.map((c) => String(c).toLowerCase());
    const allAllowed = codes.every((c) => allowedCodes.includes(c));
    if (allAllowed) return null;

    // Domain whitelist check (not really for invites, but for consistency)
    // If any invite is external and blockExternal, trigger
    if (cfg.blockExternal) {
        return {
            type: "invites",
            severity: cfg.severity,
            confidence: 0.96,
            reason: `External Discord invite (${codes[0]})`,
            metadata: { codes },
        };
    }
    return null;
}
