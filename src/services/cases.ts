import { PrismaClient, type Case } from "@prisma/client";

export type CaseAction = "BAN" | "KICK" | "TIMEOUT" | "WARN" | "NOTE" | "UNBAN";

export interface CaseInput {
  guildId: string;
  targetId: string;
  targetTag: string;
  moderatorId: string;
  moderatorTag: string;
  action: CaseAction;
  reason?: string;
  duration?: string;
  durationMs?: bigint;
  metadata?: any;
}

export class CasesService {
  constructor(private prisma: PrismaClient) {}

  private async nextCaseNumber(guildId: string): Promise<number> {
    const last = await this.prisma.case.findFirst({
      where: { guildId },
      orderBy: { caseNumber: "desc" },
      select: { caseNumber: true },
    });
    return (last?.caseNumber ?? 0) + 1;
  }

  async create(input: CaseInput): Promise<Case> {
    const caseNumber = await this.nextCaseNumber(input.guildId);
    return this.prisma.case.create({ data: { ...input, caseNumber } });
  }

  async get(guildId: string, caseNumber: number): Promise<Case | null> {
    return this.prisma.case.findUnique({ where: { guildId_caseNumber: { guildId, caseNumber } } });
  }

  async byTarget(guildId: string, targetId: string, limit = 25): Promise<Case[]> {
    return this.prisma.case.findMany({ where: { guildId, targetId }, orderBy: { createdAt: "desc" }, take: limit });
  }

  async byModerator(guildId: string, moderatorId: string, limit = 25): Promise<Case[]> {
    return this.prisma.case.findMany({ where: { guildId, moderatorId }, orderBy: { createdAt: "desc" }, take: limit });
  }

  async resolve(guildId: string, caseNumber: number, by: { id: string; tag: string }): Promise<Case | null> {
    const existing = await this.get(guildId, caseNumber);
    if (!existing || existing.resolved) return existing;
    return this.prisma.case.update({
      where: { guildId_caseNumber: { guildId, caseNumber } },
      data: { resolved: true, resolvedById: by.id, resolvedByTag: by.tag, resolvedAt: new Date() },
    });
  }
}
