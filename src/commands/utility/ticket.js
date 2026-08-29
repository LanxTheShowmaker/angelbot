import { SlashCommandBuilder, MessageFlags, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { embeds } from "../../design/embeds.js";
import { isStaff } from "../../core/services.js";
export default {
    data: new SlashCommandBuilder().setName("ticket").setDescription("Ticket V5 — manage tickets")
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
        // stats sub does not require ticket channel check
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
