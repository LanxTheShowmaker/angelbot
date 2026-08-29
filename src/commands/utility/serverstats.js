import { SlashCommandBuilder, MessageFlags, EmbedBuilder } from "discord.js";
import { Theme } from "../../design/theme.js";
export default {
    data: new SlashCommandBuilder().setName("serverstats").setDescription("Server statistics"),
    category:"Utility",
    async execute(interaction){
        const g=interaction.guild;
        const embed=new EmbedBuilder().setColor(Theme.panel).setTitle(g.name+" — Stats").addFields({name:"Members",value:String(g.memberCount),inline:true},{name:"Channels",value:String(g.channels.cache.size),inline:true},{name:"Roles",value:String(g.roles.cache.size),inline:true},{name:"Created",value:"<t:"+Math.floor(g.createdAt.getTime()/1000)+":R>",inline:true});
        return interaction.reply({ embeds:[embed], flags: MessageFlags.Ephemeral});
    }
};