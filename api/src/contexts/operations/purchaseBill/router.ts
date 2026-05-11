import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../infra/db.js';
import { Errors } from '../../../infra/errors.js';
import { asyncHandler, validate } from '../../../infra/validation.js';
import { requireAuth } from '../../iam/auth.middleware.js';
import { auditService } from '../../audit/audit.service.js';
import { actorContextFromRequest } from '../../masters/_common.js';

const DEFAULT_HIGH_VALUE_CONFIRMATION_LIMIT = 750000;

async function getHighValueConfirmationLimit() {
  const raw = await prisma.systemSetting.findUnique({
    where: { key: 'billing.highValueConfirmationLimit' },
    select: { value: true },
  });
  const parsed = Number(raw?.value ?? DEFAULT_HIGH_VALUE_CONFIRMATION_LIMIT);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_HIGH_VALUE_CONFIRMATION_LIMIT;
}

const ListQuery = z.object({
  search: z.string().trim().min(1).optional(),
  supplierId: z.string().min(1).optional(),
  workCentreId: z.string().min(1).optional(),
  status: z.enum(['DRAFT', 'POSTED', 'CANCELLED']).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

const Create = z.object({
  entryPassId: z.string().min(1).optional().nullable(),
  vehicleNoSnapshot: z.string().trim().min(1).max(32).transform(s => s.toUpperCase()),
  driverNameSnapshot: z.string().trim().max(120).optional().nullable(),
  supplierId: z.string().min(1),
  workCentreId: z.string().min(1).optional().nullable(),
  itemId: z.string().min(1),
  loadWeight: z.coerce.number().nonnegative(),
  emptyWeight: z.coerce.number().nonnegative(),
  rate: z.coerce.number().nonnegative(),
  gstPercent: z.coerce.number().nonnegative().default(0),
  paymentMode: z.enum(['CASH', 'ONLINE', 'CREDIT', 'MIXED']).default('CREDIT'),
  confirmationReason: z.string().trim().max(500).optional().nullable(),
  anprImageRef: z.string().trim().max(500).optional().nullable(),
  loadImageRef: z.string().trim().max(500).optional().nullable(),
});

const Cancel = z.object({ cancelledReason: z.string().trim().min(3).max(500) });
const IdParam = z.object({ id: z.string().min(1) });

const router = Router();
router.use(requireAuth);

router.get('/', validate('query', ListQuery), asyncHandler(async (req, res) => {
  const q = req.query as unknown as z.infer<typeof ListQuery>;
  const where: Prisma.PurchaseBillWhereInput = {
    ...(q.supplierId ? { supplierId: q.supplierId } : {}),
    ...(q.workCentreId ? { workCentreId: q.workCentreId } : {}),
    ...(q.status ? { status: q.status } : {}),
    ...(q.search ? {
      OR: [
        { purchaseNo: { contains: q.search, mode: 'insensitive' } },
        { vehicleNoSnapshot: { contains: q.search, mode: 'insensitive' } },
        { supplierNameSnapshot: { contains: q.search, mode: 'insensitive' } },
        { passNoSnapshot: { contains: q.search, mode: 'insensitive' } },
      ],
    } : {}),
    ...(q.dateFrom || q.dateTo ? {
      purchaseDateTime: {
        ...(q.dateFrom ? { gte: q.dateFrom } : {}),
        ...(q.dateTo ? { lte: q.dateTo } : {}),
      },
    } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.purchaseBill.findMany({
      where,
      orderBy: { purchaseDateTime: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: {
        supplier: { select: { id: true, code: true, name: true } },
        workCentre: { select: { id: true, code: true, name: true } },
        item: { select: { id: true, code: true, name: true } },
      },
    }),
    prisma.purchaseBill.count({ where }),
  ]);
  res.json({ items, page: q.page, pageSize: q.pageSize, total });
}));

router.get('/:id', validate('params', IdParam), asyncHandler(async (req, res) => {
  const bill = await prisma.purchaseBill.findUnique({
    where: { id: req.params.id },
    include: {
      supplier: { select: { id: true, code: true, name: true, address: true, gstNumber: true, phone: true } },
      workCentre: { select: { id: true, code: true, name: true } },
      item: { select: { id: true, code: true, name: true } },
      entryPass: {
        select: {
          id: true,
          passNo: true,
          status: true,
          anprImageRef: true,
          anprNumberPlateText: true,
          loadImageRef: true,
        },
      },
    },
  });
  if (!bill) return res.status(404).json({ message: 'Not found' });
  res.json(bill);
}));

router.post('/', validate('body', Create), asyncHandler(async (req, res) => {
  const data = req.body as z.infer<typeof Create>;
  const actor = actorContextFromRequest(req);

  const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId } });
  if (!supplier) return res.status(422).json({ message: 'Supplier not found' });
  if (data.workCentreId) {
    const workCentre = await prisma.workCentre.findUnique({ where: { id: data.workCentreId } });
    if (!workCentre) return res.status(422).json({ message: 'Work centre not found' });
  }
  const item = await prisma.item.findUnique({ where: { id: data.itemId } });
  if (!item) return res.status(422).json({ message: 'Item not found' });

  const netWeight = data.loadWeight - data.emptyWeight;
  const grossAmount = netWeight * data.rate;
  const gstAmount = (grossAmount * data.gstPercent) / 100;
  const grossPayable = grossAmount + gstAmount;
  const highValueConfirmationLimit = await getHighValueConfirmationLimit();
  if (grossPayable > highValueConfirmationLimit && !data.confirmationReason?.trim()) {
    throw Errors.badRequest('Confirmation reason is required when payment amount exceeds the configured limit');
  }

  const fy = new Date().getFullYear() % 100;
  const scope = `pb:${fy}`;
  const prefix = `${fy}`;

  let passNoSnapshot: string | null = null;
  if (data.entryPassId) {
    const pass = await prisma.purchaseEntryPass.findUnique({ where: { id: data.entryPassId } });
    passNoSnapshot = pass?.passNo ?? null;
  }

  // Generate purchaseNo with conflict-safe counter.
  // Find the current max stored number so the counter never falls behind seeded data.
  const maxBill = await prisma.purchaseBill.findFirst({
    where: { purchaseNo: { endsWith: `/${prefix}` } },
    orderBy: { purchaseNo: 'desc' },
    select: { purchaseNo: true },
  });
  const maxSeq = maxBill ? parseInt(maxBill.purchaseNo.split('/')[0], 10) - 10200 : 0;

  let bill;
  let attempts = 0;
  while (true) {
    const counter = await prisma.counter.upsert({
      where: { scope },
      create: { scope, value: Math.max(1, maxSeq + 1) },
      update: { value: { increment: 1 } },
    });
    // Ensure we never reuse a number that already exists
    const seq = Math.max(counter.value, maxSeq + 1 + attempts);
    const purchaseNo = `${10200 + seq}/${fy}`;
    try {
      bill = await prisma.purchaseBill.create({
        data: {
          purchaseNo,
          entryPassId: data.entryPassId ?? null,
          passNoSnapshot,
          vehicleNoSnapshot: data.vehicleNoSnapshot,
          driverNameSnapshot: data.driverNameSnapshot ?? null,
          supplierId: data.supplierId,
          supplierNameSnapshot: supplier.name,
          workCentreId: data.workCentreId ?? null,
          itemId: data.itemId,
          itemNameSnapshot: item.name,
          loadWeight: data.loadWeight,
          emptyWeight: data.emptyWeight,
          netWeight,
          rate: data.rate,
          grossAmount,
          gstPercent: data.gstPercent,
          gstAmount,
          grossPayable,
          confirmationReason: data.confirmationReason ?? null,
          paymentMode: data.paymentMode,
          anprImageRef: data.anprImageRef ?? null,
          loadImageRef: data.loadImageRef ?? null,
          status: 'POSTED',
          createdById: actor.actorId ?? 'system',
        },
      });
      // Mark entry pass as BILLED within the same attempt
      if (data.entryPassId) {
        await prisma.purchaseEntryPass.update({
          where: { id: data.entryPassId },
          data: { status: 'BILLED' },
        });
      }
      // Auto-create a NEW PurchaseConsumption row tied to the current open shift.
      // Used by the Raw Material — Purchase Wise screen and shift close
      // validation. If no shift is open the row is still created (no shift
      // attribution) so the bill never goes untracked.
      const openShift = await prisma.shift.findFirst({
        where: { status: 'OPEN' },
        orderBy: { openedAt: 'desc' },
        select: { id: true },
      });
      await prisma.purchaseConsumption.create({
        data: {
          purchaseBillId: bill.id,
          itemId: bill.itemId,
          quantity: bill.netWeight,
          status: 'NEW',
          createdByShiftId: openShift?.id ?? null,
        },
      });
      break;
    } catch (err: any) {
      if (err?.code === 'P2002' && attempts < 5) {
        attempts++;
        // Sync counter forward past the conflicting number
        await prisma.counter.update({ where: { scope }, data: { value: { increment: 1 } } });
        continue;
      }
      throw err;
    }
  }

  await auditService.record({ ...actor, action: 'CREATE', resource: 'PurchaseBill', resourceId: bill.id, changes: data });
  res.status(201).json(bill);
}));

router.post('/:id/cancel', validate('params', IdParam), validate('body', Cancel), asyncHandler(async (req, res) => {
  const actor = actorContextFromRequest(req);
  const bill = await prisma.purchaseBill.findUnique({ where: { id: req.params.id } });
  if (!bill) return res.status(404).json({ message: 'Not found' });
  if (bill.status === 'CANCELLED') return res.status(422).json({ message: 'Already cancelled' });

  const updated = await prisma.purchaseBill.update({
    where: { id: req.params.id },
    data: { status: 'CANCELLED', cancelledReason: req.body.cancelledReason },
  });
  // Revert entry pass to OPEN if the bill is cancelled
  if (bill.entryPassId) {
    await prisma.purchaseEntryPass.update({
      where: { id: bill.entryPassId },
      data: { status: 'OPEN' },
    });
  }
  await auditService.record({ ...actor, action: 'CANCEL', resource: 'PurchaseBill', resourceId: bill.id, changes: { cancelledReason: req.body.cancelledReason } });
  res.json(updated);
}));

export const purchaseBillRouter = router;
