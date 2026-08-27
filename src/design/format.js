import { GuildMember } from "discord.js";
export function userTag(user) {
    const u = user instanceof GuildMember ? user.user : user;
    if (!u)
        return "unknown";
    return u.discriminator && u.discriminator !== "0" ? `${u.username}#${u.discriminator}` : u.username;
}
//# sourceMappingURL=format.js.map