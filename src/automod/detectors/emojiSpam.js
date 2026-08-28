import { countEmojis, countRepeatedChars } from "../normalizer.js";

function getCfg(am){
    const d = am.detectors?.emoji ?? am.detectors?.emojiSpam ?? {};
    return {
        enabled: d.enabled ?? true,
        repeatedCharsThreshold: d.repeatedCharsThreshold ?? 10,
        repeatedEmojiThreshold: d.repeatedEmojiThreshold ?? am.emojiSpamThreshold ?? 10,
        maxLength: d.maxLength ?? 1500,
        action: d.action ?? "delete",
        severity: d.severity ?? "MEDIUM",
    };
}

export function detectEmojiSpam(message, config, am){
    const cfg = getCfg(am);
    if(!cfg.enabled) return null;
    const content = message.content ?? "";
    // Enormous message
    if(content.length > cfg.maxLength){
        return { type:"emoji", severity:"MEDIUM", confidence:0.85, reason:`Enormous message ${content.length} > ${cfg.maxLength}`, metadata:{ len: content.length } };
    }
    // Repeated characters (AAAA...)
    const rep = countRepeatedChars(content);
    if(rep >= cfg.repeatedCharsThreshold){
        return { type:"emoji", severity: cfg.severity, confidence:0.9, reason:`Repeated characters ${rep} ≥ ${cfg.repeatedCharsThreshold}`, metadata:{ rep } };
    }
    // Emoji wall
    const emojis = countEmojis(content);
    if(emojis >= cfg.repeatedEmojiThreshold){
        return { type:"emoji", severity: cfg.severity, confidence:0.91, reason:`Emoji spam ${emojis} ≥ ${cfg.repeatedEmojiThreshold}`, metadata:{ emojis } };
    }
    // Zalgo already handled separately but keep here for unified detector
    const combining = (content.match(/\p{M}/gu) ?? []).length;
    if(combining > 15){
        return { type:"emoji", severity:"MEDIUM", confidence:0.88, reason:"Zalgo", metadata:{ combining } };
    }
    return null;
}
