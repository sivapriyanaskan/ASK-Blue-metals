-- AlterTable
ALTER TABLE "PurchaseBill" ADD COLUMN     "anprImageRef" TEXT,
ADD COLUMN     "loadImageRef" TEXT;

-- AlterTable
ALTER TABLE "PurchaseEntryPass" ADD COLUMN     "anprImageRef" TEXT,
ADD COLUMN     "anprNumberPlateText" TEXT,
ADD COLUMN     "loadImageRef" TEXT;
