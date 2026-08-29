import { SlashCommandBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { embeds } from "../../design/embeds.js";
export default {
    data: new SlashCommandBuilder().setName("rps").setDescription("Rock Paper Scissors vs A.N.G.E.L."),
    category:"Fun",
    async execute(interaction){
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`rps:${interaction.id}:rock`).setLabel("Rock").setStyle(ButtonStyle.Secondary).setEmoji("🪨"),
            new ButtonBuilder().setCustomId(`rps:${interaction.id}:paper`).setLabel("Paper").setStyle(ButtonStyle.Secondary).setEmoji("📄"),
            new ButtonBuilder().setCustomId(`rps:${interaction.id}:scissors`).setLabel("Scissors").setStyle(ButtonStyle.Secondary).setEmoji("✂️"),
        );
        const embed = embeds.panel("✦  Rock • Paper • Scissors", `*Choose your move — best of one, .*`, [], { footer:`A.N.G.E.L. • make your choice`});
        await interaction.reply({ embeds:[embed], components:[row], flags: MessageFlags.Ephemeral }).catch(()=>{});
        const client = interaction.client;
        const key = `rps:${interaction.id}`;
        client.components.set(`${key}:rock`, async (i)=> handle(i,"rock"));
        client.components.set(`${key}:paper`, async (i)=> handle(i,"paper"));
        client.components.set(`${key}:scissors`, async (i)=> handle(i,"scissors"));
        async function handle(i, userChoice){
            const choices=["rock","paper","scissors"];
            const bot=choices[Math.floor(Math.random()*3)];
            const win = (userChoice==="rock"&&bot==="scissors")||(userChoice==="paper"&&bot==="rock")||(userChoice==="scissors"&&bot==="paper");
            const tie=userChoice===bot;
            const res = tie ? "Draw — the heavens are balanced." : win ? `You win — ${userChoice} beats ${bot}!` : `You lose — ${bot} beats ${userChoice}.`;
            await i.update({ embeds:[embeds.info(tie?"Draw":win?"Victory":"Defeat", `> You: **${userChoice}**\n> A.N.G.E.L.: **${bot}**\n\n*${res}*`)], components:[] }).catch(()=>{});
        }
    }
};
