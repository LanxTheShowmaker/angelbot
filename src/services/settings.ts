import { PrismaClient, Prisma, type GuildConfig } from "@prisma/client";

const DEFAULT_MODULES = { moderation: true, automod: true, logging: true, tickets: true, welcome: true };
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
  constructor(private prisma: PrismaClient) {}

  async get(guildId: string): Promise<GuildConfig> {
    const existing = await this.prisma.guildConfig.findUnique({ where: { guildId } });
    if (existing) return existing;
    return this.prisma.guildConfig.create({
      data: { guildId, modules: DEFAULT_MODULES, automod: DEFAULT_AUTOMOD },
    });
  }

  async patch(guildId: string, data: Prisma.GuildConfigUpdateInput): Promise<GuildConfig> {
    return this.prisma.guildConfig.update({ where: { guildId }, data: { ...data, updatedAt: new Date() } });
  }

  async setModule(guildId: string, key: string, value: boolean): Promise<GuildConfig> {
    const current = await this.get(guildId);
    const modules = { ...(current.modules as Record<string, boolean>), [key]: value };
    return this.patch(guildId, { modules });
  }

  async isModuleEnabled(guildId: string, key: string): Promise<boolean> {
    const current = await this.get(guildId);
    const modules = current.modules as Record<string, boolean>;
    return modules[key] ?? true;
  }
}
