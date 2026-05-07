import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../infra/db.js';
import { asyncHandler, validate } from '../../../infra/validation.js';
import { requireAuth } from '../../iam/auth.middleware.js';
import { auditService } from '../../audit/audit.service.js';
import { actorContextFromRequest } from '../../masters/_common.js';

const ListQuery = z.object({
  search: z.string().trim().min(1).optional(),
  supplierId: z.string().min(1).optional(),
  status: z.enum(['OPEN', 'BILLED', 'CANCELLED']).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

const Create = z.object({
  vehicleNoSnapshot: z.string().trim().min(1).max(32).transform(s => s.toUpperCase()),
  driverNameSnapshot: z.string().trim().max(120).optional().nullable(),
  driverMobile: z.string().trim().max(20).optional().nullable(),
  supplierId: z.string().min(1),
  workCentreId: z.string().min(1),
  itemId: z.string().min(1),
  loadWeight: z.coerce.number().nonnegative(),
  crRefNo: z.string().trim().max(50).optional().nullable(),
});

const Cancel = z.object({ cancelledReason: z.string().trim().min(3).max(500) });
const IdParam = z.object({ id: z.string().min(1) });

const router = Router();
router.use(requireAuth);

router.get('/', validate('query', ListQuery), asyncHandler(async (req, res) => {
  const q = req.query as unknown as z.infer<typeof ListQuery>;
  const where: Prisma.PurchaseEntryPassWhereInput = {
    ...(q.supplierId ? { supplierId: q.supplierId } : {}),
    ...(q.status ? { status: q.status } : {}),
    ...(q.search ? {
      OR: [
        { passNo: { contains: q.search, mode: 'insensitive' } },
        { vehicleNoSnapshot: { contains: q.search, mode: 'insensitive' } },
        { supplierNameSnapshot: { contains: q.search, mode: 'insensitive' } },
      ],
    } : {}),
    ...(q.dateFrom || q.dateTo ? {
      passDateTime: {
        ...(q.dateFrom ? { gte: q.dateFrom } : {}),
        ...(q.dateTo ? { lte: q.dateTo } : {}),
      },
    } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.purchaseEntryPass.findMany({
      where,
      orderBy: { passDateTime: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: {
        supplier: { select: { id: true, code: true, name: true } },
        workCentre: { select: { id: true, code: true, name: true } },
        item: { select: { id: true, code: true, name: true } },
      },
    }),
    prisma.purchaseEntryPass.count({ where }),
  ]);
  res.json({ items, page: q.page, pageSize: q.pageSize, total });
}));

router.get('/:id', validate('params', IdParam), asyncHandler(async (req, res) => {
  const pass = await prisma.purchaseEntryPass.findUnique({
    where: { id: req.params.id },
    include: {
      supplier: { select: { id: true, code: true, name: true } },
      workCentre: { select: { id: true, code: true, name: true } },
      item: { select: { id: true, code: true, name: true } },
      bills: { select: { id: true, purchaseNo: true, status: true } },
    },
  });
  if (!pass) return res.status(404).json({ message: 'Not found' });
  res.json(pass);
}));

router.post('/', validate('body', Create), asyncHandler(async (req, res) => {
  const data = req.body as z.infer<typeof Create>;
  const actor = actorContextFromRequest(req);

  const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId } });
  if (!supplier) return res.status(422).json({ message: 'Supplier not found' });
  const workCentre = await prisma.workCentre.findUnique({ where: { id: data.workCentreId } });
  if (!workCentre) return res.status(422).json({ message: 'Work centre not found' });
  const item = await prisma.item.findUnique({ where: { id: data.itemId } });
  if (!item) return res.status(422).json({ message: 'Item not found' });

  // Generate passNo: sequential daily number PASS/DDMMYY/NNN
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yy = String(today.getFullYear()).slice(-2);
  const scope = `pass:${today.toISOString().slice(0, 10)}`;
  const counter = await prisma.counter.upsert({
    where: { scope },
    create: { scope, value: 1 },
    update: { value: { increment: 1 } },
  });
  const passNo = `EP/${dd}${mm}${yy}/${String(counter.value).padStart(3, '0')}`;

  const pass = await prisma.purchaseEntryPass.create({
    data: {
      passNo,
      vehicleNoSnapshot: data.vehicleNoSnapshot,
      driverNameSnapshot: data.driverNameSnapshot ?? null,
      driverMobile: data.driverMobile ?? null,
      supplierId: data.supplierId,
      supplierNameSnapshot: supplier.name,
      workCentreId: data.workCentreId,
      itemId: data.itemId,
      itemNameSnapshot: item.name,
      loadWeight: data.loadWeight,
      crRefNo: data.crRefNo ?? null,
      status: 'OPEN',
      createdById: actor.actorId ?? 'system',
    },
  });

  await auditService.record({
    ...actor,
    action: 'CREATE',
    resource: 'PurchaseEntryPass',
    resourceId: pass.id,
    changes: data,
  });

  res.status(201).json(pass);
}));

router.post('/:id/cancel', validate('params', IdParam), validate('body', Cancel), asyncHandler(async (req, res) => {
  const actor = actorContextFromRequest(req);
  const pass = await prisma.purchaseEntryPass.findUnique({ where: { id: req.params.id } });
  if (!pass) return res.status(404).json({ message: 'Not found' });
  if (pass.status !== 'OPEN') return res.status(422).json({ message: 'Only OPEN passes can be cancelled' });

  const updated = await prisma.purchaseEntryPass.update({
    where: { id: req.params.id },
    data: { status: 'CANCELLED', cancelledReason: req.body.cancelledReason },
  });
  await auditService.record({ ...actor, action: 'CANCEL', resource: 'PurchaseEntryPass', resourceId: pass.id, changes: { cancelledReason: req.body.cancelledReason } });
  res.json(updated);
}));

export const purchaseEntryPassRouter = router;
