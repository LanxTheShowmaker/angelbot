export function userTag(user) {
    return user.discriminator && user.discriminator !== "0" ? `${user.username}#${user.discriminator}` : user.username;
}
//# sourceMappingURL=format.js.map