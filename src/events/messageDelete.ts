import type { Message, PartialMessage } from "discord.js";
import type { WingsClient } from "../core/client.js";

export default {
  name: "messageDelete",
  async execute(message: Message | PartialMessage, client: WingsClient) {
    if (message.partial) return;
    if (message.author?.bot) return;
    if (!message.inGuild()) return;
    await client.services.logging
      .logMessage(message.guild!, "delete", {
        authorTag: message.author!.tag,
        authorId: message.author!.id,
        channel: `#${(message.channel as any).name ?? message.channelId}`,
        content: message.content,
      })
      .catch(() => {});
  },
};
