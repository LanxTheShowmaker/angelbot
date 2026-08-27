import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Collection, type ChatInputCommandInteraction, type AutocompleteInteraction } from "discord.js";
import type { SlashCommandBuilder } from "discord.js";

const here = path.dirname(fileURLToPath(import.meta.url));

export interface CommandModule {
  data: SlashCommandBuilder;
  category: "Moderation" | "Config" | "Utility" | "Tickets" | "Server";
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}

export interface EventModule {
  name: string;
  once?: boolean;
  execute: (...args: any[]) => void | Promise<void>;
}

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.name.endsWith(".ts") || entry.name.endsWith(".js")) out.push(full);
  }
  return out;
}

export async function loadCommands(): Promise<Collection<string, CommandModule>> {
  const commands = new Collection<string, CommandModule>();
  const files = await walk(path.join(here, "..", "commands"));
  for (const file of files) {
    const mod = await import(pathToFileURL(file).href);
    const cmd: CommandModule = mod.default ?? mod;
    if (cmd?.data?.name) commands.set(cmd.data.name, cmd);
  }
  return commands;
}

export async function loadEvents(): Promise<EventModule[]> {
  const events: EventModule[] = [];
  const files = await walk(path.join(here, "..", "events"));
  for (const file of files) {
    const mod = await import(pathToFileURL(file).href);
    const ev: EventModule = mod.default ?? mod;
    if (ev?.name) events.push(ev);
  }
  return events;
}
