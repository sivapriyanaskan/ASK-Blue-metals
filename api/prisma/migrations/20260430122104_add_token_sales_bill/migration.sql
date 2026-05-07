-- CreateEnum
CREATE TYPE "TokenStatus" AS ENUM ('OPEN', 'BILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SalesBillStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'ONLINE', 'CREDIT', 'MIXED');

-- CreateTable
CREATE TABLE "Counter" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Counter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Token" (
    "id" TEXT NOT NULL,
    "tokenNo" TEXT NOT NULL,
    "entryNo" TEXT NOT NULL,
    "tokenDateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vehicleNo" TEXT NOT NULL,
    "emptyWeight" DECIMAL(10,2) NOT NULL,
    "weightCapturedAt" TIMESTAMP(3),
    "customerId" TEXT NOT NULL,
    "driverName" TEXT,
    "driverMobile" TEXT,
    "itemId" TEXT NOT NULL,
    "anprImageRef" TEXT,
    "anprCapturedAt" TIMESTAMP(3),
    "anprNumberPlateText" TEXT,
    "loadImageRef" TEXT,
    "loadCapturedAt" TIMESTAMP(3),
    "barrierEventId" TEXT,
    "status" "TokenStatus" NOT NULL DEFAULT 'OPEN',
    "cancelledReason" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesBill" (
    "id" TEXT NOT NULL,
    "billNo" TEXT NOT NULL,
    "billDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tokenId" TEXT,
    "customerId" TEXT NOT NULL,
    "vehicleNo" TEXT NOT NULL,
    "driverName" TEXT,
    "driverMobile" TEXT,
    "itemId" TEXT NOT NULL,
    "emptyWeight" DECIMAL(10,2) NOT NULL,
    "grossWeight" DECIMAL(10,2) NOT NULL,
    "netWeight" DECIMAL(10,2) NOT NULL,
    "rate" DECIMAL(18,2) NOT NULL,
    "taxableAmount" DECIMAL(18,2) NOT NULL,
    "cgstPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "sgstPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "igstPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "cgstAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "sgstAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "igstAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tcsPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tcsAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "roundOff" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "paymentMode" "PaymentMode" NOT NULL DEFAULT 'CREDIT',
    "cashAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "onlineAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "creditAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "status" "SalesBillStatus" NOT NULL DEFAULT 'POSTED',
    "cancelledReason" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesBill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Counter_scope_key" ON "Counter"("scope");

-- CreateIndex
CREATE INDEX "Token_customerId_idx" ON "Token"("customerId");

-- CreateIndex
CREATE INDEX "Token_itemId_idx" ON "Token"("itemId");

-- CreateIndex
CREATE INDEX "Token_status_idx" ON "Token"("status");

-- CreateIndex
CREATE INDEX "Token_tokenDateTime_idx" ON "Token"("tokenDateTime");

-- CreateIndex
CREATE UNIQUE INDEX "Token_tokenNo_tokenDateTime_key" ON "Token"("tokenNo", "tokenDateTime");

-- CreateIndex
CREATE UNIQUE INDEX "SalesBill_billNo_key" ON "SalesBill"("billNo");

-- CreateIndex
CREATE UNIQUE INDEX "SalesBill_tokenId_key" ON "SalesBill"("tokenId");

-- CreateIndex
CREATE INDEX "SalesBill_billDate_idx" ON "SalesBill"("billDate");

-- CreateIndex
CREATE INDEX "SalesBill_customerId_idx" ON "SalesBill"("customerId");

-- CreateIndex
CREATE INDEX "SalesBill_status_idx" ON "SalesBill"("status");

-- AddForeignKey
ALTER TABLE "Token" ADD CONSTRAINT "Token_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Token" ADD CONSTRAINT "Token_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesBill" ADD CONSTRAINT "SalesBill_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesBill" ADD CONSTRAINT "SalesBill_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesBill" ADD CONSTRAINT "SalesBill_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token"("id") ON DELETE SET NULL ON UPDATE CASCADE;
