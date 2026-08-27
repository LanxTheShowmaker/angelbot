import { GuildMember } from "discord.js";
import { PrismaClient, type GuildConfig } from "@prisma/client";
import { SettingsService } from "../services/settings.js";
import { CasesService } from "../services/cases.js";
import { LoggingService } from "../services/logging.js";
import { ModerationService } from "../services/moderation.js";
import { AutomodService } from "../services/automod.js";
import { TicketService } from "../services/tickets.js";
import { UtilityService } from "../services/utility.js";
import type { Client } from "discord.js";

export interface Services {
  settings: SettingsService;
  cases: CasesService;
  moderation: ModerationService;
  logging: LoggingService;
  automod: AutomodService;
  tickets: TicketService;
  utility: UtilityService;
}

export function createServices(client: Client): Services {
  const prisma = new PrismaClient();
  const settings = new SettingsService(prisma);
  const cases = new CasesService(prisma);
  const logging = new LoggingService(prisma, client);
  const moderation = new ModerationService(prisma, cases, logging);
  const automod = new AutomodService(prisma, client, settings, logging);
  const tickets = new TicketService(prisma, client, settings);
  const utility = new UtilityService(prisma, client);
  return { settings, cases, moderation, logging, automod, tickets, utility };
}

export function isStaff(member: GuildMember, config: GuildConfig | null): boolean {
  if (member.permissions.has("Administrator") || member.permissions.has("ManageGuild")) return true;
  const roleIds = new Set(member.roles.cache.keys());
  if (!config) return false;
  if (config.staffRoleIds.some((id) => roleIds.has(id))) return true;
  if (config.moderatorRoleIds.some((id) => roleIds.has(id))) return true;
  return false;
}

export function isModerator(member: GuildMember, config: GuildConfig | null): boolean {
  if (member.permissions.has("BanMembers") || member.permissions.has("KickMembers") || member.permissions.has("ModerateMembers")) return true;
  if (!config) return false;
  const roleIds = new Set(member.roles.cache.keys());
  return config.moderatorRoleIds.some((id) => roleIds.has(id));
}

export function isIgnored(member: GuildMember, config: GuildConfig | null): boolean {
  if (!config) return false;
  const roleIds = new Set(member.roles.cache.keys());
  if (config.ignoredUserIds.includes(member.id)) return true;
  if (config.ignoredRoleIds.some((id) => roleIds.has(id))) return true;
  return false;
}
