import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

(async () => {
  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;

  // ── Currency exchange: CXG-YYYY-### ──
  {
    const prefix = `CXG-${year}-`;
    const rows = await p.currencyExchange.findMany({
      where: { entryNo: { startsWith: prefix } },
      select: { entryNo: true },
    });
    let max = 0;
    for (const r of rows) {
      const n = parseInt(r.entryNo.slice(prefix.length), 10);
      if (Number.isFinite(n) && n > max) max = n;
    }
    const scope = `cx:${year}`;
    const u = await p.counter.upsert({
      where: { scope },
      create: { scope, value: max },
      update: { value: max },
    });
    console.log(`Synced ${scope} -> ${u.value} (max ${prefix}### = ${max})`);
  }

  // ── Cash voucher: PV/MM/N/YY and RV/MM/N/YY (per type, per month) ──
  for (const type of ['PAYMENT', 'RECEIPT'] as const) {
    const prefix = type === 'PAYMENT' ? 'PV' : 'RV';
    const yy = String(year).slice(-2);
    const mm = String(month).padStart(2, '0');
    const like = `${prefix}/${mm}/`;
    const rows = await p.cashVoucher.findMany({
      where: { voucherType: type, voucherNo: { startsWith: like } },
      select: { voucherNo: true },
    });
    let max = 0;
    for (const r of rows) {
      // format: PV/MM/N/YY
      const parts = r.voucherNo.split('/');
      if (parts.length >= 3 && parts[3] === yy) {
        const n = parseInt(parts[2], 10);
        if (Number.isFinite(n) && n > max) max = n;
      }
    }
    const scope = `cv:${type}:${year}-${mm}`;
    const u = await p.counter.upsert({
      where: { scope },
      create: { scope, value: max },
      update: { value: max },
    });
    console.log(`Synced ${scope} -> ${u.value} (max ${like}#/${yy} = ${max})`);
  }

  // ── Fuel consumption: FE-YYYY-### ──
  {
    const prefix = `FE-${year}-`;
    const rows = await p.fuelConsumption.findMany({
      where: { entryNo: { startsWith: prefix } },
      select: { entryNo: true },
    });
    let max = 0;
    for (const r of rows) {
      const n = parseInt(r.entryNo.slice(prefix.length), 10);
      if (Number.isFinite(n) && n > max) max = n;
    }
    const scope = `fuel:${year}`;
    const u = await p.counter.upsert({
      where: { scope },
      create: { scope, value: max },
      update: { value: max },
    });
    console.log(`Synced ${scope} -> ${u.value} (max ${prefix}### = ${max})`);
  }

  await p.$disconnect();
})();
