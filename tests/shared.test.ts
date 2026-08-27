import { describe, it, expect } from "vitest";
import { parseDuration, durationLabel } from "../src/commands/moderation/shared.js";

describe("parseDuration", () => {
  it("parses units", () => {
    expect(parseDuration("10m")).toBe(600n * 1000n);
    expect(parseDuration("1h")).toBe(3600n * 1000n);
    expect(parseDuration("2d")).toBe(172800n * 1000n);
  });
  it("rejects garbage", () => {
    expect(parseDuration("abc")).toBeNull();
    expect(parseDuration("10x")).toBeNull();
  });
});
