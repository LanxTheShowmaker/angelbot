import "dotenv/config";
import { REST, Routes } from "discord.js";
import { loadCommands } from "./registry.js";
import { logger } from "./logger.js";
async function deploy() {
    const token = process.env.DISCORD_TOKEN;
    const clientId = process.env.CLIENT_ID;
    if (!token || !clientId) {
        logger.error("deploy", "DISCORD_TOKEN and CLIENT_ID are required");
        process.exit(1);
    }
    const commands = await loadCommands();
    const body = commands.map((c) => c.data.toJSON());
    const rest = new REST({ version: "10" }).setToken(token);
    try {
        const args = process.argv.slice(2);
        const guildArg = args.find((a) => a === "--guild" || a.startsWith("--guild="));
        if (guildArg) {
            const guildId = guildArg.includes("=") ? guildArg.split("=")[1] : process.env.GUILD_ID;
            if (!guildId) {
                logger.error("deploy", "GUILD_ID is required for --guild deploy. Set GUILD_ID in .env or use --guild=ID");
                process.exit(1);
            }
            await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
            logger.info("deploy", `Deployed ${body.length} commands to guild ${guildId} (dev instant)`);
        }
        else {
            await rest.put(Routes.applicationCommands(clientId), { body });
            logger.info("deploy", `Deployed ${body.length} global commands (propagates up to 1h)`);
        }
    }
    catch (e) {
        const code = e?.code;
        if (code === 50001) {
            const cid = clientId;
            const url = `https://discord.com/oauth2/authorize?client_id=${cid}&permissions=8&scope=bot%20applications.commands`;
            logger.error("deploy", "Missing Access (50001): the bot is not in that server, or it was invited without the applications.commands scope.");
            logger.info("deploy", "Re-invite the bot using the link below (pick the correct server), then run `npm run deploy` again:");
            logger.info("deploy", url);
            process.exit(1);
        }
        logger.error("deploy", "failed to deploy commands", e);
        process.exit(1);
    }
}
deploy();
//# sourceMappingURL=deploy.js.map