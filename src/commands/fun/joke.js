import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { embeds } from "../../design/embeds.js";
const jokes=[
    "Why do angels never get lost? They always follow their halo.",
    "I told my computer a joke — it had a byte.",
    "Why did the server go to therapy? Too many breakdowns.",
    "Parallel lines have so much in common — they’ll never meet.",
    "Why do programmers prefer dark mode? Because light attracts bugs.",
    "I would tell you a UDP joke, but you might not get it.",
];
export default {
    data: new SlashCommandBuilder().setName("joke").setDescription("Random joke"),
    category:"Fun",
    async execute(interaction){
        const j = jokes[Math.floor(Math.random()*jokes.length)];
        const embed = embeds.panel("😂  Joke", `> *${j}*`, [], { footer:"A.N.G.E.L. • keep smiling"});
        await interaction.reply({ embeds:[embed], flags: MessageFlags.Ephemeral }).catch(()=>{});
    }
};
