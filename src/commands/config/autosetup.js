import {
    SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    ChannelType, PermissionFlagsBits,
} from "discord.js";
import { embeds } from "../../design/embeds.js";
import { logger } from "../../core/logger.js";

const selections = new Map();

function roleOptions(guild) {
    return guild.roles.cache
        .filter((r) => !r.managed && r.id !== guild.id)
        .sort((a, b) => b.position - a.position)
        .first(24)
        .map((r) => ({ label: r.name.slice(0, 80), value: r.id }));
}

function renderSetup(guild) {
    const sel = selections.get(guild.id) ?? { staff: [], mod: [] };
    const staffOpts = roleOptions(guild);
    const modOpts = roleOptions(guild);
    if (!staffOpts.length)
        staffOpts.push({ label: "No roles found", value: "none", description: "Create a role first" });
    if (!modOpts.length)
        modOpts.push({ label: "No roles found", value: "none", description: "Create a role first" });
    const staffMenu = new StringSelectMenuBuilder()
        .setCustomId("wings:setup:staff")
        .setPlaceholder("Select Staff role")
        .addOptions(staffOpts);
    const modMenu = new StringSelectMenuBuilder()
        .setCustomId("wings:setup:mod")
        .setPlaceholder("Select Moderator role")
        .addOptions(modOpts);
    const confirm = new ButtonBuilder()
        .setCustomId("wings:setup:confirm")
        .setLabel("Run setup")
        .setStyle(ButtonStyle.Primary);
    const embed = embeds.info("Auto-setup", "Pick the **Staff** and **Moderator** roles, then click **Run setup**. A.N.G.E.L. will create its log, mod-log, and order channels, and write the configuration.", [
        { name: "Staff", value: sel.staff.length ? sel.staff.map((id) => `<@&${id}>`).join(", ") : "—", inline: true },
        { name: "Moderator", value: sel.mod.length ? sel.mod.map((id) => `<@&${id}>`).join(", ") : "—", inline: true },
    ]);
    return {
        embeds: [embed],
        components: [
            new ActionRowBuilder().addComponents(staffMenu),
            new ActionRowBuilder().addComponents(modMenu),
            new ActionRowBuilder().addComponents(confirm),
        ],
    };
}

async function ensureCategory(guild, name) {
    const existing = guild.channels.cache.find((c) => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === name.toLowerCase());
    if (existing)
        return existing;
    return guild.channels.create({ name, type: ChannelType.GuildCategory });
}

async function ensureTextChannel(guild, name, parent, overwrites = []) {
    const existing = guild.channels.cache.find((c) => c.type === ChannelType.GuildText && c.name.toLowerCase() === name.toLowerCase() && (parent ? c.parentId === parent.id : !c.parentId));
    if (existing)
        return existing;
    return guild.channels.create({ name, type: ChannelType.GuildText, parent: parent?.id, permissionOverwrites: overwrites });
}

async function hideFromMembers(guild, target, allowRoleIds) {
    await target.permissionOverwrites.edit(guild.roles.everyone.id, { ViewChannel: false }).catch(() => { });
    for (const id of allowRoleIds) {
        await target.permissionOverwrites.edit(id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true }).catch(() => { });
    }
}

async function runSetup(client, guild, sel) {
    const settings = client.services.settings;
    const allowIds = [...sel.staff, ...sel.mod];
    const logOverwrites = [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        ...allowIds.map((id) => ({ id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] })),
    ];
    const ordersCat = await ensureCategory(guild, "design-orders");
    const logsCat = await ensureCategory(guild, "A.N.G.E.L. Logs");
    const logCh = await ensureTextChannel(guild, "wings-log", logsCat, logOverwrites);
    const modLogCh = await ensureTextChannel(guild, "wings-modlog", logsCat, logOverwrites);
    const welcomeCh = await ensureTextChannel(guild, "wings-welcome", null);
    await hideFromMembers(guild, logsCat, allowIds).catch((e) => logger.error("autosetup", "category hide failed", e));
    await settings.patch(guild.id, {
        staffRoleIds: sel.staff,
        moderatorRoleIds: sel.mod,
        logChannelId: logCh.id,
        modLogChannelId: modLogCh.id,
        welcomeChannelId: welcomeCh.id,
        goodbyeChannelId: welcomeCh.id,
    });
    return { ordersCat, logCh, modLogCh, welcomeCh };
}

export default {
    data: new SlashCommandBuilder()
        .setName("autosetup")
        .setDescription("Bootstrap A.N.G.E.L. for this server: roles, log channels, and order channels"),
    category: "Config",
    async execute(interaction) {
        const client = interaction.client;
        const member = interaction.member;
        const guild = interaction.guild;
        if (!member.permissions.has("ManageGuild") && !member.permissions.has("Administrator")) {
            return interaction.reply({ embeds: [embeds.error("Missing permission", "You need **Manage Server** permission to run auto-setup.")], ephemeral: true });
        }
        await interaction.deferReply({ ephemeral: true });
        selections.set(guild.id, { staff: [], mod: [] });
        client.components.set("wings:setup:staff", async (i) => {
            if (!i.isStringSelectMenu())
                return;
            const sel = selections.get(i.guild.id) ?? { staff: [], mod: [] };
            sel.staff = i.values.filter((v) => v !== "none");
            selections.set(i.guild.id, sel);
            await i.update(renderSetup(i.guild)).catch(() => { });
        });
        client.components.set("wings:setup:mod", async (i) => {
            if (!i.isStringSelectMenu())
                return;
            const sel = selections.get(i.guild.id) ?? { staff: [], mod: [] };
            sel.mod = i.values.filter((v) => v !== "none");
            selections.set(i.guild.id, sel);
            await i.update(renderSetup(i.guild)).catch(() => { });
        });
        client.components.set("wings:setup:confirm", async (i) => {
            if (!i.isButton())
                return;
            await i.deferUpdate().catch(() => { });
            const sel = selections.get(i.guild.id) ?? { staff: [], mod: [] };
            if (!sel.staff.length || !sel.mod.length) {
                await i.editReply({ embeds: [embeds.warn("Roles required", "Please select both a Staff and a Moderator role before running setup.")], components: [] }).catch(() => { });
                selections.delete(i.guild.id);
                return;
            }
            try {
                const r = await runSetup(i.client, i.guild, sel);
                await i.editReply({
                    embeds: [embeds.success("A.N.G.E.L. is configured", "Your server is set up. Logging, mod-log, and design-order channels are ready.", [
                        { name: "Staff roles", value: sel.staff.map((id) => `<@&${id}>`).join(", "), inline: true },
                        { name: "Moderator roles", value: sel.mod.map((id) => `<@&${id}>`).join(", "), inline: true },
                        { name: "Log channel", value: `${r.logCh}`, inline: true },
                        { name: "Mod-log channel", value: `${r.modLogCh}`, inline: true },
                        { name: "Order category", value: `${r.ordersCat}`, inline: true },
                        { name: "Welcome channel", value: `${r.welcomeCh}`, inline: true },
                    ])],
                    components: [],
                }).catch(() => { });
            }
            catch (e) {
                logger.error("autosetup", "run failed", e);
                await i.editReply({ embeds: [embeds.error("Setup failed", "Could not finish setup. Ensure A.N.G.E.L. has **Manage Channels** and **Manage Roles**.")], components: [] }).catch(() => { });
            }
            selections.delete(i.guild.id);
        });
        await interaction.editReply(renderSetup(guild));
    },
};
