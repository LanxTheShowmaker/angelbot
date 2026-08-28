import { SlashCommandBuilder, MessageFlags, version as djsv } from "discord.js";
import { embeds } from "../../design/embeds.js";
import { Theme } from "../../design/theme.js";
export default {
    data: new SlashCommandBuilder().setName("botinfo").setDescription("About A.N.G.E.L."),
    category:"Utility",
    async execute(interaction){
        const bot = interaction.client.user;
        const embed = embeds.panel(`✦  ${bot.username}`, `*Heavenly service — crafted with grace, deployed with power.*`, [
            { name:"  Version", value:`> \`${interaction.client.guilds.cache.size} guilds\` • \`Node ${process.version}\` • \`d.js ${djsv}\``, inline:false },
            { name:"  Branches", value:"> `master` full • `cherub` 320MB • `pi` Pi 5 8GB", inline:true },
            { name:"  Uptime", value:`> <t:${Math.floor((Date.now()-interaction.client.uptime)/1000)}:R>`, inline:true },
        ], { author:{ name:`A.N.G.E.L. • Bot Info`, iconURL: bot.displayAvatarURL() }, footer:`A.N.G.E.L. • heavenly`});
        embed.setThumbnail(bot.displayAvatarURL({ size:256 }));
        embed.setColor(Theme.panel);
        await interaction.reply({ embeds:[embed], flags: MessageFlags.Ephemeral }).catch(()=>{});
    }
};
