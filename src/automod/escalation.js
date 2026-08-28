import { logger } from "../core/logger.js";

const DEFAULT_ESCALATION = [
    { violations: 1, action: "delete", durationMs: 0 },
    { violations: 2, action: "warn", durationMs: 0 },
    { violations: 3, action: "timeout", durationMs: 5 * 60 * 1000 },
    { violations: 4, action: "timeout", durationMs: 60 * 60 * 1000 },
    { violations: 5, action: "timeout", durationMs: 24 * 60 * 60 * 1000 },
];

/**
 * Escalation manager — per guild+user.
 * Integrates with existing case system if available.
 */
export class EscalationManager {
    map = new Map(); // `${guildId}:${userId}` -> { count, firstTs, lastTs }
    windowMs = 10 * 60 * 1000; // 10m window
    constructor(windowMs) { if (windowMs) this.windowMs = windowMs; }

    getEscalationConfig(am) {
        return am.escalation ?? DEFAULT_ESCALATION;
    }

    record(guildId, userId) {
        const key = `${guildId}:${userId}`;
        const now = Date.now();
        const cur = this.map.get(key);
        if (!cur || now - cur.firstTs > this.windowMs) {
            this.map.set(key, { count: 1, firstTs: now, lastTs: now });
            return 1;
        }
        cur.count += 1;
        cur.lastTs = now;
        this.map.set(key, cur);
        return cur.count;
    }

    getCount(guildId, userId) {
        const cur = this.map.get(`${guildId}:${userId}`);
        if (!cur) return 0;
        if (Date.now() - cur.firstTs > this.windowMs) return 0;
        return cur.count;
    }

    pickAction(count, am) {
        const cfg = this.getEscalationConfig(am);
        // Find highest violations <= count
        let best = cfg[0];
        for (const step of cfg) if (step.violations <= count && step.violations >= best.violations) best = step;
        return best;
    }

    // Bounded cleanup — call periodically
    cleanup() {
        const now = Date.now();
        for (const [k, v] of this.map) if (now - v.firstTs > this.windowMs) this.map.delete(k);
        // Hard cap 5000 entries
        if (this.map.size > 5000) {
            const toDelete = this.map.size - 5000;
            let i = 0;
            for (const k of this.map.keys()) { if (i++ >= toDelete) break; this.map.delete(k); }
        }
    }
}
