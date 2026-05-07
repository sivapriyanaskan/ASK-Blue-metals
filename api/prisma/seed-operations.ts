/**
 * Seed realistic operational + master data for ASK – Blue Metal ERP.
 * Run: npx tsx prisma/seed-operations.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // ──────────────────── MASTERS ────────────────────────────────────────────

  // Units
  const [tonne, litre, nos] = await Promise.all([
    upsertUnit('TON', 'Tonne'),
    upsertUnit('LTR', 'Litre'),
    upsertUnit('NOS', 'Nos'),
  ]);

  // Work Centres
  const [wc1, wc2, wc3] = await Promise.all([
    upsertWC('WC-01', 'Main Crushing Unit'),
    upsertWC('WC-02', 'Secondary Processing'),
    upsertWC('WC-03', 'Screening Unit'),
  ]);

  // Item Groups + Sub Groups
  const grpRaw = await prisma.itemGroup.upsert({
    where: { code: 'RAW' }, update: { name: 'Raw Material' },
    create: { code: 'RAW', name: 'Raw Material', isActive: true },
  });
  const grpSale = await prisma.itemGroup.upsert({
    where: { code: 'BM' }, update: { name: 'Blue Metal' },
    create: { code: 'BM', name: 'Blue Metal', isActive: true },
  });
  const sgRock = await prisma.itemSubGroup.upsert({
    where: { code: 'ROCK' }, update: { name: 'Rock / Stone', groupId: grpRaw.id },
    create: { code: 'ROCK', name: 'Rock / Stone', groupId: grpRaw.id, isActive: true },
  });
  const sgBM = await prisma.itemSubGroup.upsert({
    where: { code: 'BM-PROC' }, update: { name: 'Processed Blue Metal', groupId: grpSale.id },
    create: { code: 'BM-PROC', name: 'Processed Blue Metal', groupId: grpSale.id, isActive: true },
  });

  // Items
  const items = await Promise.all([
    upsertItem('RM-STONE-40', 'Raw Stone 40mm', grpRaw.id, sgRock.id, tonne.id, tonne.id, 0, 1800, true, false),
    upsertItem('RM-STONE-20', 'Raw Stone 20mm', grpRaw.id, sgRock.id, tonne.id, tonne.id, 0, 1700, true, false),
    upsertItem('RM-GRANITE', 'Granite Stone', grpRaw.id, sgRock.id, tonne.id, tonne.id, 0, 2100, true, false),
    upsertItem('BM-40', '40mm Blue Metal', grpSale.id, sgBM.id, tonne.id, tonne.id, 5, 950, false, true),
    upsertItem('BM-20', '20mm Blue Metal', grpSale.id, sgBM.id, tonne.id, tonne.id, 5, 880, false, true),
    upsertItem('BM-12', '12mm Blue Metal', grpSale.id, sgBM.id, tonne.id, tonne.id, 5, 820, false, true),
    upsertItem('M-SAND', 'M-Sand', grpSale.id, sgBM.id, tonne.id, tonne.id, 5, 700, false, true),
  ]);
  const [rmStone40, rmStone20, rmGranite, bm40, bm20, bm12, mSand] = items;

  // Customers
  const [cust1, cust2, cust3, cust4] = await Promise.all([
    upsertCustomer('C-001', 'Sharma Construction Ltd', 'MH', '27AABCS1234A1Z5'),
    upsertCustomer('C-002', 'Patel Infra Pvt Ltd', 'GJ', '24AAECP5678B1Z3'),
    upsertCustomer('C-003', 'Kumar Builders', 'MH', null),
    upsertCustomer('C-004', 'Rajesh Road Works', 'MH', null),
  ]);

  // Suppliers
  const [sup1, sup2, sup3, fuelSup1, fuelSup2] = await Promise.all([
    upsertSupplier('S-001', 'ABC Quarry Pvt Ltd', 'TON_BASED', 'MH', '27AABCA9876B1Z1'),
    upsertSupplier('S-002', 'XYZ Stone Suppliers', 'TON_BASED', 'MH', null),
    upsertSupplier('S-003', 'PQR Mining Co', 'TON_BASED', 'GJ', null),
    upsertSupplier('S-004', 'Bharat Petroleum - Pune', 'REPAIR_MAINTENANCE', 'MH', null),
    upsertSupplier('S-005', 'Indian Oil - Wakad', 'REPAIR_MAINTENANCE', 'MH', null),
  ]);

  // Vehicles
  const [veh1, veh2, veh3, veh4] = await Promise.all([
    upsertVehicle('MH02AB1234', 'Tata 407 Tipper #1', wc1.id),
    upsertVehicle('MH12XY1111', 'Tata 407 Tipper #2', wc2.id),
    upsertVehicle('GJ05AB3333', 'Ashok Leyland Tipper', wc1.id),
    upsertVehicle('MH14CD5678', 'Eicher Pro 2049', wc3.id),
  ]);

  // Banks
  const _bank1 = await prisma.bank.upsert({
    where: { code: 'HDFC-001' },
    update: { name: 'HDFC Bank - Main' },
    create: { code: 'HDFC-001', name: 'HDFC Bank - Main', branch: 'Pune Main', accountNumber: '50100123456789', ifsc: 'HDFC0001234', isActive: true },
  });

  // ──────────────────── PURCHASE ENTRY PASSES ──────────────────────────────

  const adminUser = await prisma.user.findFirst({ where: { username: 'admin' } });
  const adminId = adminUser?.id ?? 'system';

  const passes = await Promise.all([
    createPass('EP/020326/001', sup1.id, sup1.name, wc1.id, rmStone40.id, rmStone40.name, 'MH02AB1234', 'Raju Kumar', 32.5, adminId, new Date('2026-03-02T08:30:00'), 'BILLED'),
    createPass('EP/020326/002', sup2.id, sup2.name, wc1.id, rmStone20.id, rmStone20.name, 'MH12XY1111', 'Suresh Patil', 28.2, adminId, new Date('2026-03-02T10:15:00'), 'BILLED'),
    createPass('EP/020326/003', sup3.id, sup3.name, wc2.id, rmGranite.id, rmGranite.name, 'GJ05AB3333', 'Mohan Singh', 35.0, adminId, new Date('2026-03-02T13:45:00'), 'OPEN'),
    createPass('EP/030326/001', sup1.id, sup1.name, wc1.id, rmStone40.id, rmStone40.name, 'MH14CD5678', 'Raju Kumar', 30.8, adminId, new Date('2026-03-03T07:00:00'), 'OPEN'),
    createPass('EP/030326/002', sup2.id, sup2.name, wc3.id, rmStone20.id, rmStone20.name, 'MH02AB1234', 'Suresh Patil', 25.5, adminId, new Date('2026-03-03T09:30:00'), 'OPEN'),
  ]);

  // ──────────────────── PURCHASE BILLS ─────────────────────────────────────

  await Promise.all([
    createPB('10201/26', passes[0].id, passes[0].passNo, sup1.id, sup1.name, wc1.id, rmStone40.id, rmStone40.name, 'MH02AB1234', 32.5, 8.2, 1800, 5, adminId, new Date('2026-03-02T09:00:00'), 'POSTED'),
    createPB('10202/26', passes[1].id, passes[1].passNo, sup2.id, sup2.name, wc1.id, rmStone20.id, rmStone20.name, 'MH12XY1111', 28.2, 7.8, 1700, 5, adminId, new Date('2026-03-02T11:00:00'), 'POSTED'),
    createPB('10203/26', null, null, sup3.id, sup3.name, wc2.id, rmGranite.id, rmGranite.name, 'GJ05AB3333', 35.0, 8.5, 2100, 0, adminId, new Date('2026-03-01T15:30:00'), 'POSTED'),
    createPB('10204/26', null, null, sup1.id, sup1.name, wc1.id, rmStone40.id, rmStone40.name, 'MH14CD5678', 29.0, 7.5, 1800, 5, adminId, new Date('2026-03-01T11:00:00'), 'DRAFT'),
  ]);

  // ──────────────────── SHIFTS ─────────────────────────────────────────────

  await Promise.all([
    createShift('SH-2026-001', new Date('2026-03-01'), 'admin', 5000, 'CLOSED', new Date('2026-03-01T18:00:00'), 125000, 80000, 185000, adminId),
    createShift('SH-2026-002', new Date('2026-03-02'), 'admin', 5000, 'CLOSED', new Date('2026-03-02T18:00:00'), 145000, 92000, 205000, adminId),
    createShift('SH-2026-003', new Date('2026-03-03'), 'admin', 8000, 'OPEN', null, 0, 0, 0, adminId),
  ]);

  // ──────────────────── CURRENCY EXCHANGES ─────────────────────────────────

  await Promise.all([
    createCX('CXG-2026-001', new Date('2026-03-01T10:30:00'),
      [{ denomination: 500, nos: 10, amount: 5000 }],
      [{ denomination: 200, nos: 20, amount: 4000 }, { denomination: 100, nos: 10, amount: 1000 }], adminId),
    createCX('CXG-2026-002', new Date('2026-03-02T11:15:00'),
      [{ denomination: 2000, nos: 5, amount: 10000 }],
      [{ denomination: 500, nos: 20, amount: 10000 }], adminId),
    createCX('CXG-2026-003', new Date('2026-03-03T14:45:00'),
      [{ denomination: 500, nos: 4, amount: 2000 }],
      [{ denomination: 200, nos: 5, amount: 1000 }, { denomination: 100, nos: 10, amount: 1000 }], adminId),
  ]);

  // ──────────────────── CASH VOUCHERS ──────────────────────────────────────

  await Promise.all([
    createCV('Pay/Mar/1/26', 'PAYMENT', new Date('2026-03-01'), [{ slNo: 1, accountHeadNameSnapshot: 'Salary Account', description: 'March salaries', amount: 50000 }], 'CASH', 'admin', 'POSTED', adminId),
    createCV('Rec/Mar/2/26', 'RECEIPT', new Date('2026-03-02'), [{ slNo: 1, accountHeadNameSnapshot: 'Sharma Construction', description: 'Invoice INV/03/001/26 payment', amount: 35000 }], 'CASH', 'admin', 'POSTED', adminId),
    createCV('Pay/Mar/3/26', 'PAYMENT', new Date('2026-03-03'), [{ slNo: 1, accountHeadNameSnapshot: 'Diesel Expenses', description: 'Weekly fuel reimbursement', amount: 12000 }], 'CASH', 'admin', 'DRAFT', adminId),
    createCV('Rec/Mar/4/26', 'RECEIPT', new Date('2026-03-03'), [{ slNo: 1, accountHeadNameSnapshot: 'Patel Infra', description: 'Advance receipt', amount: 75000 }], 'CASH', 'admin', 'POSTED', adminId),
  ]);

  // ──────────────────── FUEL CONSUMPTIONS ──────────────────────────────────

  await Promise.all([
    createFuel('FE-2026-001', veh1.id, veh1.registrationNumber, wc1.id, fuelSup1.id, fuelSup1.name, 15200, 15450, 45.5, 102.5, adminId, new Date('2026-03-01T08:30:00')),
    createFuel('FE-2026-002', veh2.id, veh2.registrationNumber, wc2.id, fuelSup2.id, fuelSup2.name, 8900, 9150, 38.0, 102.5, adminId, new Date('2026-03-02T14:15:00')),
    createFuel('FE-2026-003', veh3.id, veh3.registrationNumber, wc1.id, fuelSup1.id, fuelSup1.name, 22100, 22380, 52.0, 102.5, adminId, new Date('2026-03-03T07:45:00')),
    createFuel('FE-2026-004', veh4.id, veh4.registrationNumber, wc3.id, fuelSup2.id, fuelSup2.name, 5500, 5710, 40.0, 102.5, adminId, new Date('2026-03-03T10:00:00')),
  ]);

  // ──────────────────── RAW MATERIAL ENTRIES ───────────────────────────────

  await Promise.all([
    createRM('RM-2026-001', rmStone40.id, rmStone40.name, 120.5, 32.5, adminId, new Date('2026-03-01T12:00:00'), 'POSTED'),
    createRM('RM-2026-002', rmStone20.id, rmStone20.name, 95.0, 28.2, adminId, new Date('2026-03-02T12:00:00'), 'POSTED'),
    createRM('RM-2026-003', rmGranite.id, rmGranite.name, 80.0, 20.0, adminId, new Date('2026-03-03T09:00:00'), 'SAVED'),
  ]);

  // ──────────────────── TOKENS + SALES BILLS ───────────────────────────────

  // 8 tokens across Mar 1–3 2026 (BILLED status, with associated sales bills)
  const tokens = await Promise.all([
    createToken('TKN/010326/001', '1/26', cust1.id, bm20.id, 'MH02AB1234', 8.5, 'Raju Kumar', adminId, new Date('2026-03-01T09:00:00')),
    createToken('TKN/010326/002', '2/26', cust2.id, bm40.id, 'MH12XY1111', 7.2, 'Suresh Patil', adminId, new Date('2026-03-01T10:30:00')),
    createToken('TKN/010326/003', '3/26', cust3.id, bm12.id, 'GJ05AB3333', 8.0, 'Mohan Singh', adminId, new Date('2026-03-01T13:00:00')),
    createToken('TKN/020326/001', '4/26', cust1.id, bm20.id, 'MH14CD5678', 8.5, 'Raju Kumar', adminId, new Date('2026-03-02T08:45:00')),
    createToken('TKN/020326/002', '5/26', cust4.id, bm40.id, 'MH02AB1234', 7.0, 'Suresh Patil', adminId, new Date('2026-03-02T11:00:00')),
    createToken('TKN/020326/003', '6/26', cust2.id, mSand.id, 'MH12XY1111', 6.5, 'Raju Kumar', adminId, new Date('2026-03-02T14:30:00')),
    createToken('TKN/030326/001', '7/26', cust1.id, bm12.id, 'GJ05AB3333', 8.2, 'Mohan Singh', adminId, new Date('2026-03-03T09:15:00')),
    createToken('TKN/030326/002', '8/26', cust3.id, bm20.id, 'MH14CD5678', 8.5, 'Suresh Patil', adminId, new Date('2026-03-03T11:30:00')),
  ]);

  // 8 sales bills (cust1+cust2 = TAX_INVOICE with cgst/sgst 2.5% each; cust3+cust4 = NON_GST)
  await Promise.all([
    createSalesBill('INV/03/001/26', tokens[0].id, cust1.id, 'MH02AB1234', 'Raju Kumar', bm20.id, 8.5, 25.8, 880, 2.5, 2.5, 0, 'CASH', adminId, new Date('2026-03-01T09:30:00')),
    createSalesBill('INV/03/002/26', tokens[1].id, cust2.id, 'MH12XY1111', 'Suresh Patil', bm40.id, 7.2, 22.5, 950, 2.5, 2.5, 0, 'CREDIT', adminId, new Date('2026-03-01T11:00:00')),
    createSalesBill('INV/03/003/26', tokens[2].id, cust3.id, 'GJ05AB3333', 'Mohan Singh', bm12.id, 8.0, 20.0, 820, 0, 0, 0, 'CASH', adminId, new Date('2026-03-01T13:30:00')),
    createSalesBill('INV/03/004/26', tokens[3].id, cust1.id, 'MH14CD5678', 'Raju Kumar', bm20.id, 8.5, 24.5, 880, 2.5, 2.5, 0, 'CREDIT', adminId, new Date('2026-03-02T09:15:00')),
    createSalesBill('INV/03/005/26', tokens[4].id, cust4.id, 'MH02AB1234', 'Suresh Patil', bm40.id, 7.0, 21.0, 950, 0, 0, 0, 'CASH', adminId, new Date('2026-03-02T11:30:00')),
    createSalesBill('INV/03/006/26', tokens[5].id, cust2.id, 'MH12XY1111', 'Raju Kumar', mSand.id, 6.5, 18.5, 700, 2.5, 2.5, 0, 'ONLINE', adminId, new Date('2026-03-02T15:00:00')),
    createSalesBill('INV/03/007/26', tokens[6].id, cust1.id, 'GJ05AB3333', 'Mohan Singh', bm12.id, 8.2, 23.2, 820, 2.5, 2.5, 0, 'CREDIT', adminId, new Date('2026-03-03T09:45:00')),
    createSalesBill('INV/03/008/26', tokens[7].id, cust3.id, 'MH14CD5678', 'Suresh Patil', bm20.id, 8.5, 22.5, 880, 0, 0, 0, 'CASH', adminId, new Date('2026-03-03T12:00:00')),
  ]);

  console.log('✅ Operations seed complete');
}

// ─── Helper functions ─────────────────────────────────────────────────────────

async function upsertUnit(code: string, name: string) {
  return prisma.unit.upsert({ where: { code }, update: { name }, create: { code, name, isActive: true } });
}

async function upsertWC(code: string, name: string) {
  return prisma.workCentre.upsert({ where: { code }, update: { name }, create: { code, name, isActive: true } });
}

async function upsertItem(code: string, name: string, groupId: string, subGroupId: string, purchaseUnitId: string, sellingUnitId: string, gstPct: number, price: number, isRaw: boolean, isSale: boolean) {
  return prisma.item.upsert({
    where: { code },
    update: { name, sellingPrice: price, gstPercent: gstPct, isRawMaterial: isRaw, isSaleMaterial: isSale },
    create: { code, name, groupId, subGroupId, purchaseUnitId, sellingUnitId, gstPercent: gstPct, sellingPrice: price, isRawMaterial: isRaw, isSaleMaterial: isSale, isActive: true },
  });
}

async function upsertCustomer(code: string, name: string, _state: string, gst: string | null) {
  return prisma.customer.upsert({
    where: { code },
    update: { name },
    create: { code, name, billType: gst ? 'TAX_INVOICE' : 'NON_GST', gstNumber: gst, isActive: true },
  });
}

async function upsertSupplier(code: string, name: string, type: string, _state: string, gst: string | null) {
  return prisma.supplier.upsert({
    where: { code },
    update: { name },
    create: { code, name, supplierType: type as 'TON_BASED' | 'REPAIR_MAINTENANCE', gstNumber: gst, isActive: true },
  });
}

async function upsertVehicle(reg: string, name: string, workCentreId: string) {
  return prisma.vehicle.upsert({
    where: { registrationNumber: reg },
    update: { name },
    create: { registrationNumber: reg, name, workCentreId, isActive: true },
  });
}

async function createPass(passNo: string, supplierId: string, supplierName: string, wcId: string, itemId: string, itemName: string, vehicle: string, driver: string, loadWt: number, userId: string, dt: Date, status: 'OPEN' | 'BILLED' | 'CANCELLED') {
  const existing = await prisma.purchaseEntryPass.findUnique({ where: { passNo } });
  if (existing) return existing;
  return prisma.purchaseEntryPass.create({
    data: { passNo, passDateTime: dt, vehicleNoSnapshot: vehicle, driverNameSnapshot: driver, supplierId, supplierNameSnapshot: supplierName, workCentreId: wcId, itemId, itemNameSnapshot: itemName, loadWeight: loadWt, status, createdById: userId },
  });
}

async function createPB(purchaseNo: string, epId: string | null, passNo: string | null, supplierId: string, supplierName: string, wcId: string, itemId: string, itemName: string, vehicle: string, loadWt: number, emptyWt: number, rate: number, gstPct: number, userId: string, dt: Date, status: 'DRAFT' | 'POSTED' | 'CANCELLED') {
  const existing = await prisma.purchaseBill.findUnique({ where: { purchaseNo } });
  if (existing) return existing;
  const netWt = loadWt - emptyWt;
  const gross = netWt * rate;
  const gst = (gross * gstPct) / 100;
  return prisma.purchaseBill.create({
    data: { purchaseNo, purchaseDateTime: dt, entryPassId: epId, passNoSnapshot: passNo, vehicleNoSnapshot: vehicle, supplierId, supplierNameSnapshot: supplierName, workCentreId: wcId, itemId, itemNameSnapshot: itemName, loadWeight: loadWt, emptyWeight: emptyWt, netWeight: netWt, rate, grossAmount: gross, gstPercent: gstPct, gstAmount: gst, grossPayable: gross + gst, paymentMode: 'CREDIT', status, createdById: userId },
  });
}

async function createShift(shiftNo: string, shiftDate: Date, openedBy: string, openingAmt: number, status: 'OPEN' | 'CLOSED', closedAt: Date | null, cashRec: number, netAmt: number, cashHand: number, userId: string) {
  const existing = await prisma.shift.findUnique({ where: { shiftNo } });
  if (existing) return existing;
  return prisma.shift.create({
    data: { shiftNo, shiftDate, openedAt: shiftDate, openedById: userId, openedBySnapshot: openedBy, openingAmount: openingAmt, status, closedAt, closedById: status === 'CLOSED' ? userId : null, closedBySnapshot: status === 'CLOSED' ? openedBy : null, totalCashReceived: cashRec, netAmount: netAmt, cashInHand: cashHand },
  });
}

async function createCX(entryNo: string, dt: Date, outDetails: {denomination:number;nos:number;amount:number}[], inDetails: {denomination:number;nos:number;amount:number}[], userId: string) {
  const existing = await prisma.currencyExchange.findUnique({ where: { entryNo } });
  if (existing) return existing;
  const paid = outDetails.reduce((s, d) => s + d.amount, 0);
  const recv = inDetails.reduce((s, d) => s + d.amount, 0);
  return prisma.currencyExchange.create({
    data: { entryNo, billDateTime: dt, outDetails, inDetails, totalAmountPaid: paid, totalAmountReceived: recv, status: 'OPEN', createdById: userId },
  });
}

async function createCV(voucherNo: string, type: 'PAYMENT' | 'RECEIPT', docDate: Date, lines: {slNo:number;accountHeadNameSnapshot:string;description:string;amount:number}[], mode: 'CASH' | 'ONLINE' | 'CREDIT' | 'MIXED', preparedBy: string, status: 'DRAFT' | 'POSTED' | 'CANCELLED', userId: string) {
  const existing = await prisma.cashVoucher.findUnique({ where: { voucherNo } });
  if (existing) return existing;
  const total = lines.reduce((s, l) => s + l.amount, 0);
  return prisma.cashVoucher.create({
    data: { voucherNo, voucherType: type, docDate, lines, totalAmount: total, paymentMode: mode, preparedById: userId, preparedBySnapshot: preparedBy, status },
  });
}

async function createFuel(entryNo: string, vehicleId: string, vehicleReg: string, wcId: string, supplierId: string, supplierName: string, meterStart: number, meterCurrent: number, qty: number, rate: number, userId: string, dt: Date) {
  const existing = await prisma.fuelConsumption.findUnique({ where: { entryNo } });
  if (existing) return existing;
  const fuelAmount = qty * rate;
  return prisma.fuelConsumption.create({
    data: { entryNo, entryDateTime: dt, vehicleId, vehicleRegNoSnapshot: vehicleReg, workCentreId: wcId, supplierId, supplierNameSnapshot: supplierName, meterStartReading: meterStart, meterCurrentReading: meterCurrent, fuelFilledQty: qty, ratePerLiter: rate, fuelAmount, expenses: [], totalExpenseAmount: fuelAmount, paidAmount: fuelAmount, status: 'POSTED', createdById: userId },
  });
}

async function createRM(entryNo: string, itemId: string, itemName: string, current: number, consumed: number, userId: string, dt: Date, status: 'SAVED' | 'POSTED' | 'CANCELLED') {
  const existing = await prisma.rawMaterialEntry.findUnique({ where: { entryNo } });
  if (existing) return existing;
  return prisma.rawMaterialEntry.create({
    data: { entryNo, entryDateTime: dt, itemId, itemNameSnapshot: itemName, currentStockTonn: current, consumedTonn: consumed, closingStockTonn: current - consumed, status, createdById: userId },
  });
}

async function createToken(tokenNo: string, entryNo: string, customerId: string, itemId: string, vehicleNo: string, emptyWeight: number, driverName: string, userId: string, dt: Date) {
  const existing = await prisma.token.findFirst({ where: { tokenNo } });
  if (existing) return existing;
  return prisma.token.create({
    data: { tokenNo, entryNo, tokenDateTime: dt, vehicleNo, emptyWeight, customerId, driverName, itemId, status: 'BILLED', createdById: userId },
  });
}

async function createSalesBill(billNo: string, tokenId: string, customerId: string, vehicleNo: string, driverName: string, itemId: string, emptyWeight: number, grossWeight: number, rate: number, cgstPct: number, sgstPct: number, igstPct: number, paymentMode: 'CASH' | 'ONLINE' | 'CREDIT' | 'MIXED', userId: string, dt: Date) {
  const existing = await prisma.salesBill.findUnique({ where: { billNo } });
  if (existing) return existing;
  const netWeight = grossWeight - emptyWeight;
  const taxable = netWeight * rate;
  const cgstAmt = taxable * cgstPct / 100;
  const sgstAmt = taxable * sgstPct / 100;
  const igstAmt = taxable * igstPct / 100;
  const total = taxable + cgstAmt + sgstAmt + igstAmt;
  const cashAmount = paymentMode === 'CASH' ? total : 0;
  const onlineAmount = paymentMode === 'ONLINE' ? total : 0;
  const creditAmount = paymentMode === 'CREDIT' ? total : 0;
  // Update the token to BILLED
  await prisma.token.update({ where: { id: tokenId }, data: { status: 'BILLED' } });
  return prisma.salesBill.create({
    data: { billNo, billDate: dt, tokenId, customerId, vehicleNo, driverName, itemId, emptyWeight, grossWeight, netWeight, rate, taxableAmount: taxable, cgstPercent: cgstPct, sgstPercent: sgstPct, igstPercent: igstPct, cgstAmount: cgstAmt, sgstAmount: sgstAmt, igstAmount: igstAmt, totalAmount: total, paymentMode, cashAmount, onlineAmount, creditAmount, status: 'POSTED', createdById: userId },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
