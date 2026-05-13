import { tokenRouter } from './token/router.js';
import { salesBillRouter } from './salesBill/router.js';
import { purchaseEntryPassRouter } from './purchaseEntryPass/router.js';
import { purchaseBillRouter } from './purchaseBill/router.js';
import { shiftRouter } from './shift/router.js';
import { shiftReportRouter } from './shift/report.router.js';
import { currencyExchangeRouter } from './currencyExchange/router.js';
import { cashVoucherRouter } from './cashVoucher/router.js';
import { fuelConsumptionRouter } from './fuelConsumption/router.js';
import { rawMaterialEntryRouter } from './rawMaterialEntry/router.js';
import { weightSlipRouter } from './weightSlip/router.js';
import { purchaseConsumptionRouter } from './purchaseConsumption/router.js';

export function mountOperationsRoutes() {
  return {
    tokens: tokenRouter,
    salesBills: salesBillRouter,
    purchaseEntryPasses: purchaseEntryPassRouter,
    purchaseBills: purchaseBillRouter,
    shifts: shiftRouter,
    shiftReports: shiftReportRouter,
    currencyExchanges: currencyExchangeRouter,
    cashVouchers: cashVoucherRouter,
    fuelConsumptions: fuelConsumptionRouter,
    rawMaterialEntries: rawMaterialEntryRouter,
    weightSlips: weightSlipRouter,
    purchaseConsumptions: purchaseConsumptionRouter,
  };
}
