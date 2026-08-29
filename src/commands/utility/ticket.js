import { SlashCommandBuilder, MessageFlags, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { embeds } from "../../design/embeds.js";
import { isStaff } from "../../core/services.js";
export default {
    data: new SlashCommandBuilder().setName("ticket").setDescription("Ticket V5 — manage tickets")
        .addSubcommand(s=> s.setName("list").setDescription("Intelligent ticket list [category][user][id]").addStringOption(o=>o.setName("category").setDescription("Category").addChoices({name:"All",value:"all"},{name:"Order",value:"ORDER"},{name:"Assistance",value:"ASSISTANCE"},{name:"Dashboard",value:"DASHBOARD"})).addUserOption(o=>o.setName("user").setDescription("Filter by user")).addStringOption(o=>o.setName("status").setDescription("Status").addChoices({name:"All",value:"all"},{name:"Open",value:"OPEN"},{name:"Claimed",value:"CLAIMED"},{name:"Closed",value:"CLOSED"})).addIntegerOption(o=>o.setName("page").setDescription("Page").setMinValue(1)))
        .addSubcommand(s=> s.setName("transfer").setDescription("Transfer claim").addUserOption(o=>o.setName("user").setDescription("New assignee").setRequired(true)))
        .addSubcommand(s=> s.setName("rename").setDescription("Rename ticket").addStringOption(o=>o.setName("name").setDescription("New name").setRequired(true)))
        .addSubcommand(s=> s.setName("add").setDescription("Add user").addUserOption(o=>o.setName("user").setDescription("User").setRequired(true)))
        .addSubcommand(s=> s.setName("remove").setDescription("Remove user").addUserOption(o=>o.setName("user").setDescription("User").setRequired(true)))
        .addSubcommand(s=> s.setName("priority").setDescription("Set priority").addStringOption(o=>o.setName("priority").setDescription("Priority").setRequired(true).addChoices({name:"Low",value:"LOW"},{name:"Normal",value:"NORMAL"},{name:"High",value:"HIGH"},{name:"Urgent",value:"URGENT"})))
        .addSubcommand(s=> s.setName("close").setDescription("Close ticket").addStringOption(o=>o.setName("reason").setDescription("Reason")))
        .addSubcommand(s=> s.setName("reopen").setDescription("Reopen ticket"))
        .addSubcommand(s=> s.setName("rate").setDescription("Rate ticket (1-5)").addIntegerOption(o=>o.setName("rating").setDescription("1-5").setRequired(true).setMinValue(1).setMaxValue(5)).addStringOption(o=>o.setName("feedback").setDescription("Feedback")))
        .addSubcommand(s=> s.setName("stats").setDescription("Ticket statistics")),
    category:"Utility",
    async execute(interaction){
        const sub=interaction.options.getSubcommand();
        const prisma=interaction.client.prisma;
        const channel=interaction.channel;
        const guild=interaction.guild;
        // list & stats do not require ticket channel
        if(sub==="list"){
            const category=interaction.options.getString("category");
            const user=interaction.options.getUser("user");
            const status=interaction.options.getString("status");
            const page=Math.max(1, interaction.options.getInteger("page")||1);
            const limit=8;
            const offset=(page-1)*limit;
            const catFilter=category && category!=="all" ? category : null;
            const statusFilter=status && status!=="all" ? status : null;
            const cfg=await interaction.client.services.settings.get(guild.id).catch(()=>null);
            const isStaffUser=isStaff(interaction.member,cfg);
            let userFilter=user ? user.id : null;
            if(!isStaffUser && !userFilter) userFilter=interaction.user.id;
            const result=await interaction.client.services.tickets.listTickets(guild.id, { status: statusFilter, category: catFilter, userId: userFilter, limit, offset }).catch(()=>({ rows:[], total:0 }));
            const totalPages=Math.max(1, Math.ceil(result.total/limit));
            const maxOpen=(await prisma.ticketType.findFirst({ where:{ guildId: guild.id }}).catch(()=>null))?.maxOpen || 3;
            const embed=new EmbedBuilder().setColor(0x60a5fa).setTitle(`Ticket List — [category][user][id]`).setFooter({ text:`Page ${page}/${totalPages} • ${result.total} tickets • ${isStaffUser?"staff view":"your tickets"}` }).setTimestamp();
            if(!result.rows.length) embed.setDescription(`*No tickets* ${catFilter?`in **${catFilter}**`:""} ${userFilter?`for <@${userFilter}>`:""} ${statusFilter?`• ${statusFilter}`:""}`);
            else {
                const lines=result.rows.map(t=>{
                    const chan=guild.channels.cache.get(t.channelId);
                    const chName=chan? `<#${t.channelId}>` : `\`#${t.id.slice(0,4)}\``;
                    const catLabel=t.category||t.panelType||"Ticket";
                    const short=t.shortId||t.id.slice(0,4);
                    const claim=t.claimedById? `→ <@${t.claimedById}>` : "unclaimed";
                    return `\`[${catLabel}][<@${t.openerId}>][${short}]\` ${chName} **${t.status}** ${claim} <t:${Math.floor(new Date(t.createdAt).getTime()/1000)}:R>`;
                }).join("\n");
                embed.setDescription(lines.slice(0,4000));
                embed.addFields({ name:"Intelligent", value:`*Channel names use \`${result.rows[0]?.channelId ? guild.channels.cache.get(result.rows[0].channelId)?.name || "category-user-id" : "category-user-id"}\` — e.g., \`gfx-ultim-a1b2\` — allows **${maxOpen}** concurrent tickets per user*`});
            }
            const row=new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`ticket:list:prev:${page}`).setLabel("◀ Prev").setStyle(ButtonStyle.Secondary).setDisabled(page<=1),
                new ButtonBuilder().setCustomId(`ticket:list:next:${page}`).setLabel("Next ▶").setStyle(ButtonStyle.Secondary).setDisabled(page>=totalPages)
            );
            if(totalPages>1){
                interaction.client.components.set("ticket:list", async(i)=>{
                    if(!i.customId.startsWith("ticket:list:")) return;
                    if(i.user.id!==interaction.user.id) return i.reply({ embeds:[embeds.error("Not yours","")], flags: MessageFlags.Ephemeral});
                    const parts=i.customId.split(":"); // ticket:list:prev:3
                    const dir=parts[2]; const cur=parseInt(parts[3]);
                    const next=dir==="next"? cur+1 : cur-1;
                    if(next<1 || next>totalPages) return i.deferUpdate().catch(()=>{});
                    const nxtRes=await i.client.services.tickets.listTickets(guild.id, { status: statusFilter, category: catFilter, userId: userFilter, limit, offset:(next-1)*limit }).catch(()=>({ rows:[], total:0 }));
                    const nxtEmbed=new EmbedBuilder().setColor(0x60a5fa).setTitle(`Ticket List — [category][user][id]`).setFooter({ text:`Page ${next}/${totalPages} • ${nxtRes.total} tickets` }).setTimestamp();
                    if(!nxtRes.rows.length) nxtEmbed.setDescription("*No tickets*");
                    else nxtEmbed.setDescription(nxtRes.rows.map(t=>{
                        const chan=guild.channels.cache.get(t.channelId);
                        const chName=chan? `<#${t.channelId}>` : `\`#${t.id.slice(0,4)}\``;
                        const catLabel=t.category||t.panelType||"Ticket";
                        const short=t.shortId||t.id.slice(0,4);
                        return `\`[${catLabel}][<@${t.openerId}>][${short}]\` ${chName} **${t.status}**`;
                    }).join("\n").slice(0,4000));
                    await i.update({ embeds:[nxtEmbed], components:[ new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`ticket:list:prev:${next}`).setLabel("◀ Prev").setStyle(ButtonStyle.Secondary).setDisabled(next<=1),
                        new ButtonBuilder().setCustomId(`ticket:list:next:${next}`).setLabel("Next ▶").setStyle(ButtonStyle.Secondary).setDisabled(next>=totalPages)
                    )] }).catch(()=>{});
                });
            }
            return interaction.reply({ embeds:[embed], components: totalPages>1 ? [row] : [], flags: MessageFlags.Ephemeral });
        }
        if(sub==="stats"){
            const total=await prisma.ticket.count({ where:{ guildId: guild.id }}).catch(()=>0);
            const open=await prisma.ticket.count({ where:{ guildId: guild.id, status:{ not:"CLOSED" }}}).catch(()=>0);
            const byPriority=await prisma.ticket.groupBy({ by:["priority"], where:{ guildId: guild.id }, _count:{_all:true }}).catch(()=>[]);
            const avgRating=await prisma.ticketRating.aggregate({ where:{ guildId: guild.id }, _avg:{ rating:true }, _count:{ _all:true }}).catch(()=>({ _avg:{ rating:null }, _count:{ _all:0 }}));
            const embed=new EmbedBuilder().setColor(0x60a5fa).setTitle("Ticket Statistics").addFields(
                { name:"Total", value:String(total), inline:true },
                { name:"Open", value:String(open), inline:true },
                { name:"By Priority", value: byPriority.map(p=> `${p.priority}: ${p._count._all}`).join("\n")||"—", inline:true },
                { name:"Rating", value: avgRating._avg.rating? `${avgRating._avg.rating.toFixed(2)} ⭐ (${avgRating._count._all} votes)`:"No ratings", inline:true }
            );
            return interaction.reply({ embeds:[embed], flags: MessageFlags.Ephemeral});
        }
        // Others require ticket channel
        const ticket=await prisma.ticket.findUnique({ where:{ channelId: channel.id }}).catch(()=>null);
        if(!ticket) return interaction.reply({ embeds:[embeds.error("Not a ticket","Use in ticket channel")], flags: MessageFlags.Ephemeral});
        if(sub==="transfer"){
            const cfg=await interaction.client.services.settings.get(guild.id).catch(()=>null);
            if(!isStaff(interaction.member,cfg) && ticket.claimedById !== interaction.user.id) return interaction.reply({ embeds:[embeds.error("No perm","Only claimer or staff")], flags: MessageFlags.Ephemeral});
            const user=interaction.options.getUser("user");
            await prisma.ticket.update({ where:{ channelId: channel.id }, data:{ claimedById: user.id, status:"CLAIMED" }}).catch(()=>{});
            await channel.send({ embeds:[embeds.info("Transferred",`Claim transferred to <@${user.id}>`)] }).catch(()=>{});
            return interaction.reply({ embeds:[embeds.success("Transferred",`→ <@${user.id}>`)], flags: MessageFlags.Ephemeral});
        }
        if(sub==="rename"){
            const name=interaction.options.getString("name");
            if(!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels) && !isStaff(interaction.member, await interaction.client.services.settings.get(guild.id).catch(()=>null))) return interaction.reply({ embeds:[embeds.error("No perm","ManageChannels")], flags: MessageFlags.Ephemeral});
            await channel.setName(name.slice(0,100).replace(/[^a-z0-9-]/gi,"-")).catch(()=>{});
            return interaction.reply({ embeds:[embeds.success("Renamed",`→ ${name}`)], flags: MessageFlags.Ephemeral});
        }
        if(sub==="add"){
            const user=interaction.options.getUser("user");
            await channel.permissionOverwrites.edit(user.id,{ ViewChannel:true, SendMessages:true, ReadMessageHistory:true }).catch(()=>{});
            return interaction.reply({ embeds:[embeds.success("Added",`<@${user.id}>` )], flags: MessageFlags.Ephemeral});
        }
        if(sub==="remove"){
            const user=interaction.options.getUser("user");
            await channel.permissionOverwrites.delete(user.id).catch(()=>{});
            return interaction.reply({ embeds:[embeds.success("Removed",`<@${user.id}>`)], flags: MessageFlags.Ephemeral});
        }
        if(sub==="priority"){
            const p=interaction.options.getString("priority");
            await prisma.ticket.update({ where:{ channelId: channel.id }, data:{ priority:p }}).catch(()=>{});
            return interaction.reply({ embeds:[embeds.success("Priority",p)], flags: MessageFlags.Ephemeral});
        }
        if(sub==="close"){
            const reason=interaction.options.getString("reason")||"Closed";
            await prisma.ticket.update({ where:{ channelId: channel.id }, data:{ status:"CLOSED", closedAt: new Date() }}).catch(()=>{});
            await channel.send({ embeds:[embeds.info("Closed",`By <@${interaction.user.id}> — ${reason}`)]}).catch(()=>{});
            // Automation transcript log trigger
            await interaction.client.services.automation?.trigger(guild.id,"ticketClose",{ channelId: channel.id, closerId: interaction.user.id }).catch(()=>{});
            await interaction.client.services.audit?.log(guild.id,{ actorId:interaction.user.id, action:"ticket_close", category:"tickets", details:{ channelId: channel.id, reason }}).catch(()=>{});
            return interaction.reply({ embeds:[embeds.success("Closed","Ticket marked closed")] , flags: MessageFlags.Ephemeral});
        }
        if(sub==="reopen"){
            await prisma.ticket.update({ where:{ channelId: channel.id }, data:{ status:"OPEN", closedAt:null }}).catch(()=>{});
            await channel.permissionOverwrites.edit(guild.roles.everyone.id,{ ViewChannel:false }).catch(()=>{});
            // Re-allow opener
            const opener=await prisma.ticket.findUnique({ where:{ channelId: channel.id }}).then(t=>t?.openerId).catch(()=>null);
            if(opener) await channel.permissionOverwrites.edit(opener,{ ViewChannel:true, SendMessages:true }).catch(()=>{});
            return interaction.reply({ embeds:[embeds.success("Reopened","Ticket reopened")], flags: MessageFlags.Ephemeral});
        }
        if(sub==="rate"){
            const rating=interaction.options.getInteger("rating");
            const feedback=interaction.options.getString("feedback");
            try{
                await prisma.ticketRating.upsert({ where:{ guildId_channelId_raterId:{ guildId: guild.id, channelId: channel.id, raterId: interaction.user.id }}, update:{ rating, feedback }, create:{ guildId: guild.id, channelId: channel.id, raterId: interaction.user.id, rating, feedback }});
                return interaction.reply({ embeds:[embeds.success("Rated",`${"⭐".repeat(rating)}${feedback?` — ${feedback}`:""}`)], flags: MessageFlags.Ephemeral});
            }catch(e){ return interaction.reply({ embeds:[embeds.error("Failed", e.message)], flags: MessageFlags.Ephemeral}); }
        }
    }
};
