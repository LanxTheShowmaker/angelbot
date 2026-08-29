import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { embeds } from "../../design/embeds.js";
import { isStaff } from "../../core/services.js";
export default {
    data: new SlashCommandBuilder().setName("xp").setDescription("XP management")
        .addSubcommand(s=> s.setName("give").setDescription("Give XP").addUserOption(o=>o.setName("user").setDescription("User").setRequired(true)).addIntegerOption(o=>o.setName("amount").setDescription("Amount").setRequired(true).setMinValue(1)))
        .addSubcommand(s=> s.setName("remove").setDescription("Remove XP").addUserOption(o=>o.setName("user").setDescription("User").setRequired(true)).addIntegerOption(o=>o.setName("amount").setDescription("Amount").setRequired(true).setMinValue(1)))
        .addSubcommand(s=> s.setName("set").setDescription("Set XP").addUserOption(o=>o.setName("user").setDescription("User").setRequired(true)).addIntegerOption(o=>o.setName("amount").setDescription("Amount").setRequired(true).setMinValue(0)))
        .addSubcommand(s=> s.setName("multiplier").setDescription("Set multiplier").addNumberOption(o=>o.setName("value").setDescription("0.1-5").setMinValue(0.1).setMaxValue(5))),
    category:"Utility",
    async execute(interaction){
        const sub=interaction.options.getSubcommand();
        const cfg=await interaction.client.services.settings.get(interaction.guildId).catch(()=>null);
        if(!isStaff(interaction.member,cfg)) return interaction.reply({ embeds:[embeds.error("Staff only","")], flags: MessageFlags.Ephemeral});
        const lvl=interaction.client.services.leveling;
        if(sub==="give"){
            const u=interaction.options.getUser("user",true); const amt=interaction.options.getInteger("amount",true);
            const row=await lvl.prisma.xp.findUnique({ where:{ guildId_userId:{ guildId:interaction.guildId, userId:u.id }}}).catch(()=>null);
            const cur=row? row.xp:0; const lvlNow=row? row.level:0;
            await lvl.prisma.xp.upsert({ where:{ guildId_userId:{ guildId:interaction.guildId, userId:u.id }}, update:{ xp: cur+amt }, create:{ guildId:interaction.guildId, userId:u.id, xp:amt, level:lvlNow }});
            return interaction.reply({ embeds:[embeds.success("XP","Gave "+amt+" to <@"+u.id+">")], flags: MessageFlags.Ephemeral});
        }
        if(sub==="remove"){
            const u=interaction.options.getUser("user",true); const amt=interaction.options.getInteger("amount",true);
            const row=await lvl.prisma.xp.findUnique({ where:{ guildId_userId:{ guildId:interaction.guildId, userId:u.id }}}).catch(()=>null);
            const cur=row? row.xp:0;
            await lvl.prisma.xp.upsert({ where:{ guildId_userId:{ guildId:interaction.guildId, userId:u.id }}, update:{ xp: Math.max(0,cur-amt) }, create:{ guildId:interaction.guildId, userId:u.id, xp:0, level:0 }});
            return interaction.reply({ embeds:[embeds.success("XP","Removed")], flags: MessageFlags.Ephemeral});
        }
        if(sub==="set"){
            const u=interaction.options.getUser("user",true); const amt=interaction.options.getInteger("amount",true);
            await lvl.prisma.xp.upsert({ where:{ guildId_userId:{ guildId:interaction.guildId, userId:u.id }}, update:{ xp: amt }, create:{ guildId:interaction.guildId, userId:u.id, xp:amt, level:0 }});
            return interaction.reply({ embeds:[embeds.success("XP","Set")], flags: MessageFlags.Ephemeral});
        }
        if(sub==="multiplier"){
            const v=interaction.options.getNumber("value");
            if(v===null){
                const cur=await lvl.getConfig(interaction.guildId);
                return interaction.reply({ embeds:[embeds.info("Multiplier", "x"+cur.xpMultiplier)], flags: MessageFlags.Ephemeral});
            }
            await lvl.setConfig(interaction.guildId,{ xpMultiplier:v });
            return interaction.reply({ embeds:[embeds.success("Updated","x"+v)], flags: MessageFlags.Ephemeral});
        }
    }
};