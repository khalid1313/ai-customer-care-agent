-- CreateTable
CREATE TABLE "channel_integrations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" DATETIME,
    "platformAccountId" TEXT,
    "platformAccountName" TEXT,
    "platformPageId" TEXT,
    "platformPageName" TEXT,
    "pageAccessToken" TEXT,
    "webhookSecret" TEXT,
    "webhookUrl" TEXT,
    "webhookSubscribed" BOOLEAN NOT NULL DEFAULT false,
    "webhookSubscribedAt" DATETIME,
    "permissions" TEXT,
    "features" TEXT,
    "metadata" TEXT,
    "lastError" TEXT,
    "lastErrorAt" DATETIME,
    "connectionAttempts" INTEGER NOT NULL DEFAULT 0,
    "connectedAt" DATETIME,
    "lastTestAt" DATETIME,
    "lastMessageAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "channel_integrations_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "channel_integrations_businessId_platform_key" ON "channel_integrations"("businessId", "platform");