/**
 * Lightweight anti-raid — message bursts + optional join bursts (handled in service)
 */

function getCfg(am){
    const d = am.detectors?.raid ?? {};
    return {
        enabled: d.enabled ?? true,
        messagesThreshold: d.messagesThreshold ?? 8,
        within: d.within ?? 5000,
        action: d.action ?? "log", // do NOT kick/ban automatically unless explicitly set to ban
        severity: d.severity ?? "CRITICAL",
        alertOnly: d.alertOnly ?? true,
    };
}

// Global burst map: guildId -> [{ts, userId, content}]
const burstMap = new Map();
const ALERT_COOLDOWN = new Map();

export function detectRaidBurst(message, config, am){
    const cfg = getCfg(am);
    if(!cfg.enabled) return null;
    const guildId = message.guild?.id;
    if(!guildId) return null;
    const now = Date.now();
    let arr = burstMap.get(guildId) ?? [];
    arr.push({ ts: now, userId: message.author.id, content: message.content?.slice(0,30) });
    // Keep only within
    arr = arr.filter(e=> now - e.ts < cfg.within);
    burstMap.set(guildId, arr);
    // Cleanup
    if(burstMap.size > 1000) burstMap.delete([...burstMap.keys()][0]);

    if(arr.length >= cfg.messagesThreshold){
        // Check diversity: if many distinct users + similar content or mass mentions, treat as raid
        const distinctUsers = new Set(arr.map(e=>e.userId)).size;
        const cooldownKey = `${guildId}:raid`;
        const last = ALERT_COOLDOWN.get(cooldownKey) ?? 0;
        if(Date.now() - last < 60000) return null; // cooldown
        // Require at least 3 distinct users for raid (not single spammer)
        if(distinctUsers >= 3){
            ALERT_COOLDOWN.set(cooldownKey, Date.now());
            return {
                type: "raid",
                severity: cfg.severity,
                confidence: 0.78, // heuristic, medium-high
                reason: `Burst ${arr.length} msgs in ${cfg.within}ms by ${distinctUsers} users`,
                metadata: { count: arr.length, distinctUsers, within: cfg.within },
            };
        }
    }
    return null;
}

export function _clear(){ burstMap.clear(); ALERT_COOLDOWN.clear(); }
