import "dotenv/config";
import { GatewayIntentBits, Partials } from "discord.js";
import { WingsClient } from "./client.js";
import { loadCommands, loadEvents } from "./registry.js";
import { createServices } from "./services.js";
import { logger } from "./logger.js";
async function main() {
    const token = process.env.DISCORD_TOKEN;
    if (!token) {
        logger.error("bootstrap", "DISCORD_TOKEN is missing");
        process.exit(1);
    }
    const client = new WingsClient({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildBans,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildVoiceStates,
        ],
        partials: [Partials.GuildMember, Partials.Message, Partials.Channel],
    });
    client.services = createServices(client);
    client.commands = await loadCommands();
    const events = await loadEvents();
    for (const event of events) {
        if (event.once)
            client.once(event.name, (...args) => event.execute(...args, client));
        else
            client.on(event.name, (...args) => event.execute(...args, client));
    }
    await client.login(token);
    logger.info("bootstrap", `A.N.G.E.L. online as ${client.user?.tag ?? "unknown"}`);
}
main().catch((e) => {
    logger.error("bootstrap", "fatal startup error", e);
    process.exit(1);
});
//# sourceMappingURL=bootstrap.js.map