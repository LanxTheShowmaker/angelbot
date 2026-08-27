import type { Message } from "discord.js";
import type { WingsClient } from "../core/client.js";
import { isIgnored } from "../core/services.js";
import { logger } from "../core/logger.js";

export default {
  name: "messageCreate",
  async execute(message: Message, client: WingsClient) {
    if (message.author.bot || message.system) return;
    const config = await client.services.settings.get(message.guildId!).catch(() => null);
    if (config && (config.modules as Record<string, boolean>).automod !== false && !isIgnored(message.member!, config)) {
      await client.services.automod.handleMessage(message).catch((e: unknown) => logger.error("automod", "handler failed", e));
    }
  },
};
