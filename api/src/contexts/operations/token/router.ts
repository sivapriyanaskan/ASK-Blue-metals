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
  // #14 — operator's external paper / CR / manual entry reference.
  // Required at runtime when SystemSetting key 'tokens.externalEntryRequired'
  // is set to true.
  externalEntryNo: z.string().trim().max(60).optional().nullable(),
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
  // Client feedback: capture an exit-weight + image at cancellation so the
  // operator can prove the truck left empty. When provided, the API enforces
  // tolerance against the recorded empty weight (±100kg by default).
  cancelledWeight: z.coerce.number().nonnegative().optional(),
  cancelledImageRef: z.string().max(500).optional().nullable(),
  cancelledTopImageRef: z.string().max(500).optional().nullable(),
});

/**
 * Goley edit (#12) — only fields that operations may correct on an OPEN
 * token. Any non-OPEN token is rejected by the handler. All fields are
 * optional so callers can patch one at a time.
 */
const Update = z.object({
  vehicleNo: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .transform((s) => s.toUpperCase())
    .optional(),
  driverName: z.string().trim().max(120).optional().nullable(),
  driverMobile: z.string().trim().max(20).optional().nullable(),
  itemId: z.string().min(1).optional(),
  emptyWeight: z.coerce.number().nonnegative().max(99999999).optional(),
  anprImageRef: z.string().trim().max(500).optional().nullable(),
  anprNumberPlateText: z.string().trim().max(32).optional().nullable(),
  loadImageRef: z.string().trim().max(500).optional().nullable(),
});

const IdParam = z.object({ id: z.string().min(1) });

const tokenInclude = {
  customer: { select: { id: true, code: true, name: true, billType: true, gstNumber: true, tcsApplicable: true, creditLimit: true, remainingBalance: true, placeOfSupply: true } },
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

    // #14 — if the External Entry No requirement is toggled on, reject
    // creation when the field is missing/blank.
    const externalRequiredSetting = await prisma.systemSetting.findUnique({
      where: { key: 'tokens.externalEntryRequired' },
    });
    const externalRequired = externalRequiredSetting?.value === true;
    const externalEntryNo = body.externalEntryNo?.trim() || null;
    if (externalRequired && !externalEntryNo) {
      throw Errors.badRequest('External Entry No is required (system setting tokens.externalEntryRequired)');
    }

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
          externalEntryNo,
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

router.patch(
  '/:id',
  requirePermissions(Permissions.TOKEN_CREATE),
  validate('params', IdParam),
  validate('body', Update),
  asyncHandler(async (req, res) => {
    const ctx = actorContextFromRequest(req);
    const { id } = req.params as { id: string };
    const body = req.body as z.infer<typeof Update>;
    const before = await prisma.token.findUnique({ where: { id } });
    if (!before) throw Errors.notFound(`Token ${id} not found`);
    if (before.status !== 'OPEN') {
      throw Errors.badRequest(`Token is ${before.status}; only OPEN tokens may be edited`);
    }

    // If item is being changed, ensure new item exists & active and
    // re-check freeze status against (existing or unchanged) customer.
    if (body.itemId && body.itemId !== before.itemId) {
      const [item, frozen] = await Promise.all([
        prisma.item.findUnique({ where: { id: body.itemId } }),
        isFrozen(before.customerId, body.itemId, new Date()),
      ]);
      if (!item || !item.isActive) throw Errors.badRequest('Item not found or inactive');
      if (frozen) throw Errors.badRequest('Customer is frozen for this item');
    }

    const data: Prisma.TokenUpdateInput = { updatedById: ctx.actorId };
    if (body.vehicleNo !== undefined) data.vehicleNo = body.vehicleNo;
    if (body.driverName !== undefined) data.driverName = body.driverName ?? null;
    if (body.driverMobile !== undefined) data.driverMobile = body.driverMobile ?? null;
    if (body.itemId !== undefined) data.item = { connect: { id: body.itemId } };
    if (body.emptyWeight !== undefined)
      data.emptyWeight = new Prisma.Decimal(body.emptyWeight);
    if (body.anprImageRef !== undefined) data.anprImageRef = body.anprImageRef ?? null;
    if (body.anprNumberPlateText !== undefined)
      data.anprNumberPlateText = body.anprNumberPlateText ?? null;
    if (body.loadImageRef !== undefined) data.loadImageRef = body.loadImageRef ?? null;

    const updated = await prisma.token.update({
      where: { id },
      data,
      include: tokenInclude,
    });

    await auditService.record({
      ...ctx,
      action: 'UPDATE',
      resource: 'operations.token',
      resourceId: id,
      changes: body as Record<string, unknown>,
    });
    res.json(updated);
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
    // Weight-match verification. When a captured exit weight is supplied, it
    // must be within tolerance of the original empty weight (truck-out =
    // truck-in). Tolerance is configurable via system setting
    // `tokens.cancelWeightToleranceKg` (Settings screen), default 100 kg.
    const toleranceSetting = await prisma.systemSetting.findUnique({
      where: { key: 'tokens.cancelWeightToleranceKg' },
    });
    const rawTolerance =
      toleranceSetting?.value != null ? Number(toleranceSetting.value) : NaN;
    const WEIGHT_TOLERANCE_KG =
      Number.isFinite(rawTolerance) && rawTolerance >= 0 ? rawTolerance : 100;
    if (typeof body.cancelledWeight === 'number') {
      const empty = Number(before.emptyWeight);
      const diff = Math.abs(body.cancelledWeight - empty);
      if (diff > WEIGHT_TOLERANCE_KG) {
        throw Errors.badRequest(
          `Captured weight ${body.cancelledWeight} differs from token empty weight ${empty} by ${diff.toFixed(2)} (tolerance ±${WEIGHT_TOLERANCE_KG})`,
        );
      }
    }
    const updated = await prisma.token.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledReason: body.cancelledReason,
        cancelledWeight: typeof body.cancelledWeight === 'number' ? body.cancelledWeight : null,
        cancelledImageRef: body.cancelledImageRef ?? null,
        cancelledTopImageRef: body.cancelledTopImageRef ?? null,
        cancelledAt: new Date(),
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
