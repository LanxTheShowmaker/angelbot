export default {
    name: "guildMemberRemove",
    async execute(member, client) {
        await client.services.logging.logMember(member.guild, "leave", { tag: member.user.tag, id: member.id }).catch(() => { });
    },
};
//# sourceMappingURL=guildMemberRemove.js.map