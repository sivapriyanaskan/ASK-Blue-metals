import { unitRouter } from './unit/router.js';
import { itemGroupRouter } from './itemGroup/router.js';
import { itemSubGroupRouter } from './itemSubGroup/router.js';
import { workCentreRouter } from './workCentre/router.js';
import { printerRouter } from './printer/router.js';
import { bankRouter } from './bank/router.js';
import { accountRouter } from './account/router.js';
import { billSundryRouter } from './billSundry/router.js';
import { driverRouter } from './driver/router.js';
import { vehicleRouter } from './vehicle/router.js';
import { customerRouter } from './customer/router.js';
import { supplierRouter } from './supplier/router.js';
import { itemRouter } from './item/router.js';
import { customerRateRouter } from './customerRate/router.js';
import { supplierRateRouter } from './supplierRate/router.js';
import { customerFreezeRouter } from './customerFreeze/router.js';

/**
 * Returns the masters subroutes. The caller is expected to mount each at the
 * matching URL prefix under /api/v1.
 */
export function mountMastersRoutes() {
  return {
    units: unitRouter,
    itemGroups: itemGroupRouter,
    itemSubGroups: itemSubGroupRouter,
    workCentres: workCentreRouter,
    printers: printerRouter,
    banks: bankRouter,
    accounts: accountRouter,
    billSundries: billSundryRouter,
    drivers: driverRouter,
    vehicles: vehicleRouter,
    customers: customerRouter,
    suppliers: supplierRouter,
    items: itemRouter,
    customerRates: customerRateRouter,
    supplierRates: supplierRateRouter,
    customerFreezes: customerFreezeRouter,
  };
}
