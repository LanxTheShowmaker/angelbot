import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType } from "discord.js";
import { embeds } from "../../design/embeds.js";
export default {
    data: new SlashCommandBuilder().setName("giveaway").setDescription("Giveaways").addSubcommand(s=>s.setName("create").setDescription("Create giveaway").addChannelOption(o=>o.setName("channel").setDescription("Channel").addChannelTypes(ChannelType.GuildText).setRequired(true)).addStringOption(o=>o.setName("prize").setDescription("Prize").setRequired(true)).addIntegerOption(o=>o.setName("winners").setDescription("Winners").setMinValue(1).setMaxValue(10).setRequired(true)).addStringOption(o=>o.setName("duration").setDescription("e.g. 1h, 1d").setRequired(true))),
    category:"Utility",
    async execute(interaction){
        const sub=interaction.options.getSubcommand();
        if(sub==="create"){
            if(!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({ embeds:[embeds.error("No perm","ManageGuild")], flags: MessageFlags.Ephemeral });
            const ch=interaction.options.getChannel("channel");
            const prize=interaction.options.getString("prize");
            const winners=interaction.options.getInteger("winners");
            const dur=interaction.options.getString("duration");
            const ms = (()=>{ const m=dur.match(/^(\d+)(s|m|h|d)$/); if(!m) return 3600000; const v=BigInt(m[1]); const u=m[2]; const mult={s:1n,m:60n,h:3600n,d:86400n}; return Number(v*mult[u]*1000n); })();
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const msg = await interaction.client.services.giveaways.create(interaction.guild, ch, prize, winners, new Date(Date.now()+ms));
            await interaction.editReply({ content:`Giveaway ${msg.url}` });
        }
    }
};
