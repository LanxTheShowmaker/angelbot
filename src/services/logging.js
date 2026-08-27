import { embeds } from "../design/embeds.js";
import { logger } from "../core/logger.js";
export class LoggingService {
    prisma;
    client;
    constructor(prisma, client) {
        this.prisma = prisma;
        this.client = client;
    }
    async channel(guild, kind) {
        const config = await this.prisma.guildConfig.findUnique({ where: { guildId: guild.id } }).catch(() => null);
        const id = kind === "mod" ? config?.modLogChannelId : config?.logChannelId;
        if (!id)
            return null;
        const ch = guild.channels.cache.get(id);
        return ch ?? null;
    }
    async guild(guildId) {
        return this.client.guilds.cache.get(guildId) ?? (await this.client.guilds.fetch(guildId).catch(() => null));
    }
    async logCase(c) {
        const guild = await this.guild(c.guildId);
        if (!guild)
            return;
        const ch = await this.channel(guild, "mod");
        if (!ch)
            return;
        const embed = embeds.moderation(`Case #${c.caseNumber} · ${c.action}`, c.reason ?? "No reason provided", [
            { name: "Target", value: `${c.targetTag} (\`${c.targetId}\`)`, inline: true },
            { name: "Moderator", value: c.moderatorTag, inline: true },
            { name: "Duration", value: c.duration ?? "—", inline: true },
            { name: "Status", value: c.resolved ? `Resolved by ${c.resolvedByTag ?? "—"}` : "Active" },
        ]);
        await ch.send({ embeds: [embed] }).catch((e) => logger.error("logging", "send mod log failed", e));
    }
    async logMessage(guild, kind, data) {
        const ch = await this.channel(guild, "log");
        if (!ch)
            return;
        const embed = embeds.info(`Message ${kind === "delete" ? "deleted" : "edited"}`, data.content.slice(0, 1000) || "*(empty)*", [
            { name: "Author", value: data.authorTag, inline: true },
            { name: "Channel", value: data.channel, inline: true },
        ]);
        await ch.send({ embeds: [embed] }).catch(() => { });
    }
    async logMember(guild, kind, data) {
        const ch = await this.channel(guild, "log");
        if (!ch)
            return;
        const embed = embeds.info(kind === "join" ? "Member joined" : "Member left", data.tag, [{ name: "User", value: `<@${data.id}>`, inline: true }]);
        await ch.send({ embeds: [embed] }).catch(() => { });
    }
    async logRoleChange(guild, data) {
        const ch = await this.channel(guild, "log");
        if (!ch)
            return;
        const embed = embeds.info("Role change", data.tag, [
            { name: "Added", value: data.added || "—", inline: true },
            { name: "Removed", value: data.removed || "—", inline: true },
        ]);
        await ch.send({ embeds: [embed] }).catch(() => { });
    }
}
//# sourceMappingURL=logging.js.map