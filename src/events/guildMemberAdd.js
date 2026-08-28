export default {
    name: "guildMemberAdd",
    async execute(member, client) {
        await client.services.logging.logMember(member.guild, "join", { tag: member.user.tag, id: member.id }).catch(() => { });
        await client.services.welcome.handleJoin(member).catch(()=>{});
        await client.services.automod.handleJoin(member).catch(()=>{});
    },
};
//# sourceMappingURL=guildMemberAdd.js.map