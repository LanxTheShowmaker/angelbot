import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { embeds } from "../../design/embeds.js";
export default {
    data: new SlashCommandBuilder().setName("coinflip").setDescription("Flip a coin"),
    category:"Fun",
    async execute(interaction){
        const flip = Math.random()<0.5 ? "Heads" : "Tails";
        const emoji = flip==="Heads" ? "🪙" : "🌙";
        const embed = embeds.info(`${emoji}  Coinflip`, `**${flip}!** — *the cosmos has spoken.*`);
        await interaction.reply({ embeds:[embed], flags: MessageFlags.Ephemeral }).catch(()=>{});
    }
};
