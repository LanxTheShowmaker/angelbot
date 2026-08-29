-- CreateTable
CREATE TABLE "LevelConfig" (
    "guildId" TEXT NOT NULL PRIMARY KEY,
    "xpMultiplier" REAL NOT NULL DEFAULT 1.0,
    "channelMultipliers" TEXT NOT NULL DEFAULT '{}',
    "roleRewards" TEXT NOT NULL DEFAULT '[]',
    "streakEnabled" BOOLEAN NOT NULL DEFAULT true,
    "announceChannelId" TEXT,
    "antiFarmEnabled" BOOLEAN NOT NULL DEFAULT true,
    "prestigeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EconomyConfig" (
    "guildId" TEXT NOT NULL PRIMARY KEY,
    "dailyAmount" INTEGER NOT NULL DEFAULT 100,
    "weeklyAmount" INTEGER NOT NULL DEFAULT 500,
    "shopEnabled" BOOLEAN NOT NULL DEFAULT true,
    "tradingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "jobsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "actorId" TEXT,
    "targetId" TEXT,
    "action" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "icon" TEXT,
    "rewards" TEXT NOT NULL DEFAULT '{}',
    "conditions" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "unlocked" BOOLEAN NOT NULL DEFAULT false,
    "unlockedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,

    PRIMARY KEY ("guildId", "userId", "achievementId")
);

-- CreateTable
CREATE TABLE "AutomationRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "name" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "trigger" TEXT NOT NULL,
    "conditions" TEXT NOT NULL DEFAULT '{}',
    "actions" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Backup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "createdByTag" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "EconomyTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "meta" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CaseNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "caseNumber" INTEGER,
    "targetId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorTag" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Appeal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "caseNumber" INTEGER NOT NULL,
    "appellantId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewerId" TEXT,
    "reviewerTag" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TicketRating" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "raterId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "feedback" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RaidIncident" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "risk" INTEGER NOT NULL,
    "details" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "XpStreak" (
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "longest" INTEGER NOT NULL DEFAULT 0,
    "lastXpAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,

    PRIMARY KEY ("guildId", "userId")
);

-- CreateIndex
CREATE INDEX "AuditLog_guildId_createdAt_idx" ON "AuditLog"("guildId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_guildId_category_idx" ON "AuditLog"("guildId", "category");

-- CreateIndex
CREATE INDEX "Achievement_guildId_idx" ON "Achievement"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_guildId_key_key" ON "Achievement"("guildId", "key");

-- CreateIndex
CREATE INDEX "UserAchievement_guildId_userId_idx" ON "UserAchievement"("guildId", "userId");

-- CreateIndex
CREATE INDEX "AutomationRule_guildId_trigger_idx" ON "AutomationRule"("guildId", "trigger");

-- CreateIndex
CREATE INDEX "Backup_guildId_createdAt_idx" ON "Backup"("guildId", "createdAt");

-- CreateIndex
CREATE INDEX "EconomyTransaction_guildId_userId_idx" ON "EconomyTransaction"("guildId", "userId");

-- CreateIndex
CREATE INDEX "EconomyTransaction_guildId_createdAt_idx" ON "EconomyTransaction"("guildId", "createdAt");

-- CreateIndex
CREATE INDEX "CaseNote_guildId_targetId_idx" ON "CaseNote"("guildId", "targetId");

-- CreateIndex
CREATE INDEX "CaseNote_guildId_caseNumber_idx" ON "CaseNote"("guildId", "caseNumber");

-- CreateIndex
CREATE INDEX "Appeal_guildId_status_idx" ON "Appeal"("guildId", "status");

-- CreateIndex
CREATE INDEX "TicketRating_guildId_idx" ON "TicketRating"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketRating_guildId_channelId_raterId_key" ON "TicketRating"("guildId", "channelId", "raterId");

-- CreateIndex
CREATE INDEX "RaidIncident_guildId_createdAt_idx" ON "RaidIncident"("guildId", "createdAt");
