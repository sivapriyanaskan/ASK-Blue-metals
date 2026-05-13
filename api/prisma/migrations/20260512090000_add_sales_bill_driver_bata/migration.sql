-- Add driver bata (allowance) amount to sales bills.
ALTER TABLE "SalesBill"
  ADD COLUMN "driverBata" DECIMAL(10, 2) NOT NULL DEFAULT 0;
