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
 * Customer freeze (SRS §3.2.6).
 *
 * itemId NULL means "freeze all items for this customer". The token-creation
 * endpoint (Phase 4) will consult `isFrozen(customerId, itemId, on)` before
 * persisting a token.
 */

const Create = z.object({
  customerId: z.string().min(1),
  itemId: z.string().min(1).nullable().optional(),
  validFrom: z.coerce.date(),
  validTo: z.coerce.date(),
  reason: z.string().max(500).optional(),
}).refine((d) => d.validFrom <= d.validTo, {
  message: 'validFrom must be on or before validTo',
  path: ['validTo'],
});

const ListQuery = z.object({
  customerId: z.string().min(1).optional(),
  itemId: z.string().min(1).optional(),
  on: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

const IdParam = z.object({ id: z.string().min(1) });

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  requirePermissions(Permissions.CUSTOMER_VIEW),
  validate('query', ListQuery),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as z.infer<typeof ListQuery>;
    const where: Prisma.CustomerFreezeWhereInput = {
      ...(q.customerId ? { customerId: q.customerId } : {}),
      ...(q.itemId ? { itemId: q.itemId } : {}),
      ...(q.on
        ? { validFrom: { lte: q.on }, validTo: { gte: q.on } }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.customerFreeze.findMany({
        where,
        orderBy: { validFrom: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: {
          customer: { select: { id: true, code: true, name: true } },
          item: { select: { id: true, code: true, name: true } },
        },
      }),
      prisma.customerFreeze.count({ where }),
    ]);
    res.json({ items, page: q.page, pageSize: q.pageSize, total });
  }),
);

router.post(
  '/',
  requirePermissions(Permissions.CUSTOMER_FREEZE_MANAGE),
  validate('body', Create),
  asyncHandler(async (req, res) => {
    const ctx = actorContextFromRequest(req);
    const body = req.body as z.infer<typeof Create>;
    const created = await prisma.customerFreeze.create({
      data: {
        customerId: body.customerId,
        itemId: body.itemId ?? null,
        validFrom: body.validFrom,
        validTo: body.validTo,
        reason: body.reason ?? null,
        createdById: ctx.actorId,
      },
    });
    await auditService.record({
      ...ctx,
      action: 'CREATE',
      resource: 'masters.customer_freeze',
      resourceId: created.id,
      changes: { ...body },
    });
    res.status(201).json(created);
  }),
);

router.delete(
  '/:id',
  requirePermissions(Permissions.CUSTOMER_FREEZE_MANAGE),
  validate('params', IdParam),
  asyncHandler(async (req, res) => {
    const ctx = actorContextFromRequest(req);
    const { id } = req.params as { id: string };
    const before = await prisma.customerFreeze.findUnique({ where: { id } });
    if (!before) throw Errors.notFound(`Freeze ${id} not found`);
    await prisma.customerFreeze.delete({ where: { id } });
    await auditService.record({
      ...ctx,
      action: 'DELETE',
      resource: 'masters.customer_freeze',
      resourceId: id,
      changes: { customerId: before.customerId, itemId: before.itemId },
    });
    res.status(204).send();
  }),
);

export const customerFreezeRouter = router;

/**
 * In-process helper used by Phase 4 (Token creation) to check whether a
 * (customer, item) pair is frozen on a given date. Itemless freezes match
 * any item.
 */
export async function isFrozen(customerId: string, itemId: string, on: Date): Promise<boolean> {
  const count = await prisma.customerFreeze.count({
    where: {
      customerId,
      validFrom: { lte: on },
      validTo: { gte: on },
      OR: [{ itemId: null }, { itemId }],
    },
  });
  return count > 0;
}
