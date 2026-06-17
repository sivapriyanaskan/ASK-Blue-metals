import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../infra/db.js';
import { Errors } from '../../../infra/errors.js';
import { asyncHandler, validate } from '../../../infra/validation.js';
import { requireAuth, requirePermissions } from '../../iam/auth.middleware.js';
import { Permissions } from '../../iam/permissions.js';
import { auditService } from '../../audit/audit.service.js';
import { actorContextFromRequest } from '../../masters/_common.js';
import { isFrozen } from '../../masters/customerFreeze/router.js';
import {
  nextValue,
  dailyTokenScope,
  entryScope,
  formatEntryNo,
  formatTokenNo,
} from '../_counters.js';

/**
 * Token (Customer gate entry) — SRS §3.3.1.
 *
 * Captures the empty (tare) weight, vehicle, item, optional driver info and
 * an ANPR snapshot when available. A token is OPEN until converted to a
 * SalesBill, after which it becomes BILLED. CANCELLED tokens cannot be
 * re-used and do not consume a bill number.
 */

const Create = z.object({
  customerId: z.string().min(1),
  itemId: z.string().min(1),
  vehicleNo: z.string().trim().min(1).max(32).transform((s) => s.toUpperCase()),
  emptyWeight: z.coerce.number().nonnegative().max(99999999),
  driverName: z.string().trim().max(120).optional().nullable(),
  driverMobile: z.string().trim().max(20).optional().nullable(),
  anprImageRef: z.string().trim().max(500).optional().nullable(),
  anprNumberPlateText: z.string().trim().max(32).optional().nullable(),
  loadImageRef: z.string().trim().max(500).optional().nullable(),
  weightCapturedAt: z.coerce.date().optional().nullable(),
});

const ListQuery = z.object({
  customerId: z.string().min(1).optional(),
  itemId: z.string().min(1).optional(),
  status: z.enum(['OPEN', 'BILLED', 'CANCELLED']).optional(),
  search: z.string().trim().min(1).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

const Cancel = z.object({
  cancelledReason: z.string().trim().min(3).max(500),
});

const IdParam = z.object({ id: z.string().min(1) });

const tokenInclude = {
  customer: { select: { id: true, code: true, name: true, billType: true, gstNumber: true, tcsApplicable: true, creditLimit: true } },
  item: { select: { id: true, code: true, name: true, sellingPrice: true, gstPercent: true, hsnCode: true } },
  bill: { select: { id: true, billNo: true, billDate: true, status: true } },
} as const;

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  requirePermissions(Permissions.TOKEN_VIEW),
  validate('query', ListQuery),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as z.infer<typeof ListQuery>;
    const where: Prisma.TokenWhereInput = {
      ...(q.customerId ? { customerId: q.customerId } : {}),
      ...(q.itemId ? { itemId: q.itemId } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.dateFrom || q.dateTo
        ? {
            tokenDateTime: {
              ...(q.dateFrom ? { gte: q.dateFrom } : {}),
              ...(q.dateTo ? { lte: q.dateTo } : {}),
            },
          }
        : {}),
      ...(q.search
        ? {
            OR: [
              { tokenNo: { contains: q.search, mode: 'insensitive' } },
              { entryNo: { contains: q.search, mode: 'insensitive' } },
              { vehicleNo: { contains: q.search, mode: 'insensitive' } },
              { driverName: { contains: q.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.token.findMany({
        where,
        orderBy: { tokenDateTime: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: tokenInclude,
      }),
      prisma.token.count({ where }),
    ]);
    res.json({ items, page: q.page, pageSize: q.pageSize, total });
  }),
);

router.get(
  '/:id',
  requirePermissions(Permissions.TOKEN_VIEW),
  validate('params', IdParam),
  asyncHandler(async (req, res) => {
    const { id } = req.params as { id: string };
    const token = await prisma.token.findUnique({ where: { id }, include: tokenInclude });
    if (!token) throw Errors.notFound(`Token ${id} not found`);
    res.json(token);
  }),
);

router.post(
  '/',
  requirePermissions(Permissions.TOKEN_CREATE),
  validate('body', Create),
  asyncHandler(async (req, res) => {
    const ctx = actorContextFromRequest(req);
    const body = req.body as z.infer<typeof Create>;

    // Validate references and freeze status in parallel
    const [customer, item, frozen] = await Promise.all([
      prisma.customer.findUnique({ where: { id: body.customerId } }),
      prisma.item.findUnique({ where: { id: body.itemId } }),
      isFrozen(body.customerId, body.itemId, new Date()),
    ]);
    if (!customer || !customer.isActive) throw Errors.badRequest('Customer not found or inactive');
    if (!item || !item.isActive) throw Errors.badRequest('Item not found or inactive');
    if (frozen) throw Errors.badRequest('Customer is frozen for this item');

    const created = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const tokenSeq = await nextValue(tx, dailyTokenScope(now));
      const entrySeq = await nextValue(tx, entryScope(now, body.itemId));
      return tx.token.create({
        data: {
          tokenNo: formatTokenNo(tokenSeq),
          entryNo: formatEntryNo(entrySeq, now),
          tokenDateTime: now,
          customerId: body.customerId,
          itemId: body.itemId,
          vehicleNo: body.vehicleNo,
          emptyWeight: new Prisma.Decimal(body.emptyWeight),
          driverName: body.driverName ?? null,
          driverMobile: body.driverMobile ?? null,
          anprImageRef: body.anprImageRef ?? null,
          anprNumberPlateText: body.anprNumberPlateText ?? null,
          loadImageRef: body.loadImageRef ?? null,
          weightCapturedAt: body.weightCapturedAt ?? now,
          createdById: ctx.actorId,
        },
        include: tokenInclude,
      });
    });

    await auditService.record({
      ...ctx,
      action: 'CREATE',
      resource: 'operations.token',
      resourceId: created.id,
      changes: {
        tokenNo: created.tokenNo,
        entryNo: created.entryNo,
        customerId: created.customerId,
        itemId: created.itemId,
        vehicleNo: created.vehicleNo,
        emptyWeight: created.emptyWeight.toString(),
      },
    });
    res.status(201).json(created);
  }),
);

router.post(
  '/:id/cancel',
  requirePermissions(Permissions.TOKEN_CANCEL),
  validate('params', IdParam),
  validate('body', Cancel),
  asyncHandler(async (req, res) => {
    const ctx = actorContextFromRequest(req);
    const { id } = req.params as { id: string };
    const body = req.body as z.infer<typeof Cancel>;
    const before = await prisma.token.findUnique({ where: { id } });
    if (!before) throw Errors.notFound(`Token ${id} not found`);
    if (before.status !== 'OPEN') {
      throw Errors.badRequest(`Token is ${before.status} and cannot be cancelled`);
    }
    const updated = await prisma.token.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledReason: body.cancelledReason,
        updatedById: ctx.actorId,
      },
      include: tokenInclude,
    });
    await auditService.record({
      ...ctx,
      action: 'CANCEL',
      resource: 'operations.token',
      resourceId: id,
      changes: { cancelledReason: body.cancelledReason },
    });
    res.json(updated);
  }),
);

export const tokenRouter = router;
