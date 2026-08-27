import type { GuildMember } from "discord.js";
import type { WingsClient } from "../core/client.js";

export default {
  name: "guildMemberAdd",
  async execute(member: GuildMember, client: WingsClient) {
    await client.services.logging.logMember(member.guild, "join", { tag: member.user.tag, id: member.id }).catch(() => {});
  },
};
