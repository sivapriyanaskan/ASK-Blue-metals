-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "paymentDueDays" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Token" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledImageRef" TEXT,
ADD COLUMN     "cancelledWeight" DECIMAL(10,3);

-- CreateTable
CREATE TABLE "WeightSlip" (
    "id" TEXT NOT NULL,
    "slipNo" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weight" DECIMAL(10,3) NOT NULL,
    "vehicleNo" TEXT,
    "remarks" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeightSlip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WeightSlip_slipNo_key" ON "WeightSlip"("slipNo");

-- CreateIndex
CREATE INDEX "WeightSlip_capturedAt_idx" ON "WeightSlip"("capturedAt");
