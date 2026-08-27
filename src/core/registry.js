import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Collection } from "discord.js";
const here = path.dirname(fileURLToPath(import.meta.url));
async function walk(dir) {
    const out = [];
    if (!fs.existsSync(dir))
        return out;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory())
            out.push(...(await walk(full)));
        else if (entry.name.endsWith(".ts") || entry.name.endsWith(".js"))
            out.push(full);
    }
    return out;
}
export async function loadCommands() {
    const commands = new Collection();
    const files = await walk(path.join(here, "..", "commands"));
    for (const file of files) {
        const mod = await import(pathToFileURL(file).href);
        const cmd = mod.default ?? mod;
        if (cmd?.data?.name)
            commands.set(cmd.data.name, cmd);
    }
    return commands;
}
export async function loadEvents() {
    const events = [];
    const files = await walk(path.join(here, "..", "events"));
    for (const file of files) {
        const mod = await import(pathToFileURL(file).href);
        const ev = mod.default ?? mod;
        if (ev?.name)
            events.push(ev);
    }
    return events;
}
//# sourceMappingURL=registry.js.map