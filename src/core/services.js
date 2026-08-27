import { PrismaClient } from "@prisma/client";
import { SettingsService } from "../services/settings.js";
import { CasesService } from "../services/cases.js";
import { LoggingService } from "../services/logging.js";
import { ModerationService } from "../services/moderation.js";
import { AutomodService } from "../services/automod.js";
import { OrderService } from "../services/orders.js";
import { UtilityService } from "../services/utility.js";
import { FortressService } from "../services/fortress.js";
export function createServices(client) {
    const prisma = new PrismaClient();
    // SQLite hardening for multi-guild (global bot) — WAL + busy timeout
    prisma.$executeRawUnsafe("PRAGMA journal_mode=WAL;").catch(() => {});
    prisma.$executeRawUnsafe("PRAGMA busy_timeout=5000;").catch(() => {});
    prisma.$executeRawUnsafe("PRAGMA synchronous=NORMAL;").catch(() => {});
    const settings = new SettingsService(prisma);
    const cases = new CasesService(prisma);
    const logging = new LoggingService(prisma, client);
    const moderation = new ModerationService(prisma, cases, logging);
    const automod = new AutomodService(prisma, client, settings, logging);
    const orders = new OrderService(prisma, client, settings);
    const fortress = new FortressService(prisma, client, settings, logging);
    const utility = new UtilityService(prisma, client);
    return { settings, cases, moderation, logging, automod, orders, fortress, utility };
}
export function isStaff(member, config) {
    if (member.permissions.has("Administrator") || member.permissions.has("ManageGuild"))
        return true;
    const roleIds = new Set(member.roles.cache.keys());
    if (!config)
        return false;
    if (config.staffRoleIds.some((id) => roleIds.has(id)))
        return true;
    if (config.moderatorRoleIds.some((id) => roleIds.has(id)))
        return true;
    return false;
}
export function isModerator(member, config) {
    if (member.permissions.has("BanMembers") || member.permissions.has("KickMembers") || member.permissions.has("ModerateMembers"))
        return true;
    if (!config)
        return false;
    const roleIds = new Set(member.roles.cache.keys());
    return config.moderatorRoleIds.some((id) => roleIds.has(id));
}
export function isIgnored(member, config) {
    if (!config)
        return false;
    const roleIds = new Set(member.roles.cache.keys());
    if (config.ignoredUserIds.includes(member.id))
        return true;
    if (config.ignoredRoleIds.some((id) => roleIds.has(id)))
        return true;
    return false;
}
//# sourceMappingURL=services.js.map