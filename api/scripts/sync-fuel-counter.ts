import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
(async () => {
  const year = new Date().getFullYear();
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
  const updated = await p.counter.upsert({
    where: { scope },
    create: { scope, value: max },
    update: { value: max },
  });
  console.log(`Synced counter ${scope} -> ${updated.value} (max existing entryNo: ${max})`);
  await p.$disconnect();
})();
