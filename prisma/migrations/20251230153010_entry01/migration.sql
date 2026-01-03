-- CreateEnum
CREATE TYPE "Retailer" AS ENUM ('SKLAVENITIS', 'AB_VASSILOPOULOS', 'LIDL', 'MY_MARKET', 'MASOUTIS', 'GALAXIAS', 'MARKET_IN', 'KRITIKOS');

-- CreateTable
CREATE TABLE "Deal" (
    "id" SERIAL NOT NULL,
    "retailer" "Retailer" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "productUrl" TEXT NOT NULL,
    "imageUrl" TEXT,
    "salePrice" DECIMAL(10,2),
    "saleCurrency" TEXT DEFAULT 'EUR',
    "discountedPrice" DECIMAL(10,2),
    "discountedCurrency" TEXT DEFAULT 'EUR',
    "discountPercentage" DOUBLE PRECISION,
    "stockStatus" TEXT,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "externalId" TEXT,
    "category" TEXT,
    "tags" TEXT[],
    "metadata" JSONB,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" SERIAL NOT NULL,
    "retailer" "Retailer",
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "imageUrl" TEXT,
    "sourceUrl" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "category" TEXT,
    "tags" TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Deal_externalId_key" ON "Deal"("externalId");

-- CreateIndex
CREATE INDEX "Deal_retailer_productUrl_idx" ON "Deal"("retailer", "productUrl");

-- CreateIndex
CREATE UNIQUE INDEX "Event_sourceUrl_key" ON "Event"("sourceUrl");
