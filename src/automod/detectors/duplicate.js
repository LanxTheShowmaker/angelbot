import { normalizeForDuplicate } from "../normalizer.js";

const history = new Map(); // `${guildId}:${userId}` -> [{norm, ts}]

function getCfg(am) {
    const d = am.detectors?.duplicate ?? {};
    return {
        enabled: d.enabled ?? true,
        threshold: d.threshold ?? 3, // repeated duplicates
        within: d.within ?? 30000,
        action: d.action ?? "delete",
        severity: d.severity ?? "MEDIUM",
    };
}

export function detectDuplicate(message, config, am) {
    const cfg = getCfg(am);
    if (!cfg.enabled) return null;
    const content = message.content ?? "";
    const norm = normalizeForDuplicate(content);
    if (!norm || norm.length < 8) return null; // ignore very short
    const guildId = message.guild?.id;
    const userId = message.author?.id;
    if (!guildId || !userId) return null;
    const now = Date.now();
    const key = `${guildId}:${userId}`;
    let arr = history.get(key) ?? [];
    // Cleanup old
    arr = arr.filter((e) => now - e.ts < cfg.within);
    arr.push({ norm, ts: now });
    history.set(key, arr);
    // Count identical
    const count = arr.filter((e) => e.norm === norm).length;
    if (count >= cfg.threshold) {
        // Keep only last window to avoid leak
        if (history.size > 4000) history.delete([...history.keys()][0]);
        return {
            type: "duplicate",
            severity: cfg.severity,
            confidence: 0.92,
            reason: `Duplicate message ${count}× within ${cfg.within / 1000}s`,
            metadata: { norm, count },
        };
    }
    // Bounded cleanup
    if (arr.length > 10) history.set(key, arr.slice(-10));
    return null;
}

export function _clear(){ history.clear(); }
