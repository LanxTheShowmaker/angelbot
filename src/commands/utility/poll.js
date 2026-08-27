import { SlashCommandBuilder } from "discord.js";
import { defer } from "../moderation/shared.js";
import { embeds } from "../../design/embeds.js";
import { logger } from "../../core/logger.js";
export default {
    data: new SlashCommandBuilder()
        .setName("poll")
        .setDescription("Create a poll with up to 10 options")
        .addStringOption((o) => o.setName("question").setDescription("The poll question").setRequired(true))
        .addStringOption((o) => o.setName("option1").setDescription("Option 1").setRequired(true))
        .addStringOption((o) => o.setName("option2").setDescription("Option 2").setRequired(true))
        .addStringOption((o) => o.setName("option3").setDescription("Option 3").setRequired(false))
        .addStringOption((o) => o.setName("option4").setDescription("Option 4").setRequired(false))
        .addStringOption((o) => o.setName("option5").setDescription("Option 5").setRequired(false))
        .addStringOption((o) => o.setName("option6").setDescription("Option 6").setRequired(false))
        .addStringOption((o) => o.setName("option7").setDescription("Option 7").setRequired(false))
        .addStringOption((o) => o.setName("option8").setDescription("Option 8").setRequired(false))
        .addStringOption((o) => o.setName("option9").setDescription("Option 9").setRequired(false))
        .addStringOption((o) => o.setName("option10").setDescription("Option 10").setRequired(false)),
    category: "Utility",
    async execute(interaction) {
        await defer(interaction, false);
        const client = interaction.client;
        const guild = interaction.guild;
        const channel = interaction.channel;
        const question = interaction.options.getString("question", true);
        const options = [];
        for (let i = 1; i <= 10; i++) {
            const v = interaction.options.getString(`option${i}`);
            if (v && v.trim())
                options.push({ label: v.trim().slice(0, 80), votes: 0 });
        }
        if (options.length < 2) {
            await interaction.editReply({ embeds: [embeds.error("Not enough options", "Provide at least 2 options.")] });
            return;
        }
        try {
            const baseEmbed = embeds.neutral("Poll", question, options.map((o, i) => ({
                name: `${i + 1}. ${o.label}`.slice(0, 256),
                value: `${o.votes} vote${o.votes === 1 ? "" : "s"}`,
                inline: true,
            })));
            const msg = await channel.send({ embeds: [baseEmbed] });
            const rows = client.services.utility.buildPollButtons(msg.id, options);
            await msg.edit({ components: rows });
            await client.services.utility.createPoll({
                guildId: guild.id,
                channelId: channel.id,
                messageId: msg.id,
                authorId: interaction.user.id,
                question,
                options,
            });
            await interaction.editReply({ embeds: [embeds.success("Poll created", "Your poll is live in this channel.")] });
        }
        catch (e) {
            logger.error("utility", "poll failed", e);
            await interaction.editReply({ embeds: [embeds.error("Poll failed", "Could not create the poll.")] });
        }
    },
};
//# sourceMappingURL=poll.js.map