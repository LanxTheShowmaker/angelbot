import { SlashCommandBuilder, MessageFlags, EmbedBuilder } from "discord.js";
export default {
    data: new SlashCommandBuilder().setName("xpstats").setDescription("XP statistics"),
    category:"Utility",
    async execute(interaction){
        const guildId=interaction.guildId;
        const total=await interaction.client.prisma.xp.count({ where:{ guildId }}).catch(()=>0);
        const top=await interaction.client.services.leveling.getLeaderboard(guildId,5);
        const embed=new EmbedBuilder().setColor(0x9b8ecf).setTitle("XP Stats").addFields({name:"Total",value:String(total),inline:true},{name:"Top",value: top.rows.map((r,i)=> `${i+1}. <@${r.userId}> Lv${r.level}`).join("\n")||"—"});
        return interaction.reply({ embeds:[embed], flags: MessageFlags.Ephemeral});
    }
};