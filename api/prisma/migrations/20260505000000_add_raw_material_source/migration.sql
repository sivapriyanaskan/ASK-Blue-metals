-- CreateEnum
CREATE TYPE "RawMaterialSource" AS ENUM ('ITEM_WISE', 'PURCHASE_WISE');

-- AlterTable
ALTER TABLE "RawMaterialEntry"
  ADD COLUMN "source" "RawMaterialSource" NOT NULL DEFAULT 'ITEM_WISE';

-- Mark existing entries that were created from a purchase bill as PURCHASE_WISE.
UPDATE "RawMaterialEntry"
SET "source" = 'PURCHASE_WISE'
WHERE "remarks" ILIKE '%Purchase:%';

-- CreateIndex
CREATE INDEX "RawMaterialEntry_source_idx" ON "RawMaterialEntry"("source");
