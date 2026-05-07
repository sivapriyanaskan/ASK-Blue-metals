import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../infra/db.js';
import { asyncHandler, validate } from '../../infra/validation.js';
import { requireAuth, requirePermissions } from '../iam/auth.middleware.js';
import { Permissions } from '../iam/permissions.js';

const router = Router();
router.use(requireAuth);

/**
 * Device event logs (weighbridge / camera / barrier / printer telemetry).
 *
 *   GET  /         list with filters (deviceType, status, search, from, to)
 *   POST /         append a single event (device-gateway / internal use)
 */

const ListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  deviceType: z.string().min(1).max(60).optional(),
  status: z.string().min(1).max(40).optional(),
  search: z.string().min(1).max(120).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

router.get(
  '/',
  requirePermissions(Permissions.DEVICE_LOG_VIEW),
  validate('query', ListQuery),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as z.infer<typeof ListQuery>;
    const where: Record<string, unknown> = {};
    if (q.deviceType) where.deviceType = q.deviceType;
    if (q.status) where.status = q.status;
    if (q.search) {
      where.OR = [
        { deviceName: { contains: q.search, mode: 'insensitive' } },
        { message: { contains: q.search, mode: 'insensitive' } },
      ];
    }
    if (q.from || q.to) {
      where.createdAt = {
        ...(q.from ? { gte: new Date(q.from) } : {}),
        ...(q.to ? { lte: new Date(q.to) } : {}),
      };
    }
    const [items, total] = await Promise.all([
      prisma.deviceLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      prisma.deviceLog.count({ where }),
    ]);
    res.json({ items, page: q.page, pageSize: q.pageSize, total });
  }),
);

const CreateBody = z.object({
  deviceType: z.string().min(1).max(60),
  deviceName: z.string().min(1).max(120),
  eventType: z.string().min(1).max(60),
  status: z.string().min(1).max(40),
  message: z.string().min(1).max(500),
  metadata: z.record(z.unknown()).optional(),
});

router.post(
  '/',
  requirePermissions(Permissions.DEVICE_LOG_WRITE),
  validate('body', CreateBody),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof CreateBody>;
    const created = await prisma.deviceLog.create({
      data: {
        deviceType: body.deviceType,
        deviceName: body.deviceName,
        eventType: body.eventType,
        status: body.status,
        message: body.message,
        metadata: (body.metadata ?? null) as never,
      },
    });
    res.status(201).json(created);
  }),
);

export const deviceLogsRouter = router;
