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

/**
 * Weight Slip — Client feedback: 3rd type of billing.
 * Captures a single weighbridge reading + optional vehicle ref. The slip is
 * printed for the driver at the gate. There is no item, customer, rate, or
 * GST attached.
 */

const Create = z.object({
  weight: z.coerce.number().nonnegative().max(99999999),
  vehicleNo: z.string().trim().max(32).optional().nullable(),
  remarks: z.string().trim().max(500).optional().nullable(),
  capturedAt: z.coerce.date().optional(),
});

const ListQuery = z.object({
  search: z.string().trim().min(1).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

const IdParam = z.object({ id: z.string().min(1) });

async function nextSlipNo(): Promise<string> {
  const fy = new Date().getFullYear() % 100;
  const prefix = `WS-${fy}-`;
  const last = await prisma.weightSlip.findFirst({
    where: { slipNo: { startsWith: prefix } },
    orderBy: { slipNo: 'desc' },
    select: { slipNo: true },
  });
  let next = 1;
  if (last?.slipNo) {
    const m = new RegExp(`^${prefix}(\\d+)$`).exec(last.slipNo);
    if (m) next = parseInt(m[1], 10) + 1;
  }
  return `${prefix}${String(next).padStart(5, '0')}`;
}

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  requirePermissions(Permissions.WEIGHT_SLIP_VIEW),
  validate('query', ListQuery),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as z.infer<typeof ListQuery>;
    const where: Prisma.WeightSlipWhereInput = {
      ...(q.search
        ? {
            OR: [
              { slipNo: { contains: q.search, mode: 'insensitive' } },
              { vehicleNo: { contains: q.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(q.dateFrom || q.dateTo
        ? {
            capturedAt: {
              ...(q.dateFrom ? { gte: q.dateFrom } : {}),
              ...(q.dateTo ? { lte: q.dateTo } : {}),
            },
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.weightSlip.findMany({
        where,
        orderBy: { capturedAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      prisma.weightSlip.count({ where }),
    ]);
    res.json({ items, page: q.page, pageSize: q.pageSize, total });
  }),
);

router.get(
  '/:id',
  requirePermissions(Permissions.WEIGHT_SLIP_VIEW),
  validate('params', IdParam),
  asyncHandler(async (req, res) => {
    const row = await prisma.weightSlip.findUnique({ where: { id: req.params.id } });
    if (!row) throw Errors.notFound('Weight slip not found');
    res.json(row);
  }),
);

router.post(
  '/',
  requirePermissions(Permissions.WEIGHT_SLIP_CREATE),
  validate('body', Create),
  asyncHandler(async (req, res) => {
    const ctx = actorContextFromRequest(req);
    const body = req.body as z.infer<typeof Create>;
    const slipNo = await nextSlipNo();
    const created = await prisma.weightSlip.create({
      data: {
        slipNo,
        weight: body.weight,
        vehicleNo: body.vehicleNo?.toUpperCase() ?? null,
        remarks: body.remarks ?? null,
        capturedAt: body.capturedAt ?? new Date(),
        createdById: ctx.actorId,
      },
    });
    await auditService.record({
      ...ctx,
      action: 'CREATE',
      resource: 'operations.weight_slip',
      resourceId: created.id,
      changes: { weight: body.weight, vehicleNo: body.vehicleNo },
    });
    res.status(201).json(created);
  }),
);

export const weightSlipRouter = router;
