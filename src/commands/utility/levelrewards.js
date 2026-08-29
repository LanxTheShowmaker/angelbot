import { SlashCommandBuilder, MessageFlags, EmbedBuilder, RoleSelectMenuBuilder, ActionRowBuilder } from "discord.js";
import { embeds } from "../../design/embeds.js";
import { isStaff } from "../../core/services.js";
export default {
    data: new SlashCommandBuilder().setName("levelrewards").setDescription("Level role rewards").addSubcommand(s=> s.setName("list").setDescription("List")).addSubcommand(s=> s.setName("add").setDescription("Add").addIntegerOption(o=>o.setName("level").setDescription("Level").setRequired(true)).addRoleOption(o=>o.setName("role").setDescription("Role").setRequired(true))).addSubcommand(s=> s.setName("remove").setDescription("Remove").addIntegerOption(o=>o.setName("level").setDescription("Level").setRequired(true))),
    category:"Config",
    async execute(interaction){
        const sub=interaction.options.getSubcommand();
        const lvl=interaction.client.services.leveling;
        if(sub==="list"){
            const cfg=await lvl.getConfig(interaction.guildId);
            return interaction.reply({ embeds:[embeds.info("Rewards", cfg.roleRewards.map(r=> `Lv${r.level} → <@&${r.roleId}>`).join("\n")||"None")], flags: MessageFlags.Ephemeral});
        }
        if(!isStaff(interaction.member, await interaction.client.services.settings.get(interaction.guildId).catch(()=>null))) return interaction.reply({ embeds:[embeds.error("Staff only","")], flags: MessageFlags.Ephemeral});
        if(sub==="add"){
            const lv=interaction.options.getInteger("level",true); const role=interaction.options.getRole("role",true);
            const cfg=await lvl.getConfig(interaction.guildId);
            const arr=[...cfg.roleRewards.filter(r=> r.level!==lv), { level:lv, roleId:role.id }];
            await lvl.setConfig(interaction.guildId,{ roleRewards: arr });
            return interaction.reply({ embeds:[embeds.success("Added",`Lv${lv} → <@&${role.id}>`)], flags: MessageFlags.Ephemeral});
        }
        if(sub==="remove"){
            const lv=interaction.options.getInteger("level",true);
            const cfg=await lvl.getConfig(interaction.guildId);
            await lvl.setConfig(interaction.guildId,{ roleRewards: cfg.roleRewards.filter(r=> r.level!==lv)});
            return interaction.reply({ embeds:[embeds.success("Removed","")] , flags: MessageFlags.Ephemeral});
        }
    }
};