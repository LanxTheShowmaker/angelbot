/**
 * Conservative normalizer for duplicate / word filter evasion.
 * Does NOT aggressively mangle text — false positives worse than misses.
 */

export function normalizeText(content) {
    if (!content) return "";
    let s = content.toLowerCase().trim();
    // Collapse whitespace
    s = s.replace(/\s+/g, " ");
    return s;
}

export function normalizeForDuplicate(content) {
    let s = normalizeText(content);
    // Optionally strip punctuation for duplicate (conservative: only leading/trailing, not internal)
    s = s.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "").trim();
    // Collapse repeated punctuation/spaces already done
    return s;
}

// Very conservative evasion normalizer — only for word filter when explicitly enabled.
// Transforms: "b a d" (single letters spaced) -> "bad", "b.a.d" -> "bad", "b-a-d" -> "bad"
// We only apply if the result looks like a single word (no spaces) and original had single-char tokens.
export function normalizeEvasion(content) {
    if (!content) return "";
    let s = content.toLowerCase();
    // Remove zero-width, normalize leet conservatively
    const leet = { "@": "a", "4": "a", "3": "e", "1": "i", "0": "o", "5": "s", "7": "t" };
    // Only replace leet when surrounded by letters (avoid breaking normal numbers)
    s = s.replace(/(?<=[a-z])[@431057](?=[a-z])/g, (m) => leet[m] ?? m);
    // If pattern is single letters separated by single non-alphanum (e.g., "b a d" or "b.a.d" or "b-a-d")
    const stripped = s.replace(/[^a-z0-9]/g, "");
    const tokens = s.trim().split(/[^a-z0-9]+/).filter(Boolean);
    if (tokens.length >= 3 && tokens.every((t) => t.length === 1) && stripped.length >= 3 && stripped.length <= 20) {
        // Likely evasion like "b a d" -> "bad"
        return stripped;
    }
    // For spaced single chars like "b a d word" — only collapse the single-char run at start? Keep conservative: return stripped only if original was mostly single chars
    return normalizeText(content);
}

export function stripPunctuationForWordFilter(content) {
    // For word filter: keep letters/numbers, replace other with space, collapse
    return content.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

export function countAlpha(content) {
    return (content.match(/[A-Za-z]/g) ?? []).length;
}
export function countUpper(content) {
    return (content.match(/[A-Z]/g) ?? []).length;
}
export function countEmojis(content) {
    const custom = (content.match(/<a?:\w+:\d+>/g) ?? []).length;
    const unicode = (content.match(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu) ?? []).length;
    return custom + unicode;
}
export function countRepeatedChars(content) {
    // Finds longest run of same char (e.g., "AAAA" => 4)
    let max = 1, cur = 1;
    for (let i = 1; i < content.length; i++) {
        if (content[i] === content[i - 1]) cur++;
        else { max = Math.max(max, cur); cur = 1; }
    }
    return Math.max(max, cur);
}
export function isZalgo(content) {
    const combining = (content.match(/\p{M}/gu) ?? []).length;
    return combining > 15;
}
