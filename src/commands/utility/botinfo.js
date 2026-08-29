import { SlashCommandBuilder, MessageFlags, version as djsv } from "discord.js";
import { embeds } from "../../design/embeds.js";
import { Theme } from "../../design/theme.js";
export default {
    data: new SlashCommandBuilder().setName("botinfo").setDescription("About A.N.G.E.L."),
    category:"Utility",
    async execute(interaction){
        const bot = interaction.client.user;
        const embed = embeds.panel(`${bot.username}`, `Discord bot for server management.`, [
            { name:"Servers", value:`\`${interaction.client.guilds.cache.size}\``, inline:true },
            { name:"Uptime", value:`<t:${Math.floor((Date.now()-interaction.client.uptime)/1000)}:R>`, inline:true },
            { name:"Version", value:`\`d.js ${djsv}\` • \`Node ${process.version}\``, inline:true },
        ], { author:{ name:`A.N.G.E.L. • Bot Info`, iconURL: bot.displayAvatarURL() }, footer:`A.N.G.E.L. • Discord Management Platform`});
        embed.setThumbnail(bot.displayAvatarURL({ size:256 }));
        embed.setColor(Theme.panel);
        await interaction.reply({ embeds:[embed], flags: MessageFlags.Ephemeral }).catch(()=>{});
    }
};
