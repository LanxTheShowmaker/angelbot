import { countAlpha, countUpper } from "../normalizer.js";

function getCfg(am){
    const d = am.detectors?.caps ?? {};
    return {
        enabled: d.enabled ?? true,
        minChars: d.minChars ?? 12,
        percent: d.percent ?? 80,
        action: d.action ?? "delete",
        severity: d.severity ?? "LOW",
    };
}

export function detectCaps(message, config, am){
    const cfg = getCfg(am);
    if(!cfg.enabled) return null;
    const content = message.content ?? "";
    const alpha = countAlpha(content);
    if(alpha < cfg.minChars) return null;
    const upper = countUpper(content);
    const pct = (upper / alpha) * 100;
    if(pct >= cfg.percent){
        return {
            type: "caps",
            severity: cfg.severity,
            confidence: 0.88,
            reason: `Excessive caps ${Math.round(pct)}% (${upper}/${alpha})`,
            metadata: { alpha, upper, pct },
        };
    }
    return null;
}
