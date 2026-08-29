const DEFAULT_MODULES = {
    moderation: true, automod: true, logging: true, orders: true, welcome: true,
    tickets: true, leveling: true, economy: true, starboard: true, reactionRoles: true,
    analytics: true, achievements: true, automation: true, giveaways: true, suggestions: true, afk: true
};
const DEFAULT_AUTOMOD = {
    enabled: true,
    maxMentions: 5,
    spamThreshold: 5,
    spamWindowMs: 5000,
    inviteFilter: true,
    linkFilter: false,
    raidJoinThreshold: 10,
    raidWindowMs: 30000,
    newAccountFilter: true,
    newAccountMaxAgeDays: 7,
    emojiSpamThreshold: 10,
    zalgoFilter: true,
    scamUrlFilter: true,
    clusterSpam: true,
    clusterSpamThreshold: 3,
    clusterSpamWindowMs: 60000,
    autoLockdown: true,
};

const JSON_FIELDS = [
    "staffRoleIds", "moderatorRoleIds", "ignoredChannelIds", "ignoredRoleIds", "ignoredUserIds",
    "modules", "automod", "orders",
];

function parseField(key, val) {
    if (val == null)
        return key.endsWith("Ids") ? [] : {};
    try {
        return JSON.parse(val);
    }
    catch {
        return key.endsWith("Ids") ? [] : {};
    }
}

function serializeField(key, val) {
    return JSON.stringify(val ?? (key.endsWith("Ids") ? [] : {}));
}

export class SettingsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    parse(row) {
        if (!row)
            return row;
        const o = { ...row };
        for (const f of JSON_FIELDS)
            o[f] = parseField(f, row[f]);
        return o;
    }
    async get(guildId) {
        const existing = await this.prisma.guildConfig.findUnique({ where: { guildId } });
        if (existing)
            return this.parse(existing);
        return this.parse(await this.prisma.guildConfig.create({
            data: {
                guildId,
                modules: JSON.stringify(DEFAULT_MODULES),
                automod: JSON.stringify(DEFAULT_AUTOMOD),
                staffRoleIds: "[]",
                moderatorRoleIds: "[]",
                ignoredChannelIds: "[]",
                ignoredRoleIds: "[]",
                ignoredUserIds: "[]",
            },
        }));
    }
    async patch(guildId, data) {
        const next = { ...data };
        for (const f of JSON_FIELDS) {
            if (f in next)
                next[f] = serializeField(f, next[f]);
        }
        // Upsert to handle new guilds (P2025 fix) — creates with defaults if missing
        return this.prisma.guildConfig.upsert({
            where: { guildId },
            update: { ...next, updatedAt: new Date() },
            create: {
                guildId,
                logChannelId: next.logChannelId ?? null,
                modLogChannelId: next.modLogChannelId ?? null,
                welcomeChannelId: next.welcomeChannelId ?? null,
                goodbyeChannelId: next.goodbyeChannelId ?? null,
                prefix: next.prefix ?? "!",
                staffRoleIds: next.staffRoleIds ?? "[]",
                moderatorRoleIds: next.moderatorRoleIds ?? "[]",
                ignoredChannelIds: next.ignoredChannelIds ?? "[]",
                ignoredRoleIds: next.ignoredRoleIds ?? "[]",
                ignoredUserIds: next.ignoredUserIds ?? "[]",
                modules: next.modules ?? JSON.stringify(DEFAULT_MODULES),
                automod: next.automod ?? JSON.stringify(DEFAULT_AUTOMOD),
                orders: next.orders ?? "{}",
            },
        });
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
