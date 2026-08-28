import { isStaffMember } from "../exemptions.js";

const URL_RE = /https?:\/\/[^\s]+/gi;
const SHORTENERS = ["bit.ly","tinyurl.com","t.co","is.gd","cutt.ly","rebrand.ly","shorturl.at"];
const SUSPICIOUS_TLDS = [".tk",".ml",".ga",".cf",".gq"];
const PHISHING_RE = [
    /discord[.-]?(gift|nitro|verify|claim)/i,
    /steamcommunity.*\.(com|gift)/i,
    /free.*(?:vbucks|robux|nitro)/i,
    /verify.*account.*now/i,
];

function getCfg(am){
    const d = am.detectors?.links ?? am.detectors?.urls ?? {};
    return {
        enabled: d.enabled ?? true,
        blockShorteners: d.blockShorteners ?? false,
        blockSuspiciousTLDs: d.blockSuspiciousTLDs ?? true,
        whitelistDomains: d.whitelistDomains ?? am.whitelistDomains ?? [],
        allowStaff: d.allowStaff ?? false, // for phishing, staff not exempt unless configured
        action: d.action ?? "delete",
        severity: d.severity ?? "HIGH",
        confidenceThreshold: d.confidenceThreshold ?? 0.7,
    };
}

function extractDomains(urls){
    return urls.map(u => { try{ return new URL(u).hostname.toLowerCase(); }catch{ return null; } }).filter(Boolean);
}

export function detectLinks(message, config, am){
    const cfg = getCfg(am);
    if(!cfg.enabled) return null;
    const content = message.content ?? "";
    const urls = [...content.matchAll(URL_RE)].map(m=>m[0]);
    if(!urls.length) return null;

    // Whitelist check — if all domains whitelisted, skip
    const domains = extractDomains(urls);
    if(cfg.whitelistDomains.length){
        const wl = cfg.whitelistDomains.map(d=>d.toLowerCase());
        if(domains.every(d=> wl.some(w=> d===w || d.endsWith("."+w)))) return null;
    }
    // Staff may bypass only if explicitly allowed for this detector
    if(cfg.allowStaff && isStaffMember(message.member, config)) return null;

    let confidence = 0;
    let reason = "";
    let severity = cfg.severity;

    // Shorteners
    if(cfg.blockShorteners){
        const hasShort = domains.some(d=> SHORTENERS.includes(d));
        if(hasShort){ confidence = 0.85; reason = "URL shortener"; severity="MEDIUM"; }
    }
    // Suspicious TLDs
    if(cfg.blockSuspiciousTLDs){
        const hasSuspTLD = domains.some(d=> SUSPICIOUS_TLDS.some(t=> d.endsWith(t)));
        if(hasSuspTLD){ confidence = Math.max(confidence, 0.75); reason = "Suspicious TLD"; severity="HIGH"; }
    }
    // Punycode / lookalike (contains xn--)
    const hasPuny = domains.some(d=> d.includes("xn--"));
    if(hasPuny){ confidence = Math.max(confidence, 0.88); reason = "Punycode domain"; severity="CRITICAL"; }

    // Phishing patterns
    const text = content.toLowerCase();
    const phishHit = PHISHING_RE.some(re=> re.test(text));
    if(phishHit){ confidence = Math.max(confidence, 0.92); reason = "Phishing-like URL"; severity="CRITICAL"; }

    // Deceptive discord-like (e.g., discordgift, discord-nitro)
    const deceptive = /discor[dt][^a-z]*gift|disco[a-z]*nitro/i.test(text);
    if(deceptive){ confidence = Math.max(confidence, 0.95); reason = "Deceptive discord-like domain"; severity="CRITICAL"; }

    // Excessive redirects not detectable via content alone — skip

    if(confidence === 0) return null; // no suspicious signal, but still a link — don't punish unless configured to block all links
    // If detector is just "suspicious URLs" not "block all links", only punish when suspicious
    return {
        type: "links",
        severity,
        confidence,
        reason,
        metadata: { domains, urls: urls.slice(0,3) },
    };
}

// Also check linkFilter (block all links) separately — handled as legacy fallback in engine if needed
export function detectLinkFilter(message, config, am){
    const d = am.detectors?.links ?? {};
    const blockAll = d.blockAll ?? am.linkFilter ?? false;
    if(!blockAll) return null;
    const hasLink = /https?:\/\//i.test(message.content ?? "");
    if(!hasLink) return null;
    if(isStaffMember(message.member, config)) return null;
    return { type:"links", severity:"MEDIUM", confidence:0.99, reason:"Links not allowed", metadata:{} };
}
