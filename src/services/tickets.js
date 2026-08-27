import { ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, UserSelectMenuBuilder, AttachmentBuilder, ChannelType, PermissionFlagsBits, } from "discord.js";
import { embeds, confirmationRow } from "../design/embeds.js";
import { logger } from "../core/logger.js";
const CATEGORIES = [
    { value: "General", label: "General", description: "General questions and help" },
    { value: "Support", label: "Support", description: "Get help from staff" },
    { value: "Report", label: "Report", description: "Report a user or issue" },
];
const BASE_PERMS = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.AttachFiles,
    PermissionFlagsBits.EmbedLinks,
];
export class TicketService {
    prisma;
    client;
    settings;
    introMessages = new Map();
    constructor(prisma, client, settings) {
        this.prisma = prisma;
        this.client = client;
        this.settings = settings;
        this.registerStaticHandlers();
    }
    get components() {
        return this.client.components;
    }
    registerStaticHandlers() {
        // "Open Ticket" button on the panel.
        this.components.set("wings:ticket:open", async (i) => {
            if (!i.isButton())
                return;
            await this.handleOpen(i);
        });
        // Category selection shown after pressing open.
        this.components.set("wings:ticket:category", async (i) => {
            if (!i.isStringSelectMenu())
                return;
            await this.handleCategorySelect(i);
        });
        // Modal submit (customId: wings:ticket:create:<category>).
        this.components.set("wings:ticket:create", async (i) => {
            if (!i.isModalSubmit())
                return;
            await this.handleCreateModal(i);
        });
    }
    registerControlHandlers() {
        this.components.set("wings:ticket:claim", async (i) => this.handleClaim(i));
        this.components.set("wings:ticket:close", async (i) => this.handleClose(i));
        this.components.set("wings:ticket:add", async (i) => this.handleAddUser(i));
        this.components.set("wings:ticket:remove", async (i) => this.handleRemoveUser(i));
        this.components.set("wings:ticket:transcript", async (i) => this.handleTranscript(i));
    }
    // --- Panel command support -------------------------------------------------
    buildPanelEmbed() {
        return embeds.info("Support Tickets", "Open a private ticket to reach staff. Only you and staff can see the channel. Use the button below to get started.", [
            { name: "Categories", value: CATEGORIES.map((c) => `**${c.label}** — ${c.description}`).join("\n"), inline: false },
            { name: "Note", value: "Please be patient; a staff member will respond as soon as possible.", inline: false },
        ]);
    }
    buildOpenButton() {
        return new ActionRowBuilder().addComponents(new ButtonBuilder()
            .setCustomId("wings:ticket:open")
            .setLabel("Open Ticket")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("🎫"));
    }
    async handleOpen(i) {
        const member = i.member;
        const existing = await this.prisma.ticket.findFirst({
            where: { guildId: i.guild.id, openerId: member.id, status: { in: ["OPEN", "ARCHIVED"] } },
        });
        if (existing) {
            await i.reply({
                embeds: [embeds.warn("Ticket already open", `You already have a ticket at <#${existing.channelId}>.`)],
                ephemeral: true,
            });
            return;
        }
        const menu = new StringSelectMenuBuilder()
            .setCustomId("wings:ticket:category")
            .setPlaceholder("Choose a ticket category")
            .addOptions(CATEGORIES);
        await i.reply({
            embeds: [embeds.info("Open a ticket", "Select the category that best fits your request.")],
            components: [new ActionRowBuilder().addComponents(menu)],
            ephemeral: true,
        });
    }
    async handleCategorySelect(i) {
        const category = i.values[0];
        const modal = new ModalBuilder()
            .setCustomId(`wings:ticket:create:${category}`)
            .setTitle(`Open a ${category} ticket`);
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder()
            .setCustomId("description")
            .setLabel("Describe your issue")
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder("Explain what you need help with...")
            .setRequired(true)
            .setMaxLength(1000)));
        await i.showModal(modal);
    }
    async handleCreateModal(i) {
        const category = i.customId.split(":")[3] ?? "General";
        const description = i.fields.getTextInputValue("description");
        const guild = i.guild;
        const opener = i.member;
        await i.deferReply({ ephemeral: true });
        try {
            const ticket = await this.createTicket({ guild, opener, category, description });
            await i.editReply({
                embeds: [embeds.success("Ticket created", `Your ticket is ready at <#${ticket.channelId}>.`)],
                components: [],
            });
        }
        catch (e) {
            logger.error("tickets", "create failed", e);
            await i.editReply({
                embeds: [embeds.error("Could not create ticket", "An unexpected error occurred while creating your ticket.")],
                components: [],
            });
        }
    }
    // --- Core creation ---------------------------------------------------------
    sanitizeName(input) {
        let name = input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        if (!name)
            name = "user";
        return name.slice(0, 28);
    }
    async findParent(guild) {
        const candidates = ["tickets", "open-tickets", "open tickets"];
        for (const c of guild.channels.cache.values()) {
            if (c.type !== ChannelType.GuildCategory)
                continue;
            if (candidates.includes(c.name.toLowerCase()))
                return c;
        }
        return null;
    }
    async uniqueChannelName(guild, base) {
        const parent = await this.findParent(guild);
        const siblings = new Map();
        for (const ch of guild.channels.cache.values()) {
            if (ch.parentId === parent?.id || (!parent && ch.type === ChannelType.GuildText)) {
                siblings.set(ch.name, (siblings.get(ch.name) ?? 0) + 1);
            }
        }
        let name = base;
        let suffix = 1;
        while (siblings.has(name)) {
            const trimmed = base.slice(0, 30 - String(suffix).length - 1);
            name = `${trimmed}-${suffix}`;
            suffix++;
        }
        return name;
    }
    async buildOverwrites(guild, openerId, config) {
        const roleIds = [...config.staffRoleIds, ...config.moderatorRoleIds];
        const overwrites = [
            { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: openerId, allow: [...BASE_PERMS] },
        ];
        for (const id of roleIds) {
            overwrites.push({ id, allow: [...BASE_PERMS, PermissionFlagsBits.ManageMessages] });
        }
        return overwrites;
    }
    async createTicket(input) {
        const { guild, opener, category, description } = input;
        const config = await this.settings.get(guild.id);
        const parent = await this.findParent(guild);
        const baseName = this.sanitizeName(`ticket-${opener.user.username}`);
        const name = await this.uniqueChannelName(guild, baseName);
        const overwrites = await this.buildOverwrites(guild, opener.id, config);
        const channel = await guild.channels.create({
            name,
            type: ChannelType.GuildText,
            parent: parent?.id,
            topic: `Ticket · ${opener.user.tag} · ${category}`,
            permissionOverwrites: overwrites,
        });
        const embed = this.buildIntroEmbed(opener, category, description, null);
        const row = this.buildControlRow(channel.id);
        const sent = await channel.send({ content: `<@${opener.id}>`, embeds: [embed], components: [row] });
        this.introMessages.set(channel.id, sent.id);
        await this.prisma.ticket.create({
            data: {
                guildId: guild.id,
                channelId: channel.id,
                openerId: opener.id,
                category,
                status: "OPEN",
            },
        });
        this.registerControlHandlers();
        return { channelId: channel.id };
    }
    buildIntroEmbed(opener, category, description, claimedById) {
        const fields = [
            { name: "Opened by", value: `${opener.user.tag} (\`${opener.id}\`)`, inline: true },
            { name: "Category", value: category, inline: true },
            { name: "Status", value: claimedById ? "Claimed" : "Open", inline: true },
            { name: "Description", value: description || "*(none provided)*" },
        ];
        if (claimedById) {
            fields.push({ name: "Claimed by", value: `<@${claimedById}>`, inline: true });
        }
        return embeds.neutral("Ticket opened", "A staff member will be with you shortly.", fields);
    }
    buildControlRow(channelId) {
        const mk = (id, label, style, emoji) => new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style).setEmoji(emoji ?? "🔧");
        return new ActionRowBuilder().addComponents(mk(`wings:ticket:claim:${channelId}`, "Claim", ButtonStyle.Success, "✅"), mk(`wings:ticket:close:${channelId}`, "Close", ButtonStyle.Danger, "🔒"), mk(`wings:ticket:add:${channelId}`, "Add User", ButtonStyle.Primary, "➕"), mk(`wings:ticket:remove:${channelId}`, "Remove User", ButtonStyle.Secondary, "➖"), mk(`wings:ticket:transcript:${channelId}`, "Transcript", ButtonStyle.Secondary, "📄"));
    }
    async getTicketChannel(guild, channelId) {
        const ch = guild.channels.cache.get(channelId) ?? (await guild.channels.fetch(channelId).catch(() => null));
        return ch ?? null;
    }
    async editIntro(channelId, embed) {
        const channel = this.client.channels.cache.get(channelId) ?? null;
        if (!channel)
            return;
        const msgId = this.introMessages.get(channelId);
        const target = msgId ? await channel.messages.fetch(msgId).catch(() => null) : null;
        if (target) {
            await target.edit({ embeds: [embed] }).catch(() => { });
            return;
        }
        const messages = await channel.messages.fetch({ limit: 20 }).catch(() => null);
        const intro = messages?.find((m) => m.author.id === this.client.user?.id && m.embeds.length > 0);
        if (intro) {
            this.introMessages.set(channelId, intro.id);
            await intro.edit({ embeds: [embed] }).catch(() => { });
        }
    }
    // --- Control handlers ------------------------------------------------------
    parseChannelId(customId, prefix) {
        const rest = customId.slice(prefix.length);
        if (!rest.startsWith(":"))
            return null;
        return rest.slice(1).split(":")[0] ?? null;
    }
    async handleClaim(i) {
        if (!i.isButton())
            return;
        const channelId = this.parseChannelId(i.customId, "wings:ticket:claim");
        if (!channelId)
            return;
        const member = i.member;
        const config = await this.settings.get(i.guild.id).catch(() => null);
        if (!this.isStaffMember(member, config)) {
            await i.reply({ embeds: [embeds.error("Missing permission", "Only staff can claim tickets.")], ephemeral: true });
            return;
        }
        const ticket = await this.prisma.ticket.findUnique({ where: { channelId } }).catch(() => null);
        if (!ticket || ticket.status !== "OPEN") {
            await i.reply({ embeds: [embeds.warn("Ticket unavailable", "This ticket is not open.")], ephemeral: true });
            return;
        }
        await this.prisma.ticket.update({ where: { channelId }, data: { claimedById: member.id } });
        const opener = await i.guild.members.fetch(ticket.openerId).catch(() => null);
        const embed = this.buildIntroEmbed(opener, ticket.category ?? "General", "", member.id);
        await this.editIntro(channelId, embed);
        await i.reply({ embeds: [embeds.success("Ticket claimed", `You claimed this ticket.`)], ephemeral: true });
    }
    async handleClose(i) {
        if (!i.isButton() && !i.isStringSelectMenu())
            return;
        const channelId = this.parseChannelId(i.customId, "wings:ticket:close");
        if (!channelId)
            return;
        if (i.customId.endsWith(":confirm")) {
            await i.deferUpdate().catch(() => { });
            await this.closeTicket(i.guild, channelId, i.member);
            await i.editReply({ embeds: [embeds.success("Ticket closed", "This ticket has been closed.")], components: [] }).catch(() => { });
            return;
        }
        if (i.customId.endsWith(":cancel")) {
            await i.update({ embeds: [embeds.info("Cancelled", "The ticket was not closed.")], components: [] }).catch(() => { });
            return;
        }
        const ticket = await this.prisma.ticket.findUnique({ where: { channelId } }).catch(() => null);
        if (!ticket || ticket.status !== "OPEN") {
            await i.reply({ embeds: [embeds.warn("Ticket unavailable", "This ticket is not open.")], ephemeral: true });
            return;
        }
        await i.reply({
            embeds: [embeds.warn("Close ticket", "This will lock the channel and generate a transcript. Continue?")],
            components: [
                confirmationRow({
                    acceptCustomId: `wings:ticket:close:${channelId}:confirm`,
                    cancelCustomId: `wings:ticket:close:${channelId}:cancel`,
                    acceptLabel: "Close ticket",
                    danger: true,
                }),
            ],
            ephemeral: true,
        });
    }
    async closeTicket(guild, channelId, closer) {
        const channel = await this.getTicketChannel(guild, channelId);
        if (!channel)
            return;
        const transcript = await this.buildTranscriptText(channel).catch(() => null);
        await this.prisma.ticket.update({
            where: { channelId },
            data: { status: "CLOSED", closedAt: new Date(), transcript: transcript ?? undefined },
        }).catch(() => { });
        const everyone = guild.roles.everyone;
        await channel.permissionOverwrites.edit(everyone, { SendMessages: false }).catch(() => { });
        await channel.permissionOverwrites.edit(closer.id, { SendMessages: false }).catch(() => { });
        const ticket = await this.prisma.ticket.findUnique({ where: { channelId } }).catch(() => null);
        if (ticket) {
            const opener = await guild.members.fetch(ticket.openerId).catch(() => null);
            if (opener)
                await channel.permissionOverwrites.edit(opener.id, { SendMessages: false }).catch(() => { });
        }
        const newName = `closed-${channel.name.replace(/^ticket-/, "").slice(0, 28)}`;
        await channel.setName(newName).catch(() => { });
        await channel.send({ embeds: [embeds.info("Ticket closed", `Closed by ${closer.user.tag}. A transcript was generated.`)] }).catch(() => { });
        if (transcript)
            await this.deliverTranscript(guild, channelId, transcript, "closed");
    }
    async handleAddUser(i) {
        const channelId = this.parseChannelId(i.customId, "wings:ticket:add");
        if (!channelId)
            return;
        if (i.customId.endsWith(":menu")) {
            if (!i.isUserSelectMenu())
                return;
            const userId = i.values[0];
            const channel = await this.getTicketChannel(i.guild, channelId);
            if (!channel)
                return;
            await channel.permissionOverwrites.edit(userId, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true }).catch(() => { });
            await i.reply({ embeds: [embeds.success("User added", `<@${userId}> can now access this ticket.`)], ephemeral: true });
            return;
        }
        const menu = new UserSelectMenuBuilder().setCustomId(`wings:ticket:add:${channelId}:menu`).setPlaceholder("Select a user to add");
        await i.reply({
            embeds: [embeds.info("Add user", "Pick a member to grant access to this ticket.")],
            components: [new ActionRowBuilder().addComponents(menu)],
            ephemeral: true,
        });
    }
    async handleRemoveUser(i) {
        const channelId = this.parseChannelId(i.customId, "wings:ticket:remove");
        if (!channelId)
            return;
        if (i.customId.endsWith(":menu")) {
            if (!i.isUserSelectMenu())
                return;
            const userId = i.values[0];
            const channel = await this.getTicketChannel(i.guild, channelId);
            if (!channel)
                return;
            const ticket = await this.prisma.ticket.findUnique({ where: { channelId } }).catch(() => null);
            if (ticket && userId === ticket.openerId) {
                await i.reply({ embeds: [embeds.error("Cannot remove opener", "The ticket opener cannot be removed.")], ephemeral: true });
                return;
            }
            await channel.permissionOverwrites.edit(userId, { ViewChannel: false, SendMessages: false }).catch(() => { });
            await i.reply({ embeds: [embeds.success("User removed", `<@${userId}> no longer has access to this ticket.`)], ephemeral: true });
            return;
        }
        const menu = new UserSelectMenuBuilder().setCustomId(`wings:ticket:remove:${channelId}:menu`).setPlaceholder("Select a user to remove");
        await i.reply({
            embeds: [embeds.info("Remove user", "Pick a member to revoke access from this ticket.")],
            components: [new ActionRowBuilder().addComponents(menu)],
            ephemeral: true,
        });
    }
    async handleTranscript(i) {
        if (!i.isButton())
            return;
        const channelId = this.parseChannelId(i.customId, "wings:ticket:transcript");
        if (!channelId)
            return;
        await i.deferReply({ ephemeral: true });
        const channel = await this.getTicketChannel(i.guild, channelId);
        if (!channel) {
            await i.editReply({ embeds: [embeds.error("Channel not found", "This ticket channel no longer exists.")] });
            return;
        }
        const text = await this.buildTranscriptText(channel).catch(() => null);
        if (!text) {
            await i.editReply({ embeds: [embeds.error("Transcript failed", "Could not collect messages for this ticket.")] });
            return;
        }
        const ticket = await this.prisma.ticket.findUnique({ where: { channelId } }).catch(() => null);
        await this.deliverTranscript(i.guild, channelId, text, ticket?.status === "CLOSED" ? "archived" : "requested");
        await i.editReply({ embeds: [embeds.success("Transcript sent", "The transcript was delivered to your DMs and the mod-log channel.")] });
    }
    // --- Transcript helpers ----------------------------------------------------
    async buildTranscriptText(channel) {
        const messages = await channel.messages.fetch({ limit: 200 });
        const lines = [`Transcript for #${channel.name} (${channel.id})`, `Generated ${new Date().toISOString()}`, ""];
        for (const m of [...messages.values()].reverse()) {
            if (m.author.bot && m.embeds.length && !m.content)
                continue;
            const ts = m.createdAt.toISOString();
            const attachments = m.attachments.size ? ` [attachments: ${[...m.attachments.values()].map((a) => a.url).join(", ")}]` : "";
            lines.push(`[${ts}] ${m.author.tag}: ${m.content}${attachments}`);
        }
        return lines.join("\n");
    }
    async deliverTranscript(guild, channelId, text, kind) {
        const file = new AttachmentBuilder(Buffer.from(text, "utf-8")).setName(`transcript-${channelId}.txt`);
        const ticket = await this.prisma.ticket.findUnique({ where: { channelId } }).catch(() => null);
        if (ticket) {
            const opener = await guild.members.fetch(ticket.openerId).catch(() => null);
            if (opener)
                await opener.send({ embeds: [embeds.info("Ticket transcript", `Your transcript (${kind}).`)], files: [file] }).catch(() => { });
        }
        const config = await this.settings.get(guild.id).catch(() => null);
        if (config?.modLogChannelId) {
            const ch = guild.channels.cache.get(config.modLogChannelId);
            if (ch)
                await ch.send({ embeds: [embeds.moderation("Ticket transcript", `Channel <#${channelId}> · ${kind}.`)], files: [file] }).catch(() => { });
        }
    }
    isStaffMember(member, config) {
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
}
//# sourceMappingURL=tickets.js.map