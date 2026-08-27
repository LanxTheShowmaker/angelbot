import { isIgnored } from "../core/services.js";
import { logger } from "../core/logger.js";
export default {
    name: "messageCreate",
    async execute(message, client) {
        if (message.author.bot || message.system)
            return;
        const config = await client.services.settings.get(message.guildId).catch(() => null);
        if (config && config.modules.automod !== false && !isIgnored(message.member, config)) {
            await client.services.automod.handleMessage(message).catch((e) => logger.error("automod", "handler failed", e));
        }
    },
};
//# sourceMappingURL=messageCreate.js.map