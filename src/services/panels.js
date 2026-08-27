import { ChannelType, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { embeds } from "../design/embeds.js";
import { Theme } from "../design/theme.js";
import { logger } from "../core/logger.js";

export const PANEL_TYPES = {
    ORDER: "ORDER",
    ASSISTANCE: "ASSISTANCE",
    REGULATIONS: "REGULATIONS",
    DASHBOARD: "DASHBOARD",
};

const PANEL_META = {
    [PANEL_TYPES.ORDER]: { label: "Orders", emoji: "🛒", defaultChannel: "orders", defaultTitle: "Place Your Order", color: Theme.accent },
    [PANEL_TYPES.ASSISTANCE]: { label: "Assistance", emoji: "🛟", defaultChannel: "support", defaultTitle: "A.N.G.E.L. Assistance Requests", color: Theme.accent },
    [PANEL_TYPES.REGULATIONS]: { label: "Regulations", emoji: "📜", defaultChannel: "rules", defaultTitle: "A.N.G.E.L. Regulations", color: Theme.accent },
    [PANEL_TYPES.DASHBOARD]: { label: "Dashboard", emoji: "📊", defaultChannel: "dashboard", defaultTitle: "A.N.G.E.L. Dashboard", color: Theme.accent },
};

const DEFAULT_PANELS = {
    [PANEL_TYPES.ORDER]: {
        title: "🪽 Place Your Order",
        description: "Welcome to **A.N.G.E.L.** — choose a service from the dropdown to open a private order ticket.",
        bannerUrl: null,
        thumbnailUrl: null,
        embedColor: null,
        footerText: "A.N.G.E.L. • Select an option below to begin",
        footerIcon: null,
        sections: [
            { title: "What Happens Next", content: "1. Choose a service from the menu\n2. Fill the brief (references, budget, deadline)\n3. A designer will claim your ticket and start" },
            { title: "📌 Note", content: "Provide clear references, respect payment rules, and follow staff instructions. One ticket per request." },
        ],
        dropdownPlaceholder: "Choose a service to order",
    },
    [PANEL_TYPES.ASSISTANCE]: {
        title: "🛟 A.N.G.E.L. Assistance Requests",
        description: "Need help? Open a private support ticket and our staff will assist you.",
        bannerUrl: null,
        sections: [
            { title: "Submitting a Request", content: "Clearly explain your issue, provide relevant proof/screenshots, and include your user ID if reporting." },
            { title: "Review Process", content: "Staff will review your request within 24h and respond in the ticket." },
        ],
        dropdownPlaceholder: "Choose a request",
    },
    [PANEL_TYPES.REGULATIONS]: {
        title: "📜 A.N.G.E.L. Regulations",
        description: "Please read and follow these server rules.",
        bannerUrl: null,
        subtitle: null,
        sections: [
            { title: "Essentials", content: "• Remain respectful and professional\n• Follow staff instructions\n• Do not impersonate others\n• Do not scam users\n• Do not interfere with another person's transaction\n• Follow Discord Terms of Service" },
        ],
        footerText: "A.N.G.E.L. • Regulations are enforced by staff",
    },
    [PANEL_TYPES.DASHBOARD]: {
        title: "📊 A.N.G.E.L. Dashboard",
        description: "Welcome to our community — your hub for services, staff, and info.",
        bannerUrl: null,
        sections: [
            { title: "Community", content: "We provide design, development, and support services." },
            { title: "Purpose", content: "Open a ticket via the Orders or Assistance panels to get started." },
        ],
        dropdownPlaceholder: "More Information",
        dropdownOptions: [
            { label: "About", value: "about", emoji: "📖", description: "About the server" },
            { label: "Services", value: "services", emoji: "🛒", description: "Our services" },
            { label: "Staff", value: "staff", emoji: "👥", description: "Meet the team" },
            { label: "Links", value: "links", emoji: "🔗", description: "Important links" },
            { label: "Regulations", value: "regulations", emoji: "📜", description: "Server rules" },
        ],
    },
};

export class PanelService {
    prisma;
    client;
    constructor(prisma, client) {
        this.prisma = prisma;
        this.client = client;
    }

    async get(guildId, panelType) {
        let panel = await this.prisma.panel.findUnique({ where: { guildId_panelType: { guildId, panelType } } }).catch(() => null);
        if (!panel) {
            const defaults = DEFAULT_PANELS[panelType] ?? {};
            panel = await this.prisma.panel.create({
                data: {
                    guildId,
                    panelType,
                    title: defaults.title ?? PANEL_META[panelType]?.defaultTitle ?? panelType,
                    description: defaults.description ?? "",
                    bannerUrl: defaults.bannerUrl ?? null,
                    embedColor: defaults.embedColor ?? null,
                    footerText: defaults.footerText ?? null,
                    enabled: false,
                    config: JSON.stringify(defaults),
                },
            }).catch(() => null);
            if (!panel) panel = await this.prisma.panel.findUnique({ where: { guildId_panelType: { guildId, panelType } } }).catch(() => null);
        }
        if (panel) {
            try { panel.parsedConfig = JSON.parse(panel.config ?? "{}"); } catch { panel.parsedConfig = {}; }
        }
        return panel;
    }

    async list(guildId) {
        const panels = await this.prisma.panel.findMany({ where: { guildId } }).catch(() => []);
        for (const p of panels) try { p.parsedConfig = JSON.parse(p.config ?? "{}"); } catch { p.parsedConfig = {}; }
        // Ensure all types exist
        for (const t of Object.values(PANEL_TYPES)) if (!panels.find((p) => p.panelType === t)) {
            const created = await this.get(guildId, t);
            if (created) panels.push(created);
        }
        return panels;
    }

    async upsert(guildId, panelType, data) {
        const existing = await this.prisma.panel.findUnique({ where: { guildId_panelType: { guildId, panelType } } }).catch(() => null);
        const configStr = data.config ? (typeof data.config === "string" ? data.config : JSON.stringify(data.config)) : undefined;
        const payload = { ...data };
        if (configStr) payload.config = configStr;
        delete payload.guildId; delete payload.panelType;
        if (existing) return this.prisma.panel.update({ where: { guildId_panelType: { guildId, panelType } }, data: payload });
        return this.prisma.panel.create({ data: { guildId, panelType, ...payload } });
    }

    // Smart discovery
    normalize(name) { return name.toLowerCase().trim().replace(/[_]+/g, "-").replace(/\s+/g, "-").replace(/-+/g, "-"); }
    findChannel(guild, candidates) {
        const norms = candidates.map((c) => this.normalize(c));
        for (const cand of norms) for (const ch of guild.channels.cache.values()) if (ch.type === ChannelType.GuildText && this.normalize(ch.name) === cand) return ch;
        return null;
    }
    findCategory(guild, candidates) {
        const norms = candidates.map((c) => c.toLowerCase().trim());
        for (const cand of norms) for (const ch of guild.channels.cache.values()) if (ch.type === ChannelType.GuildCategory && ch.name.toLowerCase().trim() === cand) return ch;
        return null;
    }

    // Renderer
    buildPanelEmbed(panel, ticketTypes = []) {
        const cfg = panel.parsedConfig ?? (panel.config ? JSON.parse(panel.config) : {}) ?? {};
        const title = panel.title ?? cfg.title ?? PANEL_META[panel.panelType]?.defaultTitle ?? panel.panelType;
        const description = panel.description ?? cfg.description ?? "";
        const color = panel.embedColor ?? cfg.embedColor ?? Theme.accent;
        const sections = cfg.sections ?? [];
        const fields = sections.map((s) => ({ name: s.title ?? "Section", value: s.content ?? s.rules?.join("\n") ?? "—" })).slice(0, 25);
        // Truncate fields to 1024
        for (const f of fields) if (f.value.length > 1024) f.value = f.value.slice(0, 1021) + "...";
        const embed = embeds.info(title, description || undefined, fields.length ? fields : undefined);
        if (color) embed.setColor(color);
        if (panel.bannerUrl) embed.setImage(panel.bannerUrl);
        else if (cfg.bannerUrl) embed.setImage(cfg.bannerUrl);
        if (panel.thumbnailUrl || cfg.thumbnailUrl) embed.setThumbnail(panel.thumbnailUrl ?? cfg.thumbnailUrl);
        if (panel.footerText || cfg.footerText) embed.setFooter({ text: panel.footerText ?? cfg.footerText, iconURL: panel.footerIcon ?? cfg.footerIcon ?? undefined });
        return embed;
    }

    // Fallback defaults so dropdown always shows even before any TicketType rows exist
    getFallbackTicketTypes(panelType) {
        if (panelType === PANEL_TYPES.ORDER) return [
            { key: "uniform", displayName: "Uniform", description: "Apparel / clothing designs", emoji: "👕", enabled: true },
            { key: "livery", displayName: "Livery", description: "Vehicle wraps & liveries", emoji: "🚗", enabled: true },
            { key: "gfx", displayName: "Graphics / GFX", description: "Banners, logos, gfx", emoji: "🎨", enabled: true },
            { key: "botdev", displayName: "Bot Development", description: "Custom bot / tooling", emoji: "💻", enabled: true },
            { key: "other", displayName: "Other", description: "Something else", emoji: "📦", enabled: true },
        ];
        if (panelType === PANEL_TYPES.ASSISTANCE) return [
            { key: "general", displayName: "General Support", description: "General help", emoji: "🛠️", enabled: true },
            { key: "staff", displayName: "Staff Assistance", description: "Contact staff", emoji: "👤", enabled: true },
            { key: "designer_app", displayName: "Designer Application", description: "Apply as designer", emoji: "🎨", enabled: true },
            { key: "report_designer", displayName: "Report a Designer", description: "Report issues", emoji: "⚠️", enabled: true },
            { key: "report_member", displayName: "Report a Member", description: "Report a user", emoji: "🚨", enabled: true },
            { key: "other", displayName: "Other", description: "Other request", emoji: "❓", enabled: true },
        ];
        return [];
    }

    async ensureDefaultTicketTypes(guildId, panelType) {
        const existing = await this.prisma.ticketType.findMany({ where: { guildId, panelType } }).catch(() => []);
        if (existing.length) return existing;
        const fallbacks = this.getFallbackTicketTypes(panelType);
        if (!fallbacks.length) return [];
        const created = [];
        for (const f of fallbacks) {
            try {
                const row = await this.prisma.ticketType.create({ data: { guildId, panelType, key: f.key, displayName: f.displayName, description: f.description, emoji: f.emoji, enabled: true, channelPrefix: f.key.slice(0,10) } });
                created.push(row);
            } catch {}
        }
        return created.length ? created : fallbacks;
    }

    buildPanelComponents(panel, ticketTypes = []) {
        const cfg = panel.parsedConfig ?? {};
        const rows = [];
        // Primary dropdown for ticket types (if any) — always show fallback so panel never appears without dropdown
        if ([PANEL_TYPES.ORDER, PANEL_TYPES.ASSISTANCE].includes(panel.panelType)) {
            let types = ticketTypes.filter((t) => t.enabled);
            if (!types.length) types = this.getFallbackTicketTypes(panel.panelType);
            const options = types.slice(0, 25).map((t) => ({
                label: String(t.displayName).slice(0, 100),
                value: String(t.key).slice(0, 100),
                description: (t.description ?? "").slice(0, 100) || undefined,
                emoji: t.emoji ?? undefined,
            }));
            if (options.length) {
                const placeholder = cfg.dropdownPlaceholder ?? (panel.panelType === PANEL_TYPES.ORDER ? "Choose a service to order" : "Choose a request");
                const menu = new StringSelectMenuBuilder().setCustomId(`angel:panel:select:${panel.panelType}`).setPlaceholder(placeholder.slice(0,150)).addOptions(options);
                rows.push(new ActionRowBuilder().addComponents(menu));
            }
        }
        // Dashboard dropdown
        if (panel.panelType === PANEL_TYPES.DASHBOARD) {
            const opts = cfg.dropdownOptions ?? DEFAULT_PANELS.DASHBOARD.dropdownOptions ?? [];
            if (opts.length) {
                const menu = new StringSelectMenuBuilder().setCustomId(`angel:panel:dashboard:${panel.guildId}`).setPlaceholder(cfg.dropdownPlaceholder ?? "More Information").addOptions(opts.slice(0,25).map((o)=>({label:o.label.slice(0,100), value:o.value.slice(0,100), emoji:o.emoji??undefined, description:o.description?.slice(0,100)})));
                rows.push(new ActionRowBuilder().addComponents(menu));
            }
        }
        // Regulations may have no dropdown
        return rows;
    }

    // Banner handling per panel
    async setBanner(guild, panelType, url, channelId = null, messageId = null) {
        return this.upsert(guild.id, panelType, { bannerUrl: url, bannerChannelId: channelId, bannerMessageId: messageId });
    }
    async removeBanner(guild, panelType) {
        return this.upsert(guild.id, panelType, { bannerUrl: null, bannerChannelId: null, bannerMessageId: null });
    }
    async validateBanner(guild, panel) {
        if (!panel.bannerUrl) return { ok: true, status: "none" };
        if (panel.bannerChannelId && panel.bannerMessageId) {
            const ch = guild.channels.cache.get(panel.bannerChannelId) ?? await guild.channels.fetch(panel.bannerChannelId).catch(()=>null);
            if (!ch) return { ok:false, status:"missing_channel" };
            const msg = await ch.messages.fetch(panel.bannerMessageId).catch(()=>null);
            if (!msg) return { ok:false, status:"missing_message" };
        }
        try {
            const res = await fetch(panel.bannerUrl, { method:"HEAD" }).catch(()=>null);
            if (res && res.status===404) return { ok:false, status:"404" };
        } catch {}
        return { ok:true, status:"ok" };
    }

    // Deployment
    async deploy(guild, panelType) {
        const panel = await this.get(guild.id, panelType);
        if (!panel) throw new Error("Panel not found");
        // Find channel
        let channel = null;
        if (panel.channelId) channel = guild.channels.cache.get(panel.channelId) ?? await guild.channels.fetch(panel.channelId).catch(()=>null);
        if (!channel) {
            // Try discovery by panel meta default names
            const candidates = panelType===PANEL_TYPES.ORDER? ["orders","design-orders","commissions"] : panelType===PANEL_TYPES.ASSISTANCE? ["support","assistance","help"] : panelType===PANEL_TYPES.REGULATIONS? ["rules","regulations","info"] : ["dashboard","info"];
            channel = this.findChannel(guild, candidates);
            if (!channel && panel.channelId) return { ok:false, reason:"Configured channel deleted" };
            if (!channel) return { ok:false, reason:"No panel channel configured — set one in setup" };
        }
        if (channel.type !== ChannelType.GuildText) return { ok:false, reason:"Panel channel must be text" };
        const me = guild.members.me;
        if (!me?.permissionsIn(channel).has(PermissionFlagsBits.SendMessages) || !me.permissionsIn(channel).has(PermissionFlagsBits.EmbedLinks)) return { ok:false, reason:"Missing SendMessages/EmbedLinks in " + channel.name };

        // Build embed/components — seed defaults if missing so dropdown always appears
        let ticketTypes = [];
        if ([PANEL_TYPES.ORDER, PANEL_TYPES.ASSISTANCE].includes(panelType)) {
            ticketTypes = await this.prisma.ticketType.findMany({ where:{ guildId:guild.id, panelType } }).catch(()=>[]);
            if (!ticketTypes.length) {
                ticketTypes = await this.ensureDefaultTicketTypes(guild.id, panelType);
            }
        }
        const embed = this.buildPanelEmbed(panel, ticketTypes);
        const components = this.buildPanelComponents(panel, ticketTypes);

        // Banner failure handling: if banner 404, remove image but don't crash
        const bannerCheck = await this.validateBanner(guild, panel);
        if (!bannerCheck.ok) {
            embed.setImage(null);
        }

        // Try edit existing
        let msg = null;
        if (panel.messageId) msg = await channel.messages.fetch(panel.messageId).catch(()=>null);
        if (msg) {
            try {
                await msg.edit({ embeds:[embed], components });
                return { ok:true, action:"updated", channelId: channel.id, messageId: msg.id };
            } catch (e) {
                logger.error("panels","edit failed", e);
                // Fall through to create
            }
        }
        try {
            const sent = await channel.send({ embeds:[embed], components });
            await this.upsert(guild.id, panelType, { channelId: channel.id, messageId: sent.id, enabled:true });
            return { ok:true, action:"created", channelId: channel.id, messageId: sent.id };
        } catch (e) {
            logger.error("panels","send failed", e);
            return { ok:false, reason: String(e.message).slice(0,200) };
        }
    }

    async deployAll(guild) {
        const results = {};
        for (const t of Object.values(PANEL_TYPES)) {
            const panel = await this.get(guild.id, t);
            if (!panel.enabled) { results[t] = { ok:true, action:"skipped", reason:"disabled" }; continue; }
            results[t] = await this.deploy(guild, t);
        }
        return results;
    }

    async repair(guild) {
        const report = [];
        for (const t of Object.values(PANEL_TYPES)) {
            const panel = await this.get(guild.id, t);
            // Channel deleted?
            if (panel.channelId) {
                const ch = guild.channels.cache.get(panel.channelId) ?? await guild.channels.fetch(panel.channelId).catch(()=>null);
                if (!ch) {
                    const found = this.findChannel(guild, [PANEL_META[t].defaultChannel, t.toLowerCase()]);
                    if (found) {
                        await this.upsert(guild.id, t, { channelId: found.id });
                        report.push(`${t}: channel repaired → #${found.name}`);
                    } else report.push(`${t}: channel missing ${panel.channelId}`);
                }
            }
            // Message deleted?
            if (panel.messageId && panel.channelId) {
                const ch = guild.channels.cache.get(panel.channelId) ?? await guild.channels.fetch(panel.channelId).catch(()=>null);
                if (ch) {
                    const msg = await ch.messages.fetch(panel.messageId).catch(()=>null);
                    if (!msg) report.push(`${t}: message missing — will recreate on deploy`);
                }
            }
            // Banner missing?
            const bv = await this.validateBanner(guild, panel);
            if (!bv.ok) report.push(`${t}: banner unavailable (${bv.status})`);
        }
        return report;
    }
}
