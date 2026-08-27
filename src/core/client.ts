import { Client, Collection } from "discord.js";
import type { Services } from "./services.js";
import type { CommandModule } from "./registry.js";

export class WingsClient extends Client {
  services!: Services;
  commands = new Collection<string, CommandModule>();
  components = new Collection<string, (interaction: any) => Promise<void>>();
}
