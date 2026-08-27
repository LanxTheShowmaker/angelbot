export default {
    name: "guildMemberAdd",
    async execute(member, client) {
        await client.services.automod.handleJoin(member).catch(() => { });
    },
};
//# sourceMappingURL=automodJoin.js.map