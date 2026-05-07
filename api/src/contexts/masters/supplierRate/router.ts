import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../infra/db.js';
import { Errors } from '../../../infra/errors.js';
import { asyncHandler, validate } from '../../../infra/validation.js';
import { requireAuth, requirePermissions } from '../../iam/auth.middleware.js';
import { Permissions } from '../../iam/permissions.js';
import { auditService } from '../../audit/audit.service.js';
import { actorContextFromRequest } from '../_common.js';

/**
 * Supplier-wise item rate setting (SRS §3.2.5). Mirror of the customer-rate
 * router, used during purchase billing.
 */

const Create = z.object({
  supplierId: z.string().min(1),
  itemId: z.string().min(1),
  rate: z.number().nonnegative(),
  validFrom: z.coerce.date().optional(),
  validTo: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
});
const Update = z.object({
  rate: z.number().nonnegative().optional(),
  validFrom: z.coerce.date().nullable().optional(),
  validTo: z.coerce.date().nullable().optional(),
  isActive: z.boolean().optional(),
});
const ListQuery = z.object({
  supplierId: z.string().min(1).optional(),
  itemId: z.string().min(1).optional(),
  isActive: z
    .union([z.literal('true'), z.literal('false')])
    .transform((v) => v === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
const IdParam = z.object({ id: z.string().min(1) });

async function assertNoOverlap(opts: {
  supplierId: string;
  itemId: string;
  validFrom: Date | null;
  validTo: Date | null;
  excludeId?: string;
}) {
  const where: Prisma.SupplierItemRateWhereInput = {
    supplierId: opts.supplierId,
    itemId: opts.itemId,
    isActive: true,
    ...(opts.excludeId ? { id: { not: opts.excludeId } } : {}),
  };
  const candidates = await prisma.supplierItemRate.findMany({ where });
  const a1 = opts.validFrom?.getTime() ?? -Infinity;
  const a2 = opts.validTo?.getTime() ?? Infinity;
  for (const c of candidates) {
    const b1 = c.validFrom?.getTime() ?? -Infinity;
    const b2 = c.validTo?.getTime() ?? Infinity;
    if (a1 <= b2 && b1 <= a2) {
      throw Errors.conflict('Overlapping active rate window for this supplier/item');
    }
  }
}

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  requirePermissions(Permissions.SUPPLIER_VIEW),
  validate('query', ListQuery),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as z.infer<typeof ListQuery>;
    const where: Prisma.SupplierItemRateWhereInput = {
      ...(q.supplierId ? { supplierId: q.supplierId } : {}),
      ...(q.itemId ? { itemId: q.itemId } : {}),
      ...(typeof q.isActive === 'boolean' ? { isActive: q.isActive } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.supplierItemRate.findMany({
        where,
        orderBy: [{ supplierId: 'asc' }, { itemId: 'asc' }, { validFrom: 'desc' }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: {
          supplier: { select: { id: true, code: true, name: true } },
          item: { select: { id: true, code: true, name: true } },
        },
      }),
      prisma.supplierItemRate.count({ where }),
    ]);
    res.json({ items, page: q.page, pageSize: q.pageSize, total });
  }),
);

router.post(
  '/',
  requirePermissions(Permissions.SUPPLIER_RATE_MANAGE),
  validate('body', Create),
  asyncHandler(async (req, res) => {
    const ctx = actorContextFromRequest(req);
    const body = req.body as z.infer<typeof Create>;
    await assertNoOverlap({
      supplierId: body.supplierId,
      itemId: body.itemId,
      validFrom: body.validFrom ?? null,
      validTo: body.validTo ?? null,
    });
    const created = await prisma.supplierItemRate.create({
      data: {
        supplierId: body.supplierId,
        itemId: body.itemId,
        rate: body.rate,
        validFrom: body.validFrom ?? null,
        validTo: body.validTo ?? null,
        isActive: body.isActive ?? true,
      },
    });
    await auditService.record({
      ...ctx,
      action: 'CREATE',
      resource: 'masters.supplier_rate',
      resourceId: created.id,
      changes: { ...body },
    });
    res.status(201).json(created);
  }),
);

router.patch(
  '/:id',
  requirePermissions(Permissions.SUPPLIER_RATE_MANAGE),
  validate('params', IdParam),
  validate('body', Update),
  asyncHandler(async (req, res) => {
    const ctx = actorContextFromRequest(req);
    const { id } = req.params as { id: string };
    const body = req.body as z.infer<typeof Update>;
    const before = await prisma.supplierItemRate.findUnique({ where: { id } });
    if (!before) throw Errors.notFound(`Supplier rate ${id} not found`);
    const validFrom = body.validFrom === undefined ? before.validFrom : body.validFrom;
    const validTo = body.validTo === undefined ? before.validTo : body.validTo;
    const isActive = body.isActive ?? before.isActive;
    if (isActive) {
      await assertNoOverlap({
        supplierId: before.supplierId,
        itemId: before.itemId,
        validFrom,
        validTo,
        excludeId: id,
      });
    }
    const updated = await prisma.supplierItemRate.update({
      where: { id },
      data: {
        ...(body.rate !== undefined ? { rate: body.rate } : {}),
        ...(body.validFrom !== undefined ? { validFrom: body.validFrom } : {}),
        ...(body.validTo !== undefined ? { validTo: body.validTo } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    });
    await auditService.record({
      ...ctx,
      action: 'UPDATE',
      resource: 'masters.supplier_rate',
      resourceId: id,
      changes: { ...body },
    });
    res.json(updated);
  }),
);

router.delete(
  '/:id',
  requirePermissions(Permissions.SUPPLIER_RATE_MANAGE),
  validate('params', IdParam),
  asyncHandler(async (req, res) => {
    const ctx = actorContextFromRequest(req);
    const { id } = req.params as { id: string };
    const before = await prisma.supplierItemRate.findUnique({ where: { id } });
    if (!before) throw Errors.notFound(`Supplier rate ${id} not found`);
    await prisma.supplierItemRate.update({ where: { id }, data: { isActive: false } });
    await auditService.record({
      ...ctx,
      action: 'DEACTIVATE',
      resource: 'masters.supplier_rate',
      resourceId: id,
    });
    res.status(204).send();
  }),
);

export const supplierRateRouter = router;
