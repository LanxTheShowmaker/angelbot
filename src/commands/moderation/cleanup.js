import { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } from "discord.js";
import { embeds } from "../../design/embeds.js";
import { isStaff } from "../../core/services.js";
export default {
    data: new SlashCommandBuilder().setName("cleanup").setDescription("Cleanup messages by user/bot").addUserOption(o=>o.setName("user").setDescription("User").setRequired(false)).addIntegerOption(o=>o.setName("amount").setDescription("Amount 1-100").setMinValue(1).setMaxValue(100)),
    category:"Moderation",
    async execute(interaction){
        const cfg=await interaction.client.services.settings.get(interaction.guildId).catch(()=>null);
        if(!isStaff(interaction.member,cfg) && !interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) return interaction.reply({ embeds:[embeds.error("No perm","ManageMessages")], flags: MessageFlags.Ephemeral});
        const user=interaction.options.getUser("user");
        const amount=interaction.options.getInteger("amount")||20;
        await interaction.deferReply({ flags: MessageFlags.Ephemeral}).catch(()=>{});
        const msgs=await interaction.channel.messages.fetch({ limit: Math.min(amount*2,100)}).catch(()=>null);
        if(!msgs) return interaction.editReply({ embeds:[embeds.error("Failed","Fetch failed")]});
        let filtered=[...msgs.values()].filter(m=> !user || m.author.id===user.id).slice(0,amount);
        let deleted=0;
        for(const m of filtered){ await m.delete().catch(()=>{}); deleted++; }
        return interaction.editReply({ embeds:[embeds.success("Cleaned",`Deleted ${deleted} messages${user? ` from <@${user.id}>`:""}`)]});
    }
};