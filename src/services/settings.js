const DEFAULT_MODULES = { moderation: true, automod: true, logging: true, orders: true, welcome: true };
const DEFAULT_AUTOMOD = {
    enabled: true,
    maxMentions: 5,
    spamThreshold: 5,
    spamWindowMs: 5000,
    inviteFilter: true,
    linkFilter: false,
    raidJoinThreshold: 10,
    raidWindowMs: 30000,
};
export class SettingsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async get(guildId) {
        const existing = await this.prisma.guildConfig.findUnique({ where: { guildId } });
        if (existing)
            return existing;
        return this.prisma.guildConfig.create({
            data: { guildId, modules: DEFAULT_MODULES, automod: DEFAULT_AUTOMOD },
        });
    }
    async patch(guildId, data) {
        return this.prisma.guildConfig.update({ where: { guildId }, data: { ...data, updatedAt: new Date() } });
    }
    async setModule(guildId, key, value) {
        const current = await this.get(guildId);
        const modules = { ...current.modules, [key]: value };
        return this.patch(guildId, { modules });
    }
    async isModuleEnabled(guildId, key) {
        const current = await this.get(guildId);
        const modules = current.modules;
        return modules[key] ?? true;
    }
}
//# sourceMappingURL=settings.js.map