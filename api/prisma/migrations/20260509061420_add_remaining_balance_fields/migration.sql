-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "placeOfSupply" TEXT,
ADD COLUMN     "remainingBalance" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SalesBill" ADD COLUMN     "paymentDeferralOption" TEXT DEFAULT 'PAY_NOW',
ADD COLUMN     "remainingBalance" DECIMAL(18,2) NOT NULL DEFAULT 0;
