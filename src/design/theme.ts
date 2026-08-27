export const Theme = {
  accent: 0x7c6df2,
  success: 0x3dd68c,
  danger: 0xf2545b,
  warn: 0xf5a623,
  info: 0x7c6df2,
  muted: 0x9aa0a6,
  text: 0x1f2330,
} as const;

export const Brand = {
  name: "WINGS",
  footer: "WINGS",
  mark: "❖",
} as const;

export type StatusKind = "success" | "error" | "warn" | "info" | "moderation" | "neutral";
