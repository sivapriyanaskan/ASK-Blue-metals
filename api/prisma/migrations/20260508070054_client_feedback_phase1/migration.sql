/*
  Warnings:

  - You are about to alter the column `emptyWeight` on the `SalesBill` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.
  - You are about to alter the column `grossWeight` on the `SalesBill` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.
  - You are about to alter the column `netWeight` on the `SalesBill` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.
  - You are about to alter the column `emptyWeight` on the `Token` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.

*/
-- AlterEnum
ALTER TYPE "BillType" ADD VALUE 'WEIGHT_SLIP';

-- DropForeignKey
ALTER TABLE "PurchaseEntryPass" DROP CONSTRAINT "PurchaseEntryPass_workCentreId_fkey";

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "anprNumber" TEXT,
ADD COLUMN     "eWayBillNo" TEXT,
ADD COLUMN     "paymentTerms" TEXT;

-- AlterTable
ALTER TABLE "PurchaseEntryPass" ALTER COLUMN "workCentreId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "RawMaterialEntry" ADD COLUMN     "shiftId" TEXT;

-- AlterTable
ALTER TABLE "SalesBill" ADD COLUMN     "billToAddress" TEXT,
ADD COLUMN     "billTypeOverride" "BillType",
ADD COLUMN     "confirmationReason" TEXT,
ADD COLUMN     "directAmount" DECIMAL(18,2),
ADD COLUMN     "placeOfSupply" TEXT,
ADD COLUMN     "shipToAddress" TEXT,
ALTER COLUMN "emptyWeight" SET DATA TYPE DECIMAL(10,3),
ALTER COLUMN "grossWeight" SET DATA TYPE DECIMAL(10,3),
ALTER COLUMN "netWeight" SET DATA TYPE DECIMAL(10,3);

-- AlterTable
ALTER TABLE "Token" ALTER COLUMN "emptyWeight" SET DATA TYPE DECIMAL(10,3);

-- CreateTable
CREATE TABLE "CompanyProfile" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "name" TEXT NOT NULL,
    "address" TEXT,
    "gstin" TEXT,
    "msmeNumber" TEXT,
    "cin" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "logoUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RawMaterialEntry_shiftId_idx" ON "RawMaterialEntry"("shiftId");

-- AddForeignKey
ALTER TABLE "PurchaseEntryPass" ADD CONSTRAINT "PurchaseEntryPass_workCentreId_fkey" FOREIGN KEY ("workCentreId") REFERENCES "WorkCentre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawMaterialEntry" ADD CONSTRAINT "RawMaterialEntry_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
