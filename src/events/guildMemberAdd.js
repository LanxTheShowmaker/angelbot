export default {
    name: "guildMemberAdd",
    async execute(member, client) {
        const guildId=member.guild.id;
        await client.services.logging.logMember(member.guild, "join", { tag: member.user.tag, id: member.id }).catch(() => { });
        await client.services.audit?.log(guildId,{ actorId: member.id, action:"join", category:"member", details:{ tag: member.user.tag }}).catch(()=>{});
        await client.services.welcome.handleJoin(member).catch(()=>{});
        await client.services.automod.handleJoin(member).catch(()=>{});
        // Raid: track join burst
        const joins=client.services.raid?.trackJoin(guildId) ?? 0;
        if(joins>5) client.services.raid?.maybeTrigger(member.guild, "join_spike").catch(()=>{});
        // Intelligence: assess new account
        try{
            const ageMs=Date.now() - (member.user.createdAt?.getTime() ?? Date.now());
            const score=client.services.intelligence?.scoreJoin({ accountAgeMs: ageMs, recentJoinsCount: joins });
            if(score && score.level==="HIGH") client.services.audit?.log(guildId,{ actorId: member.id, action:"suspicious_join", category:"automod", details: score }).catch(()=>{});
        }catch{}
        client.services.automation?.trigger(guildId,"memberJoin",{ userId: member.id, accountAge: member.user.createdAt }).catch(()=>{});
        // Analytics handled via audit
    },
};
//# sourceMappingURL=guildMemberAdd.js.map