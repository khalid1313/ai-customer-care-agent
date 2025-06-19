-- AlterTable
ALTER TABLE "businesses" ADD COLUMN "lastProductSync" DATETIME;
ALTER TABLE "businesses" ADD COLUMN "pineconeIndexName" TEXT;
ALTER TABLE "businesses" ADD COLUMN "pineconeNamespace" TEXT;
ALTER TABLE "businesses" ADD COLUMN "shopifyAccessToken" TEXT;
ALTER TABLE "businesses" ADD COLUMN "shopifyDomain" TEXT;
ALTER TABLE "businesses" ADD COLUMN "shopifyStoreId" TEXT;
