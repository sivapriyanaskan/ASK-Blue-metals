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
 * Customer-wise item rate setting (SRS §3.2.4).
 *
 * - Allows multiple rates per (customer, item) over time using validity windows.
 * - Two active rows for the same (customer, item) with overlapping validity
 *   windows are rejected at the service level.
 */

const Create = z.object({
  customerId: z.string().min(1),
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
  customerId: z.string().min(1).optional(),
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
  customerId: string;
  itemId: string;
  validFrom: Date | null;
  validTo: Date | null;
  excludeId?: string;
}) {
  const where: Prisma.CustomerItemRateWhereInput = {
    customerId: opts.customerId,
    itemId: opts.itemId,
    isActive: true,
    ...(opts.excludeId ? { id: { not: opts.excludeId } } : {}),
  };
  // Two ranges [a1, a2] and [b1, b2] overlap iff a1 <= b2 AND b1 <= a2.
  // NULL endpoints behave as -infinity / +infinity.
  const candidates = await prisma.customerItemRate.findMany({ where });
  const a1 = opts.validFrom?.getTime() ?? -Infinity;
  const a2 = opts.validTo?.getTime() ?? Infinity;
  for (const c of candidates) {
    const b1 = c.validFrom?.getTime() ?? -Infinity;
    const b2 = c.validTo?.getTime() ?? Infinity;
    if (a1 <= b2 && b1 <= a2) {
      throw Errors.conflict('Overlapping active rate window for this customer/item');
    }
  }
}

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  requirePermissions(Permissions.CUSTOMER_VIEW),
  validate('query', ListQuery),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as z.infer<typeof ListQuery>;
    const where: Prisma.CustomerItemRateWhereInput = {
      ...(q.customerId ? { customerId: q.customerId } : {}),
      ...(q.itemId ? { itemId: q.itemId } : {}),
      ...(typeof q.isActive === 'boolean' ? { isActive: q.isActive } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.customerItemRate.findMany({
        where,
        orderBy: [{ customerId: 'asc' }, { itemId: 'asc' }, { validFrom: 'desc' }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: {
          customer: { select: { id: true, code: true, name: true } },
          item: { select: { id: true, code: true, name: true } },
        },
      }),
      prisma.customerItemRate.count({ where }),
    ]);
    res.json({ items, page: q.page, pageSize: q.pageSize, total });
  }),
);

router.post(
  '/',
  requirePermissions(Permissions.CUSTOMER_RATE_MANAGE),
  validate('body', Create),
  asyncHandler(async (req, res) => {
    const ctx = actorContextFromRequest(req);
    const body = req.body as z.infer<typeof Create>;
    await assertNoOverlap({
      customerId: body.customerId,
      itemId: body.itemId,
      validFrom: body.validFrom ?? null,
      validTo: body.validTo ?? null,
    });
    const created = await prisma.customerItemRate.create({
      data: {
        customerId: body.customerId,
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
      resource: 'masters.customer_rate',
      resourceId: created.id,
      changes: { ...body },
    });
    res.status(201).json(created);
  }),
);

router.patch(
  '/:id',
  requirePermissions(Permissions.CUSTOMER_RATE_MANAGE),
  validate('params', IdParam),
  validate('body', Update),
  asyncHandler(async (req, res) => {
    const ctx = actorContextFromRequest(req);
    const { id } = req.params as { id: string };
    const body = req.body as z.infer<typeof Update>;
    const before = await prisma.customerItemRate.findUnique({ where: { id } });
    if (!before) throw Errors.notFound(`Customer rate ${id} not found`);

    const validFrom = body.validFrom === undefined ? before.validFrom : body.validFrom;
    const validTo = body.validTo === undefined ? before.validTo : body.validTo;
    const isActive = body.isActive ?? before.isActive;
    if (isActive) {
      await assertNoOverlap({
        customerId: before.customerId,
        itemId: before.itemId,
        validFrom,
        validTo,
        excludeId: id,
      });
    }

    const updated = await prisma.customerItemRate.update({
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
      resource: 'masters.customer_rate',
      resourceId: id,
      changes: { ...body },
    });
    res.json(updated);
  }),
);

router.delete(
  '/:id',
  requirePermissions(Permissions.CUSTOMER_RATE_MANAGE),
  validate('params', IdParam),
  asyncHandler(async (req, res) => {
    const ctx = actorContextFromRequest(req);
    const { id } = req.params as { id: string };
    const before = await prisma.customerItemRate.findUnique({ where: { id } });
    if (!before) throw Errors.notFound(`Customer rate ${id} not found`);
    await prisma.customerItemRate.update({ where: { id }, data: { isActive: false } });
    await auditService.record({
      ...ctx,
      action: 'DEACTIVATE',
      resource: 'masters.customer_rate',
      resourceId: id,
    });
    res.status(204).send();
  }),
);

export const customerRateRouter = router;
