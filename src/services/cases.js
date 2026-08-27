export class CasesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async nextCaseNumber(guildId) {
        const last = await this.prisma.case.findFirst({
            where: { guildId },
            orderBy: { caseNumber: "desc" },
            select: { caseNumber: true },
        });
        return (last?.caseNumber ?? 0) + 1;
    }
    async create(input) {
        for (let attempt = 0; attempt < 3; attempt++) {
            const caseNumber = await this.nextCaseNumber(input.guildId);
            try {
                return await this.prisma.case.create({ data: { ...input, caseNumber } });
            } catch (e) {
                if (e?.code === "P2002" && attempt < 2) continue;
                throw e;
            }
        }
    }
    async get(guildId, caseNumber) {
        return this.prisma.case.findUnique({ where: { guildId_caseNumber: { guildId, caseNumber } } });
    }
    async byTarget(guildId, targetId, limit = 25) {
        return this.prisma.case.findMany({ where: { guildId, targetId }, orderBy: { createdAt: "desc" }, take: limit });
    }
    async byModerator(guildId, moderatorId, limit = 25) {
        return this.prisma.case.findMany({ where: { guildId, moderatorId }, orderBy: { createdAt: "desc" }, take: limit });
    }
    async resolve(guildId, caseNumber, by) {
        const existing = await this.get(guildId, caseNumber);
        if (!existing || existing.resolved)
            return existing;
        return this.prisma.case.update({
            where: { guildId_caseNumber: { guildId, caseNumber } },
            data: { resolved: true, resolvedById: by.id, resolvedByTag: by.tag, resolvedAt: new Date() },
        });
    }
}
//# sourceMappingURL=cases.js.map