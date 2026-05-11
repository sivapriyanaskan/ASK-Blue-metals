import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../../infra/db.js';
import { Errors } from '../../../infra/errors.js';
import { asyncHandler, validate } from '../../../infra/validation.js';
import { requireAuth } from '../../iam/auth.middleware.js';
import { auditService } from '../../audit/audit.service.js';
import { actorContextFromRequest } from '../../masters/_common.js';

const STATUSES = ['NEW', 'CONSUMED', 'IN_STOCK', 'UNDEFINED'] as const;
type ConsumptionStatus = (typeof STATUSES)[number];

const ListQuery = z.object({
  shiftId: z.string().min(1).optional(),
  status: z.enum(STATUSES).optional(),
  search: z.string().trim().min(1).optional(),
  includePreviousUndefined: z.coerce.boolean().optional(),
});

const BulkUpdate = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
  status: z.enum(['CONSUMED', 'IN_STOCK', 'UNDEFINED', 'NEW']),
});

const ShiftIdQuery = z.object({ shiftId: z.string().min(1).optional() });

const router = Router();
router.use(requireAuth);

/** Resolve the "current" shift id: explicit param wins, else most-recent OPEN shift. */
async function resolveShiftId(explicit?: string): Promise<string | null> {
  if (explicit) return explicit;
  const open = await prisma.shift.findFirst({
    where: { status: 'OPEN' },
    orderBy: { openedAt: 'desc' },
    select: { id: true },
  });
  return open?.id ?? null;
}

/**
 * List consumption rows.
 *
 * Behaviour:
 *  - If `shiftId` is provided (or an OPEN shift exists), returns rows created
 *    in that shift. When `includePreviousUndefined=true` we also include
 *    UNDEFINED rows from older shifts so the user can settle them.
 *  - If no shift is provided and none is open, returns the empty set.
 */
router.get('/', validate('query', ListQuery), asyncHandler(async (req, res) => {
  const q = req.query as unknown as z.infer<typeof ListQuery>;
  const shiftId = await resolveShiftId(q.shiftId);

  if (!shiftId) {
    res.json({ items: [], shiftId: null });
    return;
  }

  const baseFilter: any = { createdByShiftId: shiftId };
  if (q.status) baseFilter.status = q.status;

  const orFilters: any[] = [baseFilter];
  if (q.includePreviousUndefined) {
    orFilters.push({ status: 'UNDEFINED', createdByShiftId: { not: shiftId } });
  }

  const where: any = { OR: orFilters };
  if (q.search) {
    where.AND = [{
      OR: [
        { purchaseBill: { purchaseNo: { contains: q.search, mode: 'insensitive' } } },
        { purchaseBill: { supplierNameSnapshot: { contains: q.search, mode: 'insensitive' } } },
        { purchaseBill: { itemNameSnapshot: { contains: q.search, mode: 'insensitive' } } },
      ],
    }];
  }

  const items = await prisma.purchaseConsumption.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      purchaseBill: {
        select: {
          id: true,
          purchaseNo: true,
          purchaseDateTime: true,
          supplierId: true,
          supplierNameSnapshot: true,
          itemId: true,
          itemNameSnapshot: true,
          netWeight: true,
          status: true,
        },
      },
      createdByShift: { select: { id: true, shiftNo: true, shiftDate: true } },
      updatedByShift: { select: { id: true, shiftNo: true, shiftDate: true } },
    },
  });

  res.json({ items, shiftId });
}));

/** Aggregate counts for the dashboard cards. */
router.get('/stats', validate('query', ShiftIdQuery), asyncHandler(async (req, res) => {
  const q = req.query as unknown as z.infer<typeof ShiftIdQuery>;
  const shiftId = await resolveShiftId(q.shiftId);

  if (!shiftId) {
    res.json({ totalBills: 0, totalQty: 0, consumedQty: 0, inStockQty: 0, newQty: 0, undefinedQty: 0, consumptionRate: 0, shiftId: null });
    return;
  }

  const rows = await prisma.purchaseConsumption.groupBy({
    by: ['status'],
    where: { createdByShiftId: shiftId },
    _count: { _all: true },
    _sum: { quantity: true },
  });

  const stat: Record<ConsumptionStatus, { count: number; qty: number }> = {
    NEW: { count: 0, qty: 0 },
    CONSUMED: { count: 0, qty: 0 },
    IN_STOCK: { count: 0, qty: 0 },
    UNDEFINED: { count: 0, qty: 0 },
  };
  for (const r of rows) {
    stat[r.status as ConsumptionStatus] = {
      count: r._count._all,
      qty: Number(r._sum.quantity ?? 0),
    };
  }

  const totalBills = stat.NEW.count + stat.CONSUMED.count + stat.IN_STOCK.count + stat.UNDEFINED.count;
  const totalQty = stat.NEW.qty + stat.CONSUMED.qty + stat.IN_STOCK.qty + stat.UNDEFINED.qty;
  const consumptionRate = totalQty > 0 ? (stat.CONSUMED.qty / totalQty) * 100 : 0;

  res.json({
    shiftId,
    totalBills,
    totalQty,
    consumedQty: stat.CONSUMED.qty,
    inStockQty: stat.IN_STOCK.qty,
    newQty: stat.NEW.qty,
    undefinedQty: stat.UNDEFINED.qty,
    consumptionRate,
  });
}));

/** Count of rows blocking the close of a given shift (status = NEW). */
router.get('/blocking', validate('query', ShiftIdQuery), asyncHandler(async (req, res) => {
  const q = req.query as unknown as z.infer<typeof ShiftIdQuery>;
  const shiftId = await resolveShiftId(q.shiftId);
  if (!shiftId) {
    res.json({ count: 0, shiftId: null });
    return;
  }
  const count = await prisma.purchaseConsumption.count({
    where: { createdByShiftId: shiftId, status: 'NEW' },
  });
  res.json({ count, shiftId });
}));

/** UNDEFINED rows from previous shifts — shown as a popup on next-shift open. */
router.get('/undefined-pending', asyncHandler(async (_req, res) => {
  const items = await prisma.purchaseConsumption.findMany({
    where: { status: 'UNDEFINED' },
    orderBy: { createdAt: 'desc' },
    include: {
      purchaseBill: {
        select: {
          id: true,
          purchaseNo: true,
          purchaseDateTime: true,
          supplierNameSnapshot: true,
          itemNameSnapshot: true,
          netWeight: true,
        },
      },
      createdByShift: { select: { id: true, shiftNo: true, shiftDate: true } },
    },
  });
  res.json({ items });
}));

/** Bulk status update. */
router.patch('/bulk', validate('body', BulkUpdate), asyncHandler(async (req, res) => {
  const actor = actorContextFromRequest(req);
  const body = req.body as z.infer<typeof BulkUpdate>;

  const openShift = await prisma.shift.findFirst({
    where: { status: 'OPEN' },
    orderBy: { openedAt: 'desc' },
    select: { id: true },
  });

  const result = await prisma.purchaseConsumption.updateMany({
    where: { id: { in: body.ids } },
    data: {
      status: body.status,
      updatedByShiftId: openShift?.id ?? null,
    },
  });

  await auditService.record({
    ...actor,
    action: 'UPDATE',
    resource: 'PurchaseConsumption.Bulk',
    resourceId: body.ids.join(','),
    changes: { ids: body.ids, status: body.status },
  });

  res.json({ count: result.count });
}));

/** Single-row status update (kept for parity / future use). */
router.patch('/:id', validate('body', z.object({ status: z.enum(STATUSES) })), asyncHandler(async (req, res) => {
  const actor = actorContextFromRequest(req);
  const row = await prisma.purchaseConsumption.findUnique({ where: { id: req.params.id } });
  if (!row) throw Errors.notFound('Consumption row not found');

  const openShift = await prisma.shift.findFirst({
    where: { status: 'OPEN' },
    orderBy: { openedAt: 'desc' },
    select: { id: true },
  });

  const updated = await prisma.purchaseConsumption.update({
    where: { id: row.id },
    data: { status: req.body.status, updatedByShiftId: openShift?.id ?? null },
  });
  await auditService.record({
    ...actor,
    action: 'UPDATE',
    resource: 'PurchaseConsumption',
    resourceId: row.id,
    changes: { status: req.body.status },
  });
  res.json(updated);
}));

export const purchaseConsumptionRouter = router;
