export default {
    name: "guildMemberRemove",
    async execute(member, client) {
        const guildId=member.guild?.id ?? member.id;
        await client.services.logging.logMember(member.guild, "leave", { tag: member.user.tag, id: member.id }).catch(() => { });
        await client.services.audit?.log(guildId,{ actorId: member.id, action:"leave", category:"member", details:{ tag: member.user.tag }}).catch(()=>{});
        client.services.automation?.trigger(guildId,"memberLeave",{ userId: member.id }).catch(()=>{});
    },
};
//# sourceMappingURL=guildMemberRemove.js.map