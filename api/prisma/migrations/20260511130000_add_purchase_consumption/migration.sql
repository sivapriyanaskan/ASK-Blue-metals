-- Adds PurchaseConsumption table to track the lifecycle status of each
-- purchase bill (New -> Consumed | In Stock | Undefined). Used by the
-- Raw Material — Purchase Wise screen and shift close validation.

CREATE TYPE "PurchaseConsumptionStatus" AS ENUM ('NEW', 'CONSUMED', 'IN_STOCK', 'UNDEFINED');

CREATE TABLE "PurchaseConsumption" (
    "id" TEXT NOT NULL,
    "purchaseBillId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "status" "PurchaseConsumptionStatus" NOT NULL DEFAULT 'NEW',
    "createdByShiftId" TEXT,
    "updatedByShiftId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseConsumption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PurchaseConsumption_purchaseBillId_key" ON "PurchaseConsumption"("purchaseBillId");
CREATE INDEX "PurchaseConsumption_createdByShiftId_status_idx" ON "PurchaseConsumption"("createdByShiftId", "status");
CREATE INDEX "PurchaseConsumption_status_idx" ON "PurchaseConsumption"("status");

ALTER TABLE "PurchaseConsumption" ADD CONSTRAINT "PurchaseConsumption_purchaseBillId_fkey" FOREIGN KEY ("purchaseBillId") REFERENCES "PurchaseBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseConsumption" ADD CONSTRAINT "PurchaseConsumption_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseConsumption" ADD CONSTRAINT "PurchaseConsumption_createdByShiftId_fkey" FOREIGN KEY ("createdByShiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PurchaseConsumption" ADD CONSTRAINT "PurchaseConsumption_updatedByShiftId_fkey" FOREIGN KEY ("updatedByShiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: create NEW consumption rows for existing POSTED bills (no shift attribution).
INSERT INTO "PurchaseConsumption" ("id", "purchaseBillId", "itemId", "quantity", "status", "createdAt", "updatedAt")
SELECT
  'pc_' || substr(md5(random()::text || clock_timestamp()::text), 1, 24),
  pb."id",
  pb."itemId",
  pb."netWeight",
  'NEW',
  pb."createdAt",
  pb."updatedAt"
FROM "PurchaseBill" pb
WHERE pb."status" = 'POSTED';
