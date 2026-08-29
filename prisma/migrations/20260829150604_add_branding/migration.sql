-- CreateTable
CREATE TABLE "GuildBranding" (
    "guildId" TEXT NOT NULL PRIMARY KEY,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "bannerUrl" TEXT,
    "nickname" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
