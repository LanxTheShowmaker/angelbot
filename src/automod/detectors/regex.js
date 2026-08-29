import { normalizeText } from "../normalizer.js";
export function detectRegexRules(message, config, am, { normalized }){
    const rules = am.regexRules || am.customRegex || [];
    if(!Array.isArray(rules) || !rules.length) return null;
    const content = message.content ?? "";
    const norm = normalized ?? normalizeText(content);
    for(const rule of rules){
        if(!rule.pattern) continue;
        if(rule.enabled===false) continue;
        const flags = rule.flags ?? "i";
        let re;
        try{ re = new RegExp(rule.pattern, flags); }catch{ continue; }
        if(re.test(content) || re.test(norm)){
            return {
                type: "regex",
                reason: rule.reason || `Matched custom rule: ${rule.pattern}`,
                severity: rule.severity || "MEDIUM",
                confidence: rule.confidence ?? 0.85,
                meta: { pattern: rule.pattern }
            };
        }
        // Phrase matching (simple substring)
        if(rule.phrase && (content.toLowerCase().includes(rule.phrase.toLowerCase()) || norm.includes(rule.phrase.toLowerCase()))){
            return {
                type: "phrase",
                reason: rule.reason || `Matched phrase: ${rule.phrase}`,
                severity: rule.severity || "MEDIUM",
                confidence: 0.9
            };
        }
    }
    return null;
}
