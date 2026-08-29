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
    const r=await loadCommandsWithDiagnostics();
    return r.commands;
}
export async function loadCommandsWithDiagnostics() {
    const commands = new Collection();
    const branch=getBranch();
    const dir=path.join(here, "..", "commands");
    const files = await walk(dir);
    // Filter out non-command helpers (shared.js, etc.)
    const commandFiles=files.filter(f=>{
        const base=path.basename(f);
        if(base==="shared.js") return false;
        if(base==="cases.js" && f.includes("moderation")) return false; // moderation/cases.js is helper? Actually src/commands/moderation/cases.js is a command, keep
        // Keep all other .js, but will be validated via data.name
        return true;
    });
    const discovered=commandFiles.length;
    let loaded=0, failed=0;
    const failures=[];
    const serializeFailures=[];
    for (const file of commandFiles) {
        // Cherub: skip heavy commands to preserve 256MB heap / 1GB disk
        if(branch==="cherub" && isHeavyCommand(file)){
            continue;
        }
        try{
            const mod = await import(pathToFileURL(file).href + `?v=${Date.now()}:${Math.random()}`);
            const cmd = mod.default ?? mod;
            if (!cmd?.data?.name){
                failed++;
                failures.push({ file: path.relative(process.cwd(), file), error: "Missing data.name" });
                console.log(`COMMAND REGISTRATION ERROR FILE: ${path.relative(process.cwd(), file)} ERROR: Missing data.name`);
                continue;
            }
            // Validate serialization eagerly
            try{
                cmd.data.toJSON();
            }catch(e){
                failed++;
                serializeFailures.push({ file: path.relative(process.cwd(), file), name: cmd.data.name, error: e.message });
                console.log(`COMMAND REGISTRATION ERROR FILE: ${path.relative(process.cwd(), file)} COMMAND: ${cmd.data.name} ERROR: ${e.message}`);
                continue;
            }
            if(commands.has(cmd.data.name)){
                failed++;
                failures.push({ file: path.relative(process.cwd(), file), error: `Duplicate command name: ${cmd.data.name}` });
                console.log(`COMMAND REGISTRATION ERROR FILE: ${path.relative(process.cwd(), file)} ERROR: Duplicate ${cmd.data.name}`);
                continue;
            }
            commands.set(cmd.data.name, cmd);
            loaded++;
        }catch(e){
            failed++;
            failures.push({ file: path.relative(process.cwd(), file), error: e.message });
            console.log(`COMMAND REGISTRATION ERROR FILE: ${path.relative(process.cwd(), file)} ERROR: ${e.message}`);
            console.log(e.stack);
        }
    }
    // Count serialized
    let serialized=0;
    const serFails=[];
    for(const [name,cmd] of commands){
        try{ cmd.data.toJSON(); serialized++; }catch(e){ serFails.push({ file: name, name, error:e.message }); }
    }
    return { commands, dir, discovered, loaded, failed, failures, serialized, serializeFailures: [...serializeFailures, ...serFails] };
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