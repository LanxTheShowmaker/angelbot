/**
 * Mention spam — user mentions, role mentions, @everyone/@here
 */

function getCfg(am) {
    const d = am.detectors?.mentions ?? {};
    return {
        enabled: d.enabled ?? true,
        maxUserMentions: d.maxUserMentions ?? am.maxMentions ?? 5,
        maxRoleMentions: d.maxRoleMentions ?? 3,
        allowEveryone: d.allowEveryone ?? false,
        allowHere: d.allowHere ?? false,
        action: d.action ?? "delete",
        severity: d.severity ?? "HIGH",
    };
}

export function detectMentions(message, config, am) {
    const cfg = getCfg(am);
    if (!cfg.enabled) return null;
    const content = message.content ?? "";
    const userMentions = message.mentions.users.size;
    const roleMentions = message.mentions.roles.size;
    const hasEveryone = content.includes("@everyone");
    const hasHere = content.includes("@here");

    if (!cfg.allowEveryone && hasEveryone) {
        return {
            type: "mentions",
            severity: "CRITICAL",
            confidence: 0.99,
            reason: "@everyone not allowed",
            metadata: { hasEveryone },
        };
    }
    if (!cfg.allowHere && hasHere) {
        return {
            type: "mentions",
            severity: "HIGH",
            confidence: 0.99,
            reason: "@here not allowed",
            metadata: { hasHere },
        };
    }
    if (userMentions > cfg.maxUserMentions) {
        return {
            type: "mentions",
            severity: cfg.severity,
            confidence: 0.95,
            reason: `Too many user mentions (${userMentions} > ${cfg.maxUserMentions})`,
            metadata: { userMentions },
        };
    }
    if (roleMentions > cfg.maxRoleMentions) {
        return {
            type: "mentions",
            severity: cfg.severity,
            confidence: 0.93,
            reason: `Too many role mentions (${roleMentions} > ${cfg.maxRoleMentions})`,
            metadata: { roleMentions },
        };
    }
    // Repeated mentions across recent messages — handled by spam detector, not here
    return null;
}
