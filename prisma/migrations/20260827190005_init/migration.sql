-- CreateTable
CREATE TABLE "GuildConfig" (
    "guildId" TEXT NOT NULL PRIMARY KEY,
    "logChannelId" TEXT,
    "modLogChannelId" TEXT,
    "welcomeChannelId" TEXT,
    "goodbyeChannelId" TEXT,
    "staffRoleIds" TEXT NOT NULL DEFAULT '[]',
    "moderatorRoleIds" TEXT NOT NULL DEFAULT '[]',
    "ignoredChannelIds" TEXT NOT NULL DEFAULT '[]',
    "ignoredRoleIds" TEXT NOT NULL DEFAULT '[]',
    "ignoredUserIds" TEXT NOT NULL DEFAULT '[]',
    "modules" TEXT NOT NULL DEFAULT '{}',
    "automod" TEXT NOT NULL DEFAULT '{}',
    "orders" TEXT NOT NULL DEFAULT '{}',
    "prefix" TEXT NOT NULL DEFAULT '!',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Case" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "guildId" TEXT NOT NULL,
    "caseNumber" INTEGER NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetTag" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "moderatorTag" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "duration" TEXT,
    "durationMs" BIGINT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedById" TEXT,
    "resolvedByTag" TEXT,
    "resolvedAt" DATETIME,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "openerId" TEXT NOT NULL,
    "claimedById" TEXT,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BRIEF',
    "brief" TEXT,
    "budget" TEXT,
    "deadline" DATETIME,
    "references" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    "transcript" TEXT
);

-- CreateTable
CREATE TABLE "FortressState" (
    "guildId" TEXT NOT NULL PRIMARY KEY,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "enabledById" TEXT,
    "enabledByTag" TEXT,
    "startedAt" DATETIME,
    "snapshot" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "remindAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Poll" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" TEXT NOT NULL,
    "endsAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Case_guildId_targetId_idx" ON "Case"("guildId", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "Case_guildId_caseNumber_key" ON "Case"("guildId", "caseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Order_channelId_key" ON "Order"("channelId");

-- CreateIndex
CREATE INDEX "Order_guildId_status_idx" ON "Order"("guildId", "status");

-- CreateIndex
CREATE INDEX "Reminder_remindAt_idx" ON "Reminder"("remindAt");

-- CreateIndex
CREATE UNIQUE INDEX "Poll_messageId_key" ON "Poll"("messageId");
