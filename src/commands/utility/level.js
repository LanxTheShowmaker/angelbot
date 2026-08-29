import { SlashCommandBuilder, MessageFlags, EmbedBuilder } from "discord.js";
import { embeds } from "../../design/embeds.js";
import { Theme } from "../../design/theme.js";
import { isStaff } from "../../core/services.js";
export default {
    data: new SlashCommandBuilder().setName("level").setDescription("Leveling V5")
        .addSubcommand(s=> s.setName("profile").setDescription("XP card/profile").addUserOption(o=>o.setName("user").setDescription("User")))
        .addSubcommand(s=> s.setName("weekly").setDescription("Weekly leaderboard"))
        .addSubcommand(s=> s.setName("monthly").setDescription("Monthly leaderboard"))
        .addSubcommand(s=> s.setName("streak").setDescription("Show streak").addUserOption(o=>o.setName("user").setDescription("User")))
        .addSubcommand(s=> s.setName("prestige").setDescription("Prestige (level 50)"))
        .addSubcommand(s=> s.setName("config").setDescription("Configure leveling (staff)").addNumberOption(o=>o.setName("multiplier").setDescription("Global XP multiplier 0.1-5")).addChannelOption(o=>o.setName("announce").setDescription("Announce channel")).addBooleanOption(o=>o.setName("streak").setDescription("Enable streaks")).addBooleanOption(o=>o.setName("antifarm").setDescription("Anti-farm"))),
    category:"Utility",
    async execute(interaction){
        const sub=interaction.options.getSubcommand();
        const lvl=interaction.client.services.leveling;
        if(sub==="profile"){
            const user=interaction.options.getUser("user") ?? interaction.user;
            const card=await lvl.getCard(interaction.guildId, user.id);
            if(!card) return interaction.reply({ embeds:[embeds.info("No XP", `No XP for ${user.tag}`)], flags: MessageFlags.Ephemeral});
            const embed=new EmbedBuilder().setColor(Theme.gold).setAuthor({ name:`${user.tag} — Lv ${card.level}`, iconURL:user.displayAvatarURL()}).setThumbnail(user.displayAvatarURL())
                .setDescription(`**XP** ${card.xp}/${card.progress.need} ${card.progress.bar} ${card.progress.pct}%\n**Rank** #${card.rank}/${card.total}\n**Streak** ${card.streak} (longest ${card.longest})\n*Total for next: ${card.progress.need - card.xp} XP*`).setFooter({ text:"A.N.G.E.L. • leveling V5"}).setTimestamp();
            return interaction.reply({ embeds:[embed], flags: MessageFlags.Ephemeral});
        }
        if(sub==="weekly"){
            const board=await lvl.getWeeklyLeaderboard(interaction.guildId,10);
            const embed=new EmbedBuilder().setColor(Theme.gold).setTitle("Weekly Leaderboard").setDescription(board.rows.length? board.rows.map((r,i)=> `${i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}.`} <@${r.userId}> Lv${r.level} ${r.xp}xp`).join("\n") : "*No activity this week*").setFooter({ text:`${board.total} active`});
            return interaction.reply({ embeds:[embed], flags: MessageFlags.Ephemeral});
        }
        if(sub==="monthly"){
            const board=await lvl.getMonthlyLeaderboard(interaction.guildId,10);
            const embed=new EmbedBuilder().setColor(Theme.gold).setTitle("Monthly Leaderboard").setDescription(board.rows.length? board.rows.map((r,i)=> `${i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}.`} <@${r.userId}> Lv${r.level}`).join("\n") : "*No activity*");
            return interaction.reply({ embeds:[embed], flags: MessageFlags.Ephemeral});
        }
        if(sub==="streak"){
            const user=interaction.options.getUser("user") ?? interaction.user;
            const s=await lvl.getStreak(interaction.guildId, user.id);
            const embed=new EmbedBuilder().setColor(Theme.panel).setAuthor({ name:`${user.tag} — Streak`, iconURL:user.displayAvatarURL()}).setDescription(s? `**${s.streak}** days (longest ${s.longest})` : "*No streak yet — chat daily*");
            return interaction.reply({ embeds:[embed], flags: MessageFlags.Ephemeral});
        }
        if(sub==="prestige"){
            const res=await lvl.prestige(interaction.guildId, interaction.user.id);
            if(!res.success) return interaction.reply({ embeds:[embeds.error("Cannot prestige", res.reason)], flags: MessageFlags.Ephemeral});
            return interaction.reply({ embeds:[embeds.success("Prestiged!", `Reset from Lv ${res.oldLevel} — awarded 1000 coins`)], flags: MessageFlags.Ephemeral});
        }
        if(sub==="config"){
            const cfg=await interaction.client.services.settings.get(interaction.guildId).catch(()=>null);
            if(!isStaff(interaction.member,cfg)) return interaction.reply({ embeds:[embeds.error("No perm","Staff only")], flags: MessageFlags.Ephemeral});
            const patch={};
            const mult=interaction.options.getNumber("multiplier");
            const ch=interaction.options.getChannel("announce");
            const streak=interaction.options.getBoolean("streak");
            const af=interaction.options.getBoolean("antifarm");
            if(mult!==null) patch.xpMultiplier=mult;
            if(ch) patch.announceChannelId=ch.id;
            if(streak!==null) patch.streakEnabled=streak;
            if(af!==null) patch.antiFarmEnabled=af;
            if(Object.keys(patch).length===0){
                const cur=await lvl.getConfig(interaction.guildId);
                return interaction.reply({ embeds:[embeds.info("Level Config", `x${cur.xpMultiplier} • streak:${cur.streakEnabled} • antiFarm:${cur.antiFarmEnabled}\nAnnounce: ${cur.announceChannelId?`<#${cur.announceChannelId}>`:"—"}`)], flags: MessageFlags.Ephemeral});
            }
            await lvl.setConfig(interaction.guildId, patch);
            return interaction.reply({ embeds:[embeds.success("Updated","Level config saved")], flags: MessageFlags.Ephemeral});
        }
    }
};
