-- CreateTable
CREATE TABLE "AgentCredential" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "agentEmail" TEXT NOT NULL,
    "tempPassword" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "isViewed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentCredential_createdBy_idx" ON "AgentCredential"("createdBy");
CREATE INDEX "AgentCredential_agentId_idx" ON "AgentCredential"("agentId");
CREATE INDEX "AgentCredential_isViewed_idx" ON "AgentCredential"("isViewed");