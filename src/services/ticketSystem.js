import { ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, AttachmentBuilder, EmbedBuilder } from "discord.js";
import { embeds, confirmationRow } from "../design/embeds.js";
import { logger } from "../core/logger.js";
import { Theme } from "../design/theme.js";

const STATUS = {
    OPEN: "OPEN",
    CLAIMED: "CLAIMED",
    WAITING: "WAITING",
    IN_PROGRESS: "IN_PROGRESS",
    COMPLETED: "COMPLETED",
    CLOSED: "CLOSED",
};
const PRIORITY = {
    LOW: "LOW",
    NORMAL: "NORMAL",
    HIGH: "HIGH",
    URGENT: "URGENT",
};

export class TicketSystemService {
    prisma;
    client;
    settings;
    logging;
    cooldowns = new Map(); // `${guildId}:${userId}:${typeKey}` -> timestamp
    autoCloseTimers = new Map();
    constructor(prisma, client, settings, logging) {
        this.prisma = prisma;
        this.client = client;
        this.settings = settings;
        this.logging = logging;
        this.registerHandlers();
        // Auto-close interval (check every minute)
        setInterval(() => this.checkAutoClose().catch((e) => logger.error("tickets", "autoclose failed", e)), 60_000);
    }

    registerHandlers() {
        const c = this.client.components;
        // Panel dropdown
        c.set("angel:panel:select", async (i) => this.handlePanelSelect(i));
        c.set("angel:panel:dashboard", async (i) => this.handleDashboardSelect(i));
        // Ticket modals
        c.set("angel:ticket:questions", async (i) => this.handleQuestionModal(i));
        // Ticket controls
        c.set("angel:ticket:claim", async (i) => this.handleClaim(i));
        c.set("angel:ticket:unclaim", async (i) => this.handleUnclaim(i));
        c.set("angel:ticket:status", async (i) => this.handleStatusSelect(i));
        c.set("angel:ticket:priority", async (i) => this.handlePrioritySelect(i));
        c.set("angel:ticket:add", async (i) => this.handleAddUser(i));
        c.set("angel:ticket:remove", async (i) => this.handleRemoveUser(i));
        c.set("angel:ticket:info", async (i) => this.handleInfo(i));
        c.set("angel:ticket:close", async (i) => this.handleClose(i));
        c.set("angel:ticket:transcript", async (i) => this.handleTranscript(i));
    }

    sanitizeName(name) {
        let s = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        if (!s) s = "user";
        return s.slice(0, 20);
    }
    async uniqueChannelName(guild, base, prefix) {
        const fullBase = `${prefix}-${base}`.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 90);
        let name = fullBase;
        let n = 1;
        while (guild.channels.cache.some((c) => c.name === name)) {
            name = `${fullBase}-${n}`.slice(0, 100);
            n++;
        }
        return name;
    }

    async findCategory(guild, type) {
        if (type?.categoryId) {
            const cat = guild.channels.cache.get(type.categoryId) ?? await guild.channels.fetch(type.categoryId).catch(() => null);
            if (cat && cat.type === ChannelType.GuildCategory) return cat;
        }
        // Discovery
        const candidates = type?.panelType === "ORDER" ? ["orders", "design-orders", "tickets"] : ["support", "assistance", "tickets"];
        for (const cand of candidates) for (const ch of guild.channels.cache.values()) if (ch.type === ChannelType.GuildCategory && ch.name.toLowerCase() === cand) return ch;
        return null;
    }

    async buildOverwrites(guild, openerId, type) {
        const cfg = await this.client.services.settings.get(guild.id).catch(() => null);
        const staffIds = (() => { try { return JSON.parse(type.staffRoleIds ?? "[]"); } catch { return []; } })();
        const modIds = (() => { try { return JSON.parse(type.moderatorRoleIds ?? "[]"); } catch { return []; } })();
        // Fallback to global staff/mod if type has none
        const globalStaff = cfg?.staffRoleIds ?? [];
        const effectiveStaff = staffIds.length ? staffIds : globalStaff;
        const effectiveMod = modIds.length ? modIds : cfg?.moderatorRoleIds ?? [];
        const overwrites = [
            { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: openerId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] },
        ];
        for (const id of [...new Set([...effectiveStaff, ...effectiveMod])]) overwrites.push({ id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] });
        return overwrites;
    }

    // Anti-duplicate + cooldowns
    async canOpen(guild, userId, type) {
        const cfg = await this.prisma.ticketType.findUnique({ where: { guildId_key: { guildId: guild.id, key: type.key } } }).catch(()=>null) ?? type;
        const open = await this.prisma.ticket.count({ where: { guildId: guild.id, openerId: userId, status: { not: STATUS.CLOSED } } }).catch(()=>0);
        const maxOpen = cfg.maxOpen ?? 1;
        if (open >= maxOpen) return { ok: false, reason: `You already have ${open} open ticket(s) (max ${maxOpen}).` };
        // Per-type cooldown
        if (cfg.cooldown > 0) {
            const key = `${guild.id}:${userId}:${cfg.key}`;
            const last = this.cooldowns.get(key) ?? 0;
            const now = Date.now();
            if (now - last < cfg.cooldown * 1000) {
                const remain = Math.ceil((cfg.cooldown * 1000 - (now - last)) / 1000);
                return { ok: false, reason: `Cooldown: wait ${remain}s before opening another ${cfg.displayName} ticket.` };
            }
        }
        // Check existing open ticket for same type (anti-duplicate per type)
        const sameTypeOpen = await this.prisma.ticket.findFirst({ where: { guildId: guild.id, openerId: userId, typeId: cfg.id, status: { not: STATUS.CLOSED } } }).catch(()=>null);
        if (sameTypeOpen) {
            const ch = guild.channels.cache.get(sameTypeOpen.channelId);
            return { ok: false, reason: `You already have an open ${cfg.displayName} ticket: ${ch ? `<#${ch.id}>` : sameTypeOpen.channelId}` };
        }
        return { ok: true };
    }

    async handlePanelSelect(interaction) {
        if (!interaction.isStringSelectMenu()) return;
        const panelType = interaction.customId.split(":")[3]; // angel:panel:select:ORDER
        const key = interaction.values[0];
        const guild = interaction.guild;
        const member = interaction.member;

        // Access control: blacklist / role restrictions
        const cfg = await this.client.services.settings.get(guild.id).catch(()=>null);
        if (cfg?.ignoredUserIds?.includes(member.id)) {
            return interaction.reply({ embeds: [embeds.error("Access denied", "You are not allowed to open tickets.")], flags: 64 }).catch(()=>{});
        }

        const type = await this.prisma.ticketType.findUnique({ where: { guildId_key: { guildId: guild.id, key } } }).catch(()=>null);
        if (!type || !type.enabled) return interaction.reply({ embeds: [embeds.error("Not found", "This ticket type is not available.")], flags: 64 }).catch(()=>{});

        const can = await this.canOpen(guild, member.id, type);
        if (!can.ok) return interaction.reply({ embeds: [embeds.warn("Cannot open ticket", can.reason)], flags: 64 }).catch(()=>{});

        // Check questions
        let questions = [];
        try { questions = JSON.parse(type.questions ?? "[]"); } catch {}
        if (questions.length) {
            // Build modal
            const modal = new ModalBuilder().setCustomId(`angel:ticket:questions:${type.key}`).setTitle(type.displayName.slice(0,45));
            for (let idx = 0; idx < Math.min(questions.length, 5); idx++) {
                const q = questions[idx];
                modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId(`q${idx}`).setLabel(String(q.label ?? q.question ?? `Question ${idx+1}`).slice(0,45)).setStyle(q.style==="PARAGRAPH"? TextInputStyle.Paragraph: TextInputStyle.Short).setRequired(q.required!==false).setMaxLength(1000).setPlaceholder((q.placeholder??"").slice(0,100))));
            }
            return interaction.showModal(modal).catch(()=>{});
        }
        await interaction.deferReply({ flags: 64 }).catch(()=>{});
        const ticket = await this.createTicket(guild, member, type, []);
        await interaction.editReply({ embeds: [embeds.success("Ticket created", `Your ticket is ready: <#${ticket.channelId}>`)] }).catch(()=>{});
    }

    async handleDashboardSelect(i) {
        if (!i.isStringSelectMenu()) return;
        const val = i.values[0];
        const guild = i.guild;
        // Simple info responses
        const map = {
            about: "A.N.G.E.L. is a global panel & ticket framework — each server configures its own content via /setuptickets.",
            services: "Use the Orders and Assistance panels to open tickets. Staff will claim and assist.",
            staff: "Staff listed via server roles — configure via /autosetup.",
            links: "Invite A.N.G.E.L.: https://discord.com/oauth2/authorize?client_id=" + (process.env.CLIENT_ID ?? "") + "&scope=bot%20applications.commands",
            regulations: "See the Regulations panel for server rules.",
        };
        const text = map[val] ?? "More information coming soon.";
        await i.reply({ embeds: [embeds.info(val, text)], flags: 64 }).catch(()=>{});
    }

    async handleQuestionModal(interaction) {
        if (!interaction.isModalSubmit()) return;
        const key = interaction.customId.split(":")[3];
        const guild = interaction.guild;
        const member = interaction.member;
        const type = await this.prisma.ticketType.findUnique({ where: { guildId_key: { guildId: guild.id, key } } }).catch(()=>null);
        if (!type) return interaction.reply({ embeds: [embeds.error("Not found","Type missing")], flags:64 }).catch(()=>{});
        let questions = []; try{ questions = JSON.parse(type.questions ?? "[]"); }catch{}
        const answers = [];
        for (let idx=0; idx<Math.min(questions.length,5); idx++) {
            const q = questions[idx];
            const ans = interaction.fields.getTextInputValue(`q${idx}`) ?? "";
            answers.push({ question: q.label ?? q.question ?? `Q${idx+1}`, answer: ans });
        }
        await interaction.deferReply({ flags: 64 }).catch(()=>{});
        const ticket = await this.createTicket(guild, member, type, answers);
        await interaction.editReply({ embeds: [embeds.success("Ticket created", `Your ticket: <#${ticket.channelId}>`)] }).catch(()=>{});
    }

    async createTicket(guild, member, type, answers) {
        const prefix = type.channelPrefix ?? "ticket";
        const base = this.sanitizeName(member.user.username);
        const name = await this.uniqueChannelName(guild, base, prefix);
        const category = await this.findCategory(guild, type);
        const overwrites = await this.buildOverwrites(guild, member.id, type);
        const channel = await guild.channels.create({ name, type: ChannelType.GuildText, parent: category?.id ?? null, permissionOverwrites: overwrites, topic: `Ticket ${type.displayName} • ${member.user.tag}` });

        const status = STATUS.OPEN;
        const ticket = await this.prisma.ticket.create({ data: { guildId: guild.id, channelId: channel.id, openerId: member.id, typeId: type.id, panelType: type.panelType, status, priority: type.priority ?? PRIORITY.NORMAL } });

        // Cooldown set
        if (type.cooldown) this.cooldowns.set(`${guild.id}:${member.id}:${type.key}`, Date.now());

        // Welcome embed
        const fields = [
            { name: "Creator", value: `<@${member.id}>`, inline: true },
            { name: "Service", value: `${type.emoji ?? ""} ${type.displayName}`, inline: true },
            { name: "Status", value: `🟡 ${status}`, inline: true },
            { name: "Priority", value: type.priority ?? "NORMAL", inline: true },
            { name: "Created", value: `<t:${Math.floor(Date.now()/1000)}:R>`, inline: true },
        ];
        if (answers.length) {
            for (const a of answers) fields.push({ name: a.question.slice(0,256), value: a.answer.slice(0,1024) || "—" });
        }
        if (type.instructions) fields.push({ name: "Instructions", value: type.instructions.slice(0,1024) });
        const welcome = embeds.info(`${type.emoji ?? "🎫"} New Ticket — ${type.displayName}`, type.welcomeMessage ?? `Hello <@${member.id}>, staff will assist you shortly.`, fields);
        if (type.bannerUrl) welcome.setImage(type.bannerUrl);
        welcome.setColor(Theme.accent);

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`angel:ticket:claim:${channel.id}`).setLabel("Claim").setStyle(ButtonStyle.Success).setEmoji("🛠️"),
            new ButtonBuilder().setCustomId(`angel:ticket:close:${channel.id}`).setLabel("Close").setStyle(ButtonStyle.Danger).setEmoji("🔒"),
            new ButtonBuilder().setCustomId(`angel:ticket:info:${channel.id}`).setLabel("Info").setStyle(ButtonStyle.Secondary).setEmoji("ℹ️"),
        );
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`angel:ticket:add:${channel.id}`).setLabel("Add User").setStyle(ButtonStyle.Primary).setEmoji("➕"),
            new ButtonBuilder().setCustomId(`angel:ticket:remove:${channel.id}`).setLabel("Remove").setStyle(ButtonStyle.Secondary).setEmoji("➖"),
            new ButtonBuilder().setCustomId(`angel:ticket:transcript:${channel.id}`).setLabel("Transcript").setStyle(ButtonStyle.Secondary).setEmoji("📄"),
        );
        const priorityMenu = new StringSelectMenuBuilder().setCustomId(`angel:ticket:priority:${channel.id}`).setPlaceholder("Priority").addOptions([
            { label:"Low", value: PRIORITY.LOW, emoji:"🟢" },
            { label:"Normal", value: PRIORITY.NORMAL, emoji:"🟡" },
            { label:"High", value: PRIORITY.HIGH, emoji:"🟠" },
            { label:"Urgent", value: PRIORITY.URGENT, emoji:"🔴" },
        ]);
        const statusMenu = new StringSelectMenuBuilder().setCustomId(`angel:ticket:status:${channel.id}`).setPlaceholder("Status").addOptions([
            { label:"Open", value: STATUS.OPEN, emoji:"🟡" },
            { label:"Claimed", value: STATUS.CLAIMED, emoji:"🔵" },
            { label:"Waiting", value: STATUS.WAITING, emoji:"🟠" },
            { label:"In Progress", value: STATUS.IN_PROGRESS, emoji:"🟣" },
            { label:"Completed", value: STATUS.COMPLETED, emoji:"🟢" },
            { label:"Closed", value: STATUS.CLOSED, emoji:"🔴" },
        ]);

        await channel.send({ content: `<@${member.id}>`, embeds: [welcome], components: [row1, row2, new ActionRowBuilder().addComponents(priorityMenu), new ActionRowBuilder().addComponents(statusMenu)] }).catch(()=>{});

        // Logging
        try {
            const logCh = await this.client.services.logging.channel(guild, "mod");
            if (logCh) await logCh.send({ embeds: [embeds.moderation("Ticket created", `${type.displayName} by <@${member.id}>`, [{name:"Channel", value:`<#${channel.id}>`, inline:true}])] }).catch(()=>{});
        } catch {}

        // Auto-close timer if configured (e.g., type has cooldown? We'll use config stored in Panel? For now check TicketType config JSON)
        return ticket;
    }

    // Ticket controls
    async handleClaim(i) {
        if (!i.isButton()) return;
        const channelId = i.customId.split(":")[3];
        const ticket = await this.prisma.ticket.findUnique({ where:{ channelId } }).catch(()=>null);
        if (!ticket) return i.reply({ embeds:[embeds.error("Not found","Ticket not in DB")], flags:64 }).catch(()=>{});
        if (ticket.status === STATUS.CLOSED) return i.reply({ embeds:[embeds.warn("Closed","Ticket is closed")], flags:64 }).catch(()=>{});
        const type = ticket.typeId ? await this.prisma.ticketType.findUnique({ where:{ id: ticket.typeId } }).catch(()=>null) : null;
        if (type && !type.allowClaim) return i.reply({ embeds:[embeds.warn("Claim disabled","Claiming disabled for this type")], flags:64 }).catch(()=>{});
        if (ticket.claimedById && ticket.claimedById !== i.user.id) return i.reply({ embeds:[embeds.warn("Claimed",`Already claimed by <@${ticket.claimedById}>`)], flags:64 }).catch(()=>{});
        await this.prisma.ticket.update({ where:{ channelId }, data:{ claimedById: i.user.id, status: STATUS.CLAIMED } }).catch(()=>{});
        await i.reply({ embeds:[embeds.success("Claimed",`You claimed this ticket`)], flags:64 }).catch(()=>{});
        const ch = i.guild.channels.cache.get(channelId);
        if (ch) await ch.send({ embeds:[embeds.info("Claimed", `<@${i.user.id}> claimed this ticket`)] }).catch(()=>{});
    }
    async handleUnclaim(i) {
        const channelId = i.customId.split(":")[3];
        await this.prisma.ticket.update({ where:{ channelId }, data:{ claimedById: null, status: STATUS.OPEN } }).catch(()=>{});
        await i.reply({ embeds:[embeds.success("Unclaimed","Ticket unclaimed")], flags:64 }).catch(()=>{});
    }
    async handleStatusSelect(i) {
        if (!i.isStringSelectMenu()) return;
        const channelId = i.customId.split(":")[3];
        const val = i.values[0];
        await this.prisma.ticket.update({ where:{ channelId }, data:{ status: val } }).catch(()=>{});
        await i.reply({ embeds:[embeds.success("Status",`Status set to ${val}`)], flags:64 }).catch(()=>{});
        const ch = i.guild.channels.cache.get(channelId);
        if (ch) await ch.send({ embeds:[embeds.info("Status update", `Status → **${val}** by <@${i.user.id}>`)] }).catch(()=>{});
    }
    async handlePrioritySelect(i) {
        if (!i.isStringSelectMenu()) return;
        const channelId = i.customId.split(":")[3];
        const val = i.values[0];
        await this.prisma.ticket.update({ where:{ channelId }, data:{ priority: val } }).catch(()=>{});
        await i.reply({ embeds:[embeds.success("Priority",`Priority set to ${val}`)], flags:64 }).catch(()=>{});
    }
    async handleAddUser(i) {
        const channelId = i.customId.split(":")[3];
        if (i.customId.endsWith(":menu")) {
            if (!i.isUserSelectMenu()) return;
            const uid = i.values[0];
            const ch = i.guild.channels.cache.get(channelId) ?? await i.guild.channels.fetch(channelId).catch(()=>null);
            if (ch) await ch.permissionOverwrites.edit(uid, { ViewChannel:true, SendMessages:true, ReadMessageHistory:true, AttachFiles:true }).catch(()=>{});
            return i.reply({ embeds:[embeds.success("Added", `<@${uid}> added`)], flags:64 }).catch(()=>{});
        }
        const menu = new (await import("discord.js")).UserSelectMenuBuilder().setCustomId(`angel:ticket:add:${channelId}:menu`).setPlaceholder("Select user");
        await i.reply({ embeds:[embeds.info("Add user","Pick user to add")], components:[new ActionRowBuilder().addComponents(menu)], flags:64 }).catch(()=>{});
    }
    async handleRemoveUser(i) {
        const channelId = i.customId.split(":")[3];
        if (i.customId.endsWith(":menu")) {
            if (!i.isUserSelectMenu()) return;
            const uid = i.values[0];
            const ch = i.guild.channels.cache.get(channelId) ?? await i.guild.channels.fetch(channelId).catch(()=>null);
            if (ch) await ch.permissionOverwrites.delete(uid).catch(()=>{});
            return i.reply({ embeds:[embeds.success("Removed", `<@${uid}> removed`)], flags:64 }).catch(()=>{});
        }
        const menu = new (await import("discord.js")).UserSelectMenuBuilder().setCustomId(`angel:ticket:remove:${channelId}:menu`).setPlaceholder("Select user");
        await i.reply({ embeds:[embeds.info("Remove user","Pick user to remove")], components:[new ActionRowBuilder().addComponents(menu)], flags:64 }).catch(()=>{});
    }
    async handleInfo(i) {
        const channelId = i.customId.split(":")[3];
        const ticket = await this.prisma.ticket.findUnique({ where:{ channelId } }).catch(()=>null);
        if (!ticket) return i.reply({ embeds:[embeds.error("Not found","Ticket missing")], flags:64 }).catch(()=>{});
        const ch = i.guild.channels.cache.get(channelId);
        const msgCount = ch ? (await ch.messages.fetch({ limit:100 }).catch(()=>null))?.size ?? "?" : "?";
        await i.reply({ embeds:[embeds.info("Ticket Info", `Channel: <#${channelId}>`, [
            {name:"ID", value: ticket.id, inline:true},
            {name:"Opener", value:`<@${ticket.openerId}>`, inline:true},
            {name:"Type", value: ticket.typeId ?? ticket.panelType ?? "—", inline:true},
            {name:"Status", value: ticket.status, inline:true},
            {name:"Priority", value: ticket.priority, inline:true},
            {name:"Claimed", value: ticket.claimedById ? `<@${ticket.claimedById}>` : "—", inline:true},
            {name:"Created", value:`<t:${Math.floor(ticket.createdAt.getTime()/1000)}:R>`, inline:true},
            {name:"Messages", value: String(msgCount), inline:true},
        ])], flags:64 }).catch(()=>{});
    }
    async handleClose(i) {
        const channelId = i.customId.split(":")[3];
        const ticket = await this.prisma.ticket.findUnique({ where:{ channelId } }).catch(()=>null);
        if (!ticket) return i.reply({ embeds:[embeds.error("Not found","Ticket missing")], flags:64 }).catch(()=>{});
        // Confirm
        if (!i.customId.includes(":confirm")) {
            return i.reply({ embeds:[embeds.warn("Close ticket","Confirm closing? This will archive and optionally create transcript.")], components:[confirmationRow({ acceptCustomId:`angel:ticket:close:${channelId}:confirm`, cancelCustomId:`angel:ticket:close:${channelId}:cancel`, acceptLabel:"Close", danger:true })], flags:64 }).catch(()=>{});
        }
        if (i.customId.endsWith(":cancel")) return i.update({ embeds:[embeds.info("Cancelled","Not closed")], components:[] }).catch(()=>{});
        await i.deferUpdate().catch(()=>{});
        await this.prisma.ticket.update({ where:{ channelId }, data:{ status: STATUS.CLOSED, closedAt: new Date() } }).catch(()=>{});
        const ch = i.guild.channels.cache.get(channelId) ?? await i.guild.channels.fetch(channelId).catch(()=>null);
        if (ch) {
            await ch.permissionOverwrites.edit(i.guild.roles.everyone.id, { ViewChannel:false }).catch(()=>{});
            await ch.send({ embeds:[embeds.info("Closed",`Closed by <@${i.user.id}>`)] }).catch(()=>{});
            // Transcript
            try {
                const msgs = await ch.messages.fetch({ limit:100 });
                const lines = [`Transcript for #${ch.name} (${ch.id})`, `Ticket ${ticket.id} by ${ticket.openerId}`, ""];
                for (const m of [...msgs.values()].reverse()) lines.push(`[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content}`);
                const buf = Buffer.from(lines.join("\n"), "utf-8");
                const file = new AttachmentBuilder(buf).setName(`transcript-${channelId}.txt`);
                const cfg = await this.client.services.settings.get(i.guild.id).catch(()=>null);
                // Try ticket type transcript channel? For now modLog
                if (cfg?.modLogChannelId) {
                    const logCh = i.guild.channels.cache.get(cfg.modLogChannelId);
                    if (logCh) await logCh.send({ embeds:[embeds.moderation("Transcript",`Ticket <#${channelId}> closed by <@${i.user.id}>`)], files:[file] }).catch(()=>{});
                }
                await i.user.send({ embeds:[embeds.info("Transcript",`Your ticket #${ch.name} transcript`)], files:[file] }).catch(()=>{});
            } catch (e) { logger.error("tickets","transcript failed", e); }
            // Optionally delete after 5s? For now keep archived
            // await ch.delete().catch(()=>{});
        }
        await i.editReply({ embeds:[embeds.success("Closed","Ticket closed")], components:[] }).catch(()=>{});
    }
    async handleTranscript(i) {
        const channelId = i.customId.split(":")[3];
        await i.deferReply({ flags:64 }).catch(()=>{});
        const ch = i.guild.channels.cache.get(channelId) ?? await i.guild.channels.fetch(channelId).catch(()=>null);
        if (!ch) return i.editReply({ embeds:[embeds.error("Not found","Channel missing")] }).catch(()=>{});
        const msgs = await ch.messages.fetch({ limit:100 }).catch(()=>null);
        if (!msgs) return i.editReply({ embeds:[embeds.error("Failed","Cannot fetch")] }).catch(()=>{});
        const lines = [`Transcript #${ch.name}`];
        for (const m of [...msgs.values()].reverse()) lines.push(`[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content}`);
        const file = new AttachmentBuilder(Buffer.from(lines.join("\n"),"utf-8")).setName(`transcript-${channelId}.txt`);
        await i.editReply({ embeds:[embeds.success("Transcript","Here")], files:[file] }).catch(()=>{});
    }

    async checkAutoClose() {
        // Simple: if Panel config has autoClose hours, close tickets older than that with no activity
        // For now, no-op — placeholder for production
    }
}
