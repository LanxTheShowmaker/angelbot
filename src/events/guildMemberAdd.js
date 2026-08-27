export default {
    name: "guildMemberAdd",
    async execute(member, client) {
        await client.services.logging.logMember(member.guild, "join", { tag: member.user.tag, id: member.id }).catch(() => { });
    },
};
//# sourceMappingURL=guildMemberAdd.js.map