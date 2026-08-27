import type { GuildMember } from "discord.js";
import type { WingsClient } from "../core/client.js";

export default {
  name: "guildMemberRemove",
  async execute(member: GuildMember, client: WingsClient) {
    await client.services.logging.logMember(member.guild, "leave", { tag: member.user.tag, id: member.id }).catch(() => {});
  },
};
