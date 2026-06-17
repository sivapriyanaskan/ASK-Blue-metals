import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../infra/db.js';
import { asyncHandler, validate } from '../../../infra/validation.js';
import { requireAuth } from '../../iam/auth.middleware.js';
import { auditService } from '../../audit/audit.service.js';
import { actorContextFromRequest } from '../../masters/_common.js';

const ListQuery = z.object({
  itemId: z.string().min(1).optional(),
  status: z.enum(['SAVED', 'POSTED', 'CANCELLED']).optional(),
  source: z.enum(['ITEM_WISE', 'PURCHASE_WISE']).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

const Create = z.object({
  entryDateTime: z.coerce.date().optional(),
  itemId: z.string().min(1),
  currentStockTonn: z.coerce.number().nonnegative(),
  consumedTonn: z.coerce.number().nonnegative(),
  status: z.enum(['SAVED', 'POSTED', 'CANCELLED']).optional(),
  source: z.enum(['ITEM_WISE', 'PURCHASE_WISE']).optional(),
  remarks: z.string().max(500).optional().nullable(),
});

const Update = z.object({
  entryDateTime: z.coerce.date().optional(),
  itemId: z.string().min(1).optional(),
  currentStockTonn: z.coerce.number().nonnegative().optional(),
  consumedTonn: z.coerce.number().nonnegative().optional(),
  status: z.enum(['SAVED', 'POSTED', 'CANCELLED']).optional(),
  remarks: z.string().max(500).optional().nullable(),
});

const IdParam = z.object({ id: z.string().min(1) });
const router = Router();
router.use(requireAuth);

router.get('/', validate('query', ListQuery), asyncHandler(async (req, res) => {
  const q = req.query as unknown as z.infer<typeof ListQuery>;
  const where: Prisma.RawMaterialEntryWhereInput = {
    ...(q.itemId ? { itemId: q.itemId } : {}),
    ...(q.status ? { status: q.status } : {}),
    ...(q.source ? { source: q.source } : {}),
    ...(q.search ? {
      OR: [
        { entryNo: { contains: q.search, mode: 'insensitive' } },
        { itemNameSnapshot: { contains: q.search, mode: 'insensitive' } },
      ],
    } : {}),
    ...(q.dateFrom || q.dateTo ? {
      entryDateTime: {
        ...(q.dateFrom ? { gte: q.dateFrom } : {}),
        ...(q.dateTo ? { lte: q.dateTo } : {}),
      },
    } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.rawMaterialEntry.findMany({
      where,
      orderBy: { entryDateTime: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: { item: { select: { id: true, code: true, name: true } } },
    }),
    prisma.rawMaterialEntry.count({ where }),
  ]);
  res.json({ items, page: q.page, pageSize: q.pageSize, total });
}));

router.get('/:id', validate('params', IdParam), asyncHandler(async (req, res) => {
  const entry = await prisma.rawMaterialEntry.findUnique({
    where: { id: req.params.id },
    include: { item: { select: { id: true, code: true, name: true } } },
  });
  if (!entry) return res.status(404).json({ message: 'Not found' });
  res.json(entry);
}));

router.post('/', validate('body', Create), asyncHandler(async (req, res) => {
  const data = req.body as z.infer<typeof Create>;
  const actor = actorContextFromRequest(req);

  const item = await prisma.item.findUnique({ where: { id: data.itemId } });
  if (!item) return res.status(422).json({ message: 'Item not found' });

  const closingStockTonn = data.currentStockTonn - data.consumedTonn;
  if (closingStockTonn < 0) return res.status(422).json({ message: 'Consumed quantity exceeds current stock' });

  const year = new Date().getFullYear();
  const scope = `rm:${year}`;
  const prefix = `RM-${year}-`;

  // Ensure the counter never falls behind seeded/existing data.
  const maxEntry = await prisma.rawMaterialEntry.findFirst({
    where: { entryNo: { startsWith: prefix } },
    orderBy: { entryNo: 'desc' },
    select: { entryNo: true },
  });
  const maxSeq = maxEntry ? parseInt(maxEntry.entryNo.slice(prefix.length), 10) || 0 : 0;

  let entry;
  let attempts = 0;
  while (true) {
    const counter = await prisma.counter.upsert({
      where: { scope },
      create: { scope, value: Math.max(1, maxSeq + 1) },
      update: { value: { increment: 1 } },
    });
    const seq = Math.max(counter.value, maxSeq + 1 + attempts);
    const entryNo = `${prefix}${String(seq).padStart(3, '0')}`;
    try {
      entry = await prisma.rawMaterialEntry.create({
        data: {
          entryNo,
          entryDateTime: data.entryDateTime ?? new Date(),
          itemId: data.itemId,
          itemNameSnapshot: item.name,
          currentStockTonn: data.currentStockTonn,
          consumedTonn: data.consumedTonn,
          closingStockTonn,
          status: data.status ?? 'SAVED',
          source: data.source ?? 'ITEM_WISE',
          remarks: data.remarks ?? null,
          createdById: actor.actorId ?? 'system',
        },
      });
      // Bump counter past any value we had to skip.
      if (counter.value < seq) {
        await prisma.counter.update({ where: { scope }, data: { value: seq } });
      }
      break;
    } catch (err: any) {
      if (err?.code === 'P2002' && attempts < 5) {
        attempts += 1;
        continue;
      }
      throw err;
    }
  }
  await auditService.record({ ...actor, action: 'CREATE', resource: 'RawMaterialEntry', resourceId: entry.id, changes: data });
  res.status(201).json(entry);
}));

router.patch('/:id', validate('params', IdParam), validate('body', Update), asyncHandler(async (req, res) => {
  const data = req.body as z.infer<typeof Update>;
  const actor = actorContextFromRequest(req);

  const existing = await prisma.rawMaterialEntry.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ message: 'Not found' });
  if (existing.status === 'CANCELLED') return res.status(422).json({ message: 'Cancelled entries cannot be edited' });

  let itemNameSnapshot = existing.itemNameSnapshot;
  if (data.itemId && data.itemId !== existing.itemId) {
    const item = await prisma.item.findUnique({ where: { id: data.itemId } });
    if (!item) return res.status(422).json({ message: 'Item not found' });
    itemNameSnapshot = item.name;
  }

  const currentStockTonn = data.currentStockTonn ?? Number(existing.currentStockTonn);
  const consumedTonn = data.consumedTonn ?? Number(existing.consumedTonn);
  const closingStockTonn = currentStockTonn - consumedTonn;
  if (closingStockTonn < 0) return res.status(422).json({ message: 'Consumed quantity exceeds current stock' });

  const updated = await prisma.rawMaterialEntry.update({
    where: { id: req.params.id },
    data: {
      ...(data.entryDateTime ? { entryDateTime: data.entryDateTime } : {}),
      ...(data.itemId ? { itemId: data.itemId, itemNameSnapshot } : {}),
      currentStockTonn,
      consumedTonn,
      closingStockTonn,
      ...(data.status ? { status: data.status } : {}),
      ...(data.remarks !== undefined ? { remarks: data.remarks } : {}),
    },
  });
  await auditService.record({ ...actor, action: 'UPDATE', resource: 'RawMaterialEntry', resourceId: updated.id, changes: data });
  res.json(updated);
}));

export const rawMaterialEntryRouter = router;
