import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
(async () => {
  const c = await p.counter.findUnique({ where: { scope: 'fuel:2026' } });
  const recent = await p.fuelConsumption.findMany({
    orderBy: { entryNo: 'desc' },
    take: 10,
    select: { entryNo: true, createdAt: true },
  });
  console.log(JSON.stringify({ counter: c, recent }, null, 2));
  await p.$disconnect();
})();
