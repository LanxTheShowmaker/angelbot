import { SlashCommandBuilder, MessageFlags, EmbedBuilder } from "discord.js";
import { embeds } from "../../design/embeds.js";
import { isStaff } from "../../core/services.js";
export default {
    data: new SlashCommandBuilder().setName("tickets").setDescription("Ticket system config")
        .addSubcommand(s=> s.setName("setup").setDescription("Setup panels"))
        .addSubcommand(s=> s.setName("categories").setDescription("List categories"))
        .addSubcommand(s=> s.setName("forms").setDescription("List forms"))
        .addSubcommand(s=> s.setName("staff").setDescription("Staff settings"))
        .addSubcommand(s=> s.setName("settings").setDescription("Ticket settings"))
        .addSubcommand(s=> s.setName("panel").setDescription("Panel status")),
    category:"Config",
    async execute(interaction){
        const sub=interaction.options.getSubcommand();
        if(sub==="setup") return interaction.reply({ embeds:[embeds.info("Setup","Use /setuptickets")], flags: MessageFlags.Ephemeral});
        if(sub==="categories"){
            const types=await interaction.client.prisma.ticketType.findMany({ where:{ guildId: interaction.guildId }}).catch(()=>[]);
            return interaction.reply({ embeds:[embeds.info("Categories", types.map(t=> (t.emoji||"")+" **"+t.displayName+"** (`"+t.key+"`) max"+t.maxOpen).join("\n")||"None")], flags: MessageFlags.Ephemeral});
        }
        if(sub==="forms"){
            const types=await interaction.client.prisma.ticketType.findMany({ where:{ guildId: interaction.guildId }}).catch(()=>[]);
            return interaction.reply({ embeds:[embeds.info("Forms", types.map(t=> `${t.displayName}: ${JSON.parse(t.questions||"[]").length} questions`).join("\n")||"None")], flags: MessageFlags.Ephemeral});
        }
        if(sub==="staff") return interaction.reply({ embeds:[embeds.info("Staff","Configure via /setuptickets and /autosetup")], flags: MessageFlags.Ephemeral});
        if(sub==="settings") return interaction.reply({ embeds:[embeds.info("Settings","Use /config")], flags: MessageFlags.Ephemeral});
        if(sub==="panel") return interaction.reply({ embeds:[embeds.info("Panel","Use /setuptickets")], flags: MessageFlags.Ephemeral});
    }
};