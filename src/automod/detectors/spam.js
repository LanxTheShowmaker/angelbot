import { normalizeForDuplicate } from "../normalizer.js";

/**
 * Spam detector — proper frequency + content analysis.
 * Config: am.detectors.spam { enabled, messages, within, action, severity }
 * Also respects legacy am.spamThreshold / am.spamWindowMs
 */
const history = new Map(); // `${guildId}:${userId}` -> { msgs: [{content, ts, hasLink, mentions}], firstTs }

function getCfg(am) {
    const d = am.detectors?.spam ?? {};
    return {
        enabled: d.enabled ?? true,
        messages: d.messages ?? am.spamThreshold ?? 5,
        within: d.within ?? am.spamWindowMs ?? 5000,
        action: d.action ?? "delete",
        severity: d.severity ?? "MEDIUM",
        confidenceThreshold: d.confidenceThreshold ?? 0.7,
    };
}

function cleanup(guildId, userId, now, within) {
    const key = `${guildId}:${userId}`;
    const entry = history.get(key);
    if (!entry) return;
    // Expire old msgs outside window
    entry.msgs = entry.msgs.filter((m) => now - m.ts < within * 2); // keep 2x window for repeated checks
    if (!entry.msgs.length) history.delete(key);
    else if (history.size > 5000) {
        // Bounded
        const oldest = [...history.entries()].sort((a,b)=>a[1].msgs[0]?.ts - b[1].msgs[0]?.ts)[0];
        if (oldest) history.delete(oldest[0]);
    }
}

export function detectSpam(message, config, am, ctx) {
    const cfg = getCfg(am);
    if (!cfg.enabled) return null;
    const guildId = message.guild?.id;
    const userId = message.author?.id;
    if (!guildId || !userId) return null;
    const content = message.content ?? "";
    const now = Date.now();
    const key = `${guildId}:${userId}`;
    let entry = history.get(key);
    if (!entry) { entry = { msgs: [], firstTs: now }; history.set(key, entry); }
    // Add current
    const hasLink = /https?:\/\//i.test(content);
    const mentions = message.mentions.users.size + (message.mentions.roles?.size ?? 0);
    entry.msgs.push({ content: normalizeForDuplicate(content), raw: content, ts: now, hasLink, mentions });
    // Cleanup old beyond window
    const windowStart = now - cfg.within;
    const recent = entry.msgs.filter((m) => m.ts >= windowStart);
    // Not enough yet
    if (recent.length < cfg.messages) {
        cleanup(guildId, userId, now, cfg.within);
        return null;
    }
    // Analyze recent for spam signals
    let score = 0;
    let reason = "";
    // 1. Frequency: messages >= threshold
    if (recent.length >= cfg.messages) {
        score = 0.6;
        reason = `Flood: ${recent.length} msgs in ${cfg.within}ms`;
    }
    // 2. Repeated content (exact)
    const counts = new Map();
    for (const m of recent) counts.set(m.content, (counts.get(m.content) ?? 0) + 1);
    const maxSame = Math.max(...counts.values());
    if (maxSame >= Math.ceil(cfg.messages / 2)) {
        score = Math.max(score, 0.8);
        reason = `Repeated content (${maxSame}/${recent.length} same)`;
    }
    // 3. Near-identical (Levenshtein-ish: first 80% chars same)
    // Conservative: check if all recent share same first 20 chars
    if (recent.length >= 3) {
        const first = recent[0].content.slice(0, 20);
        const similar = recent.filter((m) => m.content.slice(0, 20) === first).length;
        if (similar >= cfg.messages) {
            score = Math.max(score, 0.7);
            reason = `Near-identical flood`;
        }
    }
    // 4. Repeated links
    const linkCount = recent.filter((m) => m.hasLink).length;
    if (linkCount >= cfg.messages && recent.length >= cfg.messages) {
        score = Math.max(score, 0.75);
        reason = `Repeated links (${linkCount}/${recent.length})`;
    }
    // 5. Repeated mentions
    const mentionSum = recent.reduce((s, m) => s + m.mentions, 0);
    if (mentionSum >= cfg.messages * 2) {
        score = Math.max(score, 0.7);
        reason = `Repeated mentions (${mentionSum})`;
    }

    cleanup(guildId, userId, now, cfg.within);

    if (score === 0) return null;
    // Only trigger if score high enough and recent count meets threshold
    const confidence = Math.min(score, 0.95);
    if (confidence < 0.6) return null;
    return {
        type: "spam",
        severity: cfg.severity,
        confidence,
        reason,
        metadata: { recent: recent.length, maxSame },
    };
}

// Expose for testing/cleanup
export function _clearHistory(){ history.clear(); }
