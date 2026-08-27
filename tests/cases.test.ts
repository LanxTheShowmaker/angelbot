import { describe, it, expect } from "vitest";
import { CasesService } from "../src/services/cases.js";

function fakePrisma() {
  const store: any[] = [];
  return {
    case: {
      findFirst: async ({ where }: any) => store.filter((c) => c.guildId === where.guildId).sort((a: any, b: any) => b.caseNumber - a.caseNumber)[0] ?? null,
      findUnique: async ({ where }: any) => store.find((c) => c.guildId === where.guildId_caseNumber.guildId && c.caseNumber === where.guildId_caseNumber.caseNumber) ?? null,
      create: async ({ data }: any) => {
        const row = { id: store.length + 1, ...data };
        store.push(row);
        return row;
      },
      update: async ({ where, data }: any) => {
        const row = store.find((c) => c.guildId === where.guildId_caseNumber.guildId && c.caseNumber === where.guildId_caseNumber.caseNumber);
        Object.assign(row, data);
        return row;
      },
    },
  } as any;
}

describe("CasesService", () => {
  it("assigns sequential case numbers per guild", async () => {
    const svc = new CasesService(fakePrisma());
    const a = await svc.create({ guildId: "g1", targetId: "u1", targetTag: "A", moderatorId: "m", moderatorTag: "M", action: "WARN", reason: "r" });
    const b = await svc.create({ guildId: "g1", targetId: "u2", targetTag: "B", moderatorId: "m", moderatorTag: "M", action: "KICK" });
    expect(a.caseNumber).toBe(1);
    expect(b.caseNumber).toBe(2);
  });

  it("keeps case numbers isolated between guilds", async () => {
    const svc = new CasesService(fakePrisma());
    const a = await svc.create({ guildId: "g1", targetId: "u1", targetTag: "A", moderatorId: "m", moderatorTag: "M", action: "WARN" });
    const b = await svc.create({ guildId: "g2", targetId: "u1", targetTag: "A", moderatorId: "m", moderatorTag: "M", action: "WARN" });
    expect(a.caseNumber).toBe(1);
    expect(b.caseNumber).toBe(1);
  });

  it("resolves a case and is idempotent", async () => {
    const svc = new CasesService(fakePrisma());
    const c = await svc.create({ guildId: "g1", targetId: "u1", targetTag: "A", moderatorId: "m", moderatorTag: "M", action: "WARN" });
    const resolved = await svc.resolve("g1", c.caseNumber, { id: "mod", tag: "mod#1" });
    expect(resolved?.resolved).toBe(true);
    const again = await svc.resolve("g1", c.caseNumber, { id: "mod", tag: "mod#1" });
    expect(again?.resolved).toBe(true);
  });

  it("returns null for unknown case", async () => {
    const svc = new CasesService(fakePrisma());
    expect(await svc.get("g1", 999)).toBeNull();
  });
});
