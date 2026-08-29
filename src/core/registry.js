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
function getBranch(){
    try{
        const head=fs.readFileSync(path.join(process.cwd(),".git","HEAD"),"utf8").trim();
        // head is like "ref: refs/heads/cherub"
        const m=head.match(/refs\/heads\/(.+)/);
        if(m) return m[1];
    }catch{}
    if(fs.existsSync(path.join(process.cwd(),"index.js")) && fs.existsSync(path.join(process.cwd(),"README_CHERUB.md"))) return "cherub";
    if(fs.existsSync(path.join(process.cwd(),"setup-pi.sh"))) return "seraph";
    return "master";
}
function isHeavyCommand(file){
    // Heavy features that cherub (320MB/1GB) should skip to save RAM/disk — keep essentials
    const heavy=["analytics","automation","audit","backup","intelligence"];
    const base=path.basename(file).replace(".js","");
    // Also filter analytics_extra / audit_extra but keep diagnostics/health/status for troubleshooting
    if(base==="analytics_extra" || base==="audit_extra") return true;
    return heavy.some(h=> base===h || file.includes(`/analytics/`) || file.includes(`/automation/`));
}
export async function loadCommands() {
    const commands = new Collection();
    const branch=getBranch();
    const files = await walk(path.join(here, "..", "commands"));
    for (const file of files) {
        // Cherub: skip heavy commands to preserve 256MB heap / 1GB disk
        if(branch==="cherub" && isHeavyCommand(file)){
            continue;
        }
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