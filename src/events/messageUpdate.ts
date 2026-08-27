import type { Message, PartialMessage } from "discord.js";
import type { WingsClient } from "../core/client.js";

export default {
  name: "messageUpdate",
  async execute(oldMsg: Message | PartialMessage, newMsg: Message | PartialMessage, client: WingsClient) {
    if (oldMsg.author?.bot || newMsg.author?.bot) return;
    if (oldMsg.partial || newMsg.partial) return;
    if (!newMsg.inGuild()) return;
    if (oldMsg.content === newMsg.content) return;
    await client.services.logging
      .logMessage(newMsg.guild!, "edit", {
        authorTag: newMsg.author!.tag,
        authorId: newMsg.author!.id,
        channel: `#${(newMsg.channel as any).name ?? newMsg.channelId}`,
        content: newMsg.content,
        jumpUrl: newMsg.url,
      })
      .catch(() => {});
  },
};
