import { normalizeEvasion, stripPunctuationForWordFilter } from "../normalizer.js";

function getCfg(am){
    const d = am.detectors?.words ?? {};
    return {
        enabled: d.enabled ?? true,
        rules: d.rules ?? am.blockedWords ?? am.bannedWords ?? [],
        action: d.action ?? "delete",
        severity: d.severity ?? "HIGH",
        evasion: d.evasion ?? false, // conservative off by default
    };
}

// Each rule: { phrase, match: "exact"|"phrase"|"regex", action, severity }
// - exact: word boundaries \bphrase\b case-insensitive
// - phrase: substring case-insensitive
// - regex: new RegExp(phrase, "i") if safe

function isSafeRegex(pattern){
    // Very conservative: reject catastrophic backtracking patterns (nested quantifiers)
    if(pattern.length > 200) return false;
    if(/(\+\+|\*\*|\{\d+,\}\+)/.test(pattern)) return false;
    try{ new RegExp(pattern, "i"); return true; }catch{ return false; }
}

export function detectWords(message, config, am){
    const cfg = getCfg(am);
    if(!cfg.enabled || !cfg.rules.length) return null;
    const raw = message.content ?? "";
    if(!raw) return null;
    const content = raw.toLowerCase();
    const evasionNorm = cfg.evasion ? normalizeEvasion(raw).toLowerCase() : null;
    const stripped = stripPunctuationForWordFilter(raw);

    for(const rule of cfg.rules){
        const phrase = String(rule.phrase ?? rule.word ?? "").trim();
        if(!phrase) continue;
        const match = rule.match ?? "phrase";
        const severity = rule.severity ?? cfg.severity;
        const action = rule.action ?? cfg.action;
        try{
            if(match === "exact"){
                const re = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, "i");
                if(re.test(raw) || (evasionNorm && re.test(evasionNorm))) return { type:"words", severity, confidence:0.98, reason:`Blocked word: ${phrase}`, metadata:{ phrase, match } };
            } else if(match === "phrase"){
                if(content.includes(phrase.toLowerCase()) || (evasionNorm && evasionNorm.includes(phrase.toLowerCase()))){
                    // Also check stripped version for "b a d" evasion already handled
                    return { type:"words", severity, confidence:0.96, reason:`Blocked phrase: ${phrase}`, metadata:{ phrase, match } };
                }
            } else if(match === "regex"){
                if(!isSafeRegex(phrase)) continue;
                const re = new RegExp(phrase, "i");
                if(re.test(raw) || (evasionNorm && re.test(evasionNorm))) return { type:"words", severity, confidence:0.94, reason:`Blocked pattern: ${phrase}`, metadata:{ phrase, match } };
            }
        }catch{}
    }
    return null;
}

function escapeRegExp(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
