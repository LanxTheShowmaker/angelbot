-- CreateTable
CREATE TABLE "Panel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "panelType" TEXT NOT NULL,
    "channelId" TEXT,
    "messageId" TEXT,
    "title" TEXT,
    "description" TEXT,
    "bannerUrl" TEXT,
    "bannerChannelId" TEXT,
    "bannerMessageId" TEXT,
    "thumbnailUrl" TEXT,
    "embedColor" INTEGER,
    "footerText" TEXT,
    "footerIcon" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "config" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TicketType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "panelType" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "emoji" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "categoryId" TEXT,
    "staffRoleIds" TEXT NOT NULL DEFAULT '[]',
    "moderatorRoleIds" TEXT NOT NULL DEFAULT '[]',
    "channelPrefix" TEXT DEFAULT 'ticket',
    "welcomeMessage" TEXT,
    "instructions" TEXT,
    "bannerUrl" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "cooldown" INTEGER NOT NULL DEFAULT 0,
    "maxOpen" INTEGER NOT NULL DEFAULT 1,
    "allowClaim" BOOLEAN NOT NULL DEFAULT true,
    "questions" TEXT NOT NULL DEFAULT '[]'
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "openerId" TEXT NOT NULL,
    "typeId" TEXT,
    "panelType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "claimedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    "transcript" TEXT
);

-- CreateIndex
CREATE INDEX "Panel_guildId_idx" ON "Panel"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "Panel_guildId_panelType_key" ON "Panel"("guildId", "panelType");

-- CreateIndex
CREATE INDEX "TicketType_guildId_panelType_idx" ON "TicketType"("guildId", "panelType");

-- CreateIndex
CREATE UNIQUE INDEX "TicketType_guildId_key_key" ON "TicketType"("guildId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_channelId_key" ON "Ticket"("channelId");

-- CreateIndex
CREATE INDEX "Ticket_guildId_openerId_idx" ON "Ticket"("guildId", "openerId");

-- CreateIndex
CREATE INDEX "Ticket_guildId_status_idx" ON "Ticket"("guildId", "status");
