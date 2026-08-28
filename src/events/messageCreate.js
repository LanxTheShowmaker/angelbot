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
        // Public features — all guild-isolated, no-ops if disabled
        await client.services.leveling.handleMessage(message).catch((e)=>logger.error("leveling","handle",e));
        await client.services.economy.handleMessage(message).catch((e)=>logger.error("economy","handle",e));
        await client.services.afk.handleMessage(message).catch((e)=>logger.error("afk","handle",e));
    },
};
//# sourceMappingURL=messageCreate.js.map