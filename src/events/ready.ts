import type { WingsClient } from "../core/client.js";
import { logger } from "../core/logger.js";

export default {
  name: "ready",
  once: true,
  execute(client: WingsClient) {
    logger.info("ready", `WINGS is online as ${client.user?.tag}`);
  },
};
