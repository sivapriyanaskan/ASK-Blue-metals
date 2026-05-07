-- CreateEnum
CREATE TYPE "PurchaseEntryStatus" AS ENUM ('OPEN', 'BILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchaseBillStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "CurrencyExchangeStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VoucherType" AS ENUM ('PAYMENT', 'RECEIPT');

-- CreateEnum
CREATE TYPE "VoucherStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FuelStatus" AS ENUM ('SAVED', 'POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RawMaterialStatus" AS ENUM ('SAVED', 'POSTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "PurchaseEntryPass" (
    "id" TEXT NOT NULL,
    "passNo" TEXT NOT NULL,
    "passDateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vehicleNoSnapshot" TEXT NOT NULL,
    "driverNameSnapshot" TEXT,
    "driverMobile" TEXT,
    "supplierId" TEXT NOT NULL,
    "supplierNameSnapshot" TEXT NOT NULL,
    "workCentreId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemNameSnapshot" TEXT NOT NULL,
    "loadWeight" DECIMAL(10,3) NOT NULL,
    "crRefNo" TEXT,
    "status" "PurchaseEntryStatus" NOT NULL DEFAULT 'OPEN',
    "cancelledReason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseEntryPass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseBill" (
    "id" TEXT NOT NULL,
    "purchaseNo" TEXT NOT NULL,
    "purchaseDateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entryPassId" TEXT,
    "passNoSnapshot" TEXT,
    "vehicleNoSnapshot" TEXT NOT NULL,
    "driverNameSnapshot" TEXT,
    "supplierId" TEXT NOT NULL,
    "supplierNameSnapshot" TEXT NOT NULL,
    "workCentreId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemNameSnapshot" TEXT NOT NULL,
    "loadWeight" DECIMAL(10,3) NOT NULL,
    "emptyWeight" DECIMAL(10,3) NOT NULL,
    "netWeight" DECIMAL(10,3) NOT NULL,
    "rate" DECIMAL(18,2) NOT NULL,
    "grossAmount" DECIMAL(18,2) NOT NULL,
    "gstPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "gstAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "grossPayable" DECIMAL(18,2) NOT NULL,
    "paymentMode" "PaymentMode" NOT NULL DEFAULT 'CREDIT',
    "status" "PurchaseBillStatus" NOT NULL DEFAULT 'DRAFT',
    "cancelledReason" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "shiftNo" TEXT NOT NULL,
    "shiftDate" TIMESTAMP(3) NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedById" TEXT NOT NULL,
    "openedBySnapshot" TEXT NOT NULL,
    "openingAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "ShiftStatus" NOT NULL DEFAULT 'OPEN',
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,
    "closedBySnapshot" TEXT,
    "nextShiftUserId" TEXT,
    "remarks" TEXT,
    "weightSlipTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "invoiceTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "billingTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "receiptTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "paymentTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "purchaseTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalCashReceived" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "cashInHand" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "transferAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "closingAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurrencyExchange" (
    "id" TEXT NOT NULL,
    "entryNo" TEXT NOT NULL,
    "billDateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outDetails" JSONB NOT NULL DEFAULT '[]',
    "inDetails" JSONB NOT NULL DEFAULT '[]',
    "totalAmountPaid" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalAmountReceived" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "CurrencyExchangeStatus" NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurrencyExchange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashVoucher" (
    "id" TEXT NOT NULL,
    "voucherNo" TEXT NOT NULL,
    "voucherType" "VoucherType" NOT NULL,
    "docDate" TIMESTAMP(3) NOT NULL,
    "lines" JSONB NOT NULL DEFAULT '[]',
    "totalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "paymentMode" "PaymentMode" NOT NULL DEFAULT 'CASH',
    "bankId" TEXT,
    "transactionNo" TEXT,
    "denominations" JSONB NOT NULL DEFAULT '[]',
    "preparedById" TEXT NOT NULL,
    "preparedBySnapshot" TEXT NOT NULL,
    "authorisedById" TEXT,
    "remarks" TEXT,
    "status" "VoucherStatus" NOT NULL DEFAULT 'DRAFT',
    "cancelledReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashVoucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelConsumption" (
    "id" TEXT NOT NULL,
    "entryNo" TEXT NOT NULL,
    "entryDateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vehicleId" TEXT NOT NULL,
    "vehicleRegNoSnapshot" TEXT NOT NULL,
    "driverId" TEXT,
    "driverNameSnapshot" TEXT,
    "workCentreId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "supplierNameSnapshot" TEXT NOT NULL,
    "referenceNo" TEXT,
    "meterStartReading" DECIMAL(10,2) NOT NULL,
    "meterCurrentReading" DECIMAL(10,2) NOT NULL,
    "fuelFilledQty" DECIMAL(10,2) NOT NULL,
    "ratePerLiter" DECIMAL(10,2) NOT NULL,
    "fuelAmount" DECIMAL(18,2) NOT NULL,
    "expenses" JSONB NOT NULL DEFAULT '[]',
    "totalExpenseAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "FuelStatus" NOT NULL DEFAULT 'SAVED',
    "remarks" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FuelConsumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawMaterialEntry" (
    "id" TEXT NOT NULL,
    "entryNo" TEXT NOT NULL,
    "entryDateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "itemId" TEXT NOT NULL,
    "itemNameSnapshot" TEXT NOT NULL,
    "currentStockTonn" DECIMAL(12,3) NOT NULL,
    "consumedTonn" DECIMAL(12,3) NOT NULL,
    "closingStockTonn" DECIMAL(12,3) NOT NULL,
    "status" "RawMaterialStatus" NOT NULL DEFAULT 'SAVED',
    "remarks" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RawMaterialEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseEntryPass_passNo_key" ON "PurchaseEntryPass"("passNo");

-- CreateIndex
CREATE INDEX "PurchaseEntryPass_passDateTime_idx" ON "PurchaseEntryPass"("passDateTime");

-- CreateIndex
CREATE INDEX "PurchaseEntryPass_supplierId_idx" ON "PurchaseEntryPass"("supplierId");

-- CreateIndex
CREATE INDEX "PurchaseEntryPass_status_idx" ON "PurchaseEntryPass"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseBill_purchaseNo_key" ON "PurchaseBill"("purchaseNo");

-- CreateIndex
CREATE INDEX "PurchaseBill_purchaseDateTime_idx" ON "PurchaseBill"("purchaseDateTime");

-- CreateIndex
CREATE INDEX "PurchaseBill_supplierId_idx" ON "PurchaseBill"("supplierId");

-- CreateIndex
CREATE INDEX "PurchaseBill_status_idx" ON "PurchaseBill"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Shift_shiftNo_key" ON "Shift"("shiftNo");

-- CreateIndex
CREATE INDEX "Shift_shiftDate_idx" ON "Shift"("shiftDate");

-- CreateIndex
CREATE INDEX "Shift_status_idx" ON "Shift"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CurrencyExchange_entryNo_key" ON "CurrencyExchange"("entryNo");

-- CreateIndex
CREATE INDEX "CurrencyExchange_billDateTime_idx" ON "CurrencyExchange"("billDateTime");

-- CreateIndex
CREATE UNIQUE INDEX "CashVoucher_voucherNo_key" ON "CashVoucher"("voucherNo");

-- CreateIndex
CREATE INDEX "CashVoucher_docDate_idx" ON "CashVoucher"("docDate");

-- CreateIndex
CREATE INDEX "CashVoucher_voucherType_idx" ON "CashVoucher"("voucherType");

-- CreateIndex
CREATE INDEX "CashVoucher_status_idx" ON "CashVoucher"("status");

-- CreateIndex
CREATE UNIQUE INDEX "FuelConsumption_entryNo_key" ON "FuelConsumption"("entryNo");

-- CreateIndex
CREATE INDEX "FuelConsumption_entryDateTime_idx" ON "FuelConsumption"("entryDateTime");

-- CreateIndex
CREATE INDEX "FuelConsumption_vehicleId_idx" ON "FuelConsumption"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "RawMaterialEntry_entryNo_key" ON "RawMaterialEntry"("entryNo");

-- CreateIndex
CREATE INDEX "RawMaterialEntry_entryDateTime_idx" ON "RawMaterialEntry"("entryDateTime");

-- CreateIndex
CREATE INDEX "RawMaterialEntry_itemId_idx" ON "RawMaterialEntry"("itemId");

-- AddForeignKey
ALTER TABLE "PurchaseEntryPass" ADD CONSTRAINT "PurchaseEntryPass_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseEntryPass" ADD CONSTRAINT "PurchaseEntryPass_workCentreId_fkey" FOREIGN KEY ("workCentreId") REFERENCES "WorkCentre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseEntryPass" ADD CONSTRAINT "PurchaseEntryPass_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseBill" ADD CONSTRAINT "PurchaseBill_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseBill" ADD CONSTRAINT "PurchaseBill_workCentreId_fkey" FOREIGN KEY ("workCentreId") REFERENCES "WorkCentre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseBill" ADD CONSTRAINT "PurchaseBill_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseBill" ADD CONSTRAINT "PurchaseBill_entryPassId_fkey" FOREIGN KEY ("entryPassId") REFERENCES "PurchaseEntryPass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelConsumption" ADD CONSTRAINT "FuelConsumption_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelConsumption" ADD CONSTRAINT "FuelConsumption_workCentreId_fkey" FOREIGN KEY ("workCentreId") REFERENCES "WorkCentre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelConsumption" ADD CONSTRAINT "FuelConsumption_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawMaterialEntry" ADD CONSTRAINT "RawMaterialEntry_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
