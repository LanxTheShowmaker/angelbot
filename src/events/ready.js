import { logger } from "../core/logger.js";
export default {
    name: "clientReady",
    once: true,
    execute(client) {
        logger.info("ready", `WINGS is online as ${client.user?.tag}`);
    },
};
//# sourceMappingURL=ready.js.map