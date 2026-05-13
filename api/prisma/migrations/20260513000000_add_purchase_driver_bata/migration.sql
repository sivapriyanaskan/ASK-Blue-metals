-- Driver bata on purchase bills (cash given to the driver at the time of the purchase weighment).
ALTER TABLE "PurchaseBill" ADD COLUMN "driverBata" DECIMAL(10, 2) NOT NULL DEFAULT 0;
