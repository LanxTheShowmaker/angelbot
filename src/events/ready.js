import { logger } from "../core/logger.js";
export default {
    name: "ready",
    once: true,
    execute(client) {
        logger.info("ready", `WINGS is online as ${client.user?.tag}`);
    },
};
//# sourceMappingURL=ready.js.map