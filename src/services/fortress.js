import { PermissionFlagsBits, ChannelType } from "discord.js";
import { embeds, confirmationRow } from "../design/embeds.js";
import { logger } from "../core/logger.js";

function isLockable(channel) {
    if (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement)
        return true;
    if (channel.isThread?.())
        return true;
    return false;
}

export class FortressService {
    prisma;
    client;
    settings;
    logging;
    constructor(prisma, client, settings, logging) {
        this.prisma = prisma;
        this.client = client;
        this.settings = settings;
        this.logging = logging;
    }
    async getState(guildId) {
        const state = await this.prisma.fortressState.findUnique({ where: { guildId } }).catch(() => null);
        if (state?.snapshot)
            state.snapshot = JSON.parse(state.snapshot);
        return state;
    }
    async enable(guild, moderator) {
        const existing = await this.getState(guild.id);
        if (existing?.active)
            return { alreadyActive: true };
        const config = await this.settings.get(guild.id).catch(() => null);
        const roleIds = [...(config?.staffRoleIds ?? []), ...(config?.moderatorRoleIds ?? [])];
        const channels = [...guild.channels.cache.values()].filter(isLockable);
        const snapshot = { channels: [] };
        for (const channel of channels) {
            const entry = { id: channel.id, everyone: null, staffAdded: [] };
            const everyoneOverwrite = channel.permissionOverwrites.cache.get(guild.roles.everyone.id);
            if (everyoneOverwrite) {
                entry.everyone = {
                    allow: String(everyoneOverwrite.allow.bitfield),
                    deny: String(everyoneOverwrite.deny.bitfield),
                };
            }
            await channel.permissionOverwrites.edit(guild.roles.everyone.id, { SendMessages: false }).catch((e) => logger.error("fortress", "deny failed", e));
            for (const roleId of roleIds) {
                const existingOverwrite = channel.permissionOverwrites.cache.get(roleId);
                if (!existingOverwrite) {
                    await channel.permissionOverwrites.edit(roleId, { SendMessages: true }).catch((e) => logger.error("fortress", "staff allow failed", e));
                    entry.staffAdded.push(roleId);
                }
            }
            snapshot.channels.push(entry);
        }
        await this.prisma.fortressState.upsert({
            where: { guildId: guild.id },
            create: {
                guildId: guild.id,
                active: true,
                enabledById: moderator?.id ?? null,
                enabledByTag: moderator?.user?.tag ?? "Automated",
                startedAt: new Date(),
                snapshot: JSON.stringify(snapshot),
            },
            update: {
                active: true,
                enabledById: moderator?.id ?? null,
                enabledByTag: moderator?.user?.tag ?? "Automated",
                startedAt: new Date(),
                snapshot: JSON.stringify(snapshot),
            },
        });
        await this.announce(guild, `**Fortress mode enabled** by ${moderator?.user?.tag ?? "Automated"}. Channels are locked; only staff can post.`);
        return { alreadyActive: false };
    }
    async disable(guild) {
        const state = await this.getState(guild.id);
        if (!state?.active)
            return { wasActive: false };
        const snapshot = state.snapshot ?? { channels: [] };
        for (const entry of snapshot.channels ?? []) {
            const channel = guild.channels.cache.get(entry.id) ?? (await guild.channels.fetch(entry.id).catch(() => null));
            if (!channel)
                continue;
            if (entry.everyone === null) {
                await channel.permissionOverwrites.delete(guild.roles.everyone.id).catch(() => { });
            }
            else {
                await channel.permissionOverwrites.edit(guild.roles.everyone.id, {
                    allow: BigInt(entry.everyone.allow ?? "0n"),
                    deny: BigInt(entry.everyone.deny ?? "0n"),
                }).catch((e) => logger.error("fortress", "restore failed", e));
            }
            for (const roleId of entry.staffAdded ?? []) {
                await channel.permissionOverwrites.delete(roleId).catch(() => { });
            }
        }
        await this.prisma.fortressState.update({ where: { guildId: guild.id }, data: { active: false, startedAt: null } });
        await this.announce(guild, "**Fortress mode stood down.** Channels restored to normal permissions.");
        return { wasActive: true };
    }
    async autoEnable(guild, config) {
        const state = await this.getState(guild.id);
        if (state?.active)
            return;
        const am = config?.automod ?? {};
        if (am.autoLockdown === false)
            return;
        await this.enable(guild, null);
    }
    async announce(guild, text) {
        try {
            const id = (await this.settings.get(guild.id).catch(() => null))?.modLogChannelId;
            const ch = id ? guild.channels.cache.get(id) : null;
            if (ch)
                await ch.send({ embeds: [embeds.warn("Fortress", text)] }).catch(() => { });
        }
        catch (e) {
            logger.error("fortress", "announce failed", e);
        }
    }
    statusEmbed(guild, state) {
        if (!state?.active) {
            return embeds.info("Fortress status", "Fortress mode is currently **disarmed**. Channels are open.");
        }
        return embeds.warn("Fortress status", "Fortress mode is **active**. Posting is limited to staff.", [
            { name: "Enabled by", value: state.enabledByTag ?? "Unknown", inline: true },
            { name: "Since", value: state.startedAt ? `<t:${Math.floor(state.startedAt.getTime() / 1000)}:R>` : "Unknown", inline: true },
            { name: "Locked channels", value: `${state.snapshot?.channels?.length ?? 0}`, inline: true },
        ]);
    }
}
