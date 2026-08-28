export default {
    name: "messageUpdate",
    async execute(oldMsg, newMsg, client) {
        if (oldMsg.author?.bot || newMsg.author?.bot)
            return;
        if (oldMsg.partial || newMsg.partial)
            return;
        if (!newMsg.inGuild())
            return;
        if (oldMsg.content === newMsg.content)
            return;
        await client.services.logging
            .logMessage(newMsg.guild, "edit", {
            authorTag: newMsg.author.tag,
            authorId: newMsg.author.id,
            channel: `#${newMsg.channel.name ?? newMsg.channelId}`,
            content: newMsg.content,
            jumpUrl: newMsg.url,
        })
            .catch(() => { });
        // AutoMod edited message detection (conservative, deduplicate)
        await client.services.automod.handleMessageUpdate(oldMsg, newMsg).catch(() => {});
    },
};
//# sourceMappingURL=messageUpdate.js.map