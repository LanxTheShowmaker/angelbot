-- CreateTable
CREATE TABLE "ShopItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "roleId" TEXT,
    "emoji" TEXT,
    "stock" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ShopInventory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "purchasedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "ShopItem_guildId_idx" ON "ShopItem"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopItem_guildId_name_key" ON "ShopItem"("guildId", "name");

-- CreateIndex
CREATE INDEX "ShopInventory_guildId_userId_idx" ON "ShopInventory"("guildId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopInventory_guildId_userId_itemId_key" ON "ShopInventory"("guildId", "userId", "itemId");
