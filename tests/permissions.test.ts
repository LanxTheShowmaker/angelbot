import { describe, it, expect } from "vitest";
import { isStaff, isModerator, isIgnored } from "../src/core/services.js";

function member(opts: { perms?: string[]; roles?: string[]; configRoles?: string[] }) {
  const perms = new Set(opts.perms ?? []);
  return {
    permissions: { has: (p: string) => perms.has(p) },
    roles: { cache: { keys: () => new Set(opts.roles ?? []).keys() } },
  } as any;
}

const config = { staffRoleIds: ["s1"], moderatorRoleIds: ["m1"], ignoredRoleIds: ["i1"], ignoredUserIds: ["u9"] } as any;

describe("permissions", () => {
  it("staff includes administrators and manage guild", () => {
    expect(isStaff(member({ perms: ["Administrator"] }), config)).toBe(true);
    expect(isStaff(member({ perms: ["ManageGuild"] }), config)).toBe(true);
  });
  it("staff includes configured staff roles", () => {
    expect(isStaff(member({ roles: ["s1"] }), config)).toBe(true);
    expect(isStaff(member({ roles: ["x"] }), config)).toBe(false);
  });
  it("moderator requires mod permission or role", () => {
    expect(isModerator(member({ perms: ["BanMembers"] }), config)).toBe(true);
    expect(isModerator(member({ roles: ["m1"] }), config)).toBe(true);
    expect(isModerator(member({ roles: ["x"] }), config)).toBe(false);
  });
  it("ignored respects roles and users", () => {
    expect(isIgnored(member({ roles: ["i1"] }), config)).toBe(true);
    expect(isIgnored(member({} as any), config)).toBe(false);
  });
});
