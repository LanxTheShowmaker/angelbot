import type { User } from "discord.js";

export function userTag(user: User): string {
  return user.discriminator && user.discriminator !== "0" ? `${user.username}#${user.discriminator}` : user.username;
}
