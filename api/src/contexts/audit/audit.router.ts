import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, validate } from '../../infra/validation.js';
import { prisma } from '../../infra/db.js';
import { requireAuth, requirePermissions } from '../iam/auth.middleware.js';
import { Permissions } from '../iam/permissions.js';

const router = Router();

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  resource: z.string().max(120).optional(),
  resourceId: z.string().max(64).optional(),
  actorId: z.string().max(64).optional(),
  actor: z.string().max(120).optional(),
  action: z.string().max(64).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

router.get(
  '/',
  requireAuth,
  requirePermissions(Permissions.AUDIT_VIEW),
  validate('query', QuerySchema),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as z.infer<typeof QuerySchema>;
    const where = {
      ...(q.resource ? { resource: q.resource } : {}),
      ...(q.resourceId ? { resourceId: q.resourceId } : {}),
      ...(q.actorId ? { actorId: q.actorId } : {}),
      ...(q.actor ? { actorName: { contains: q.actor, mode: 'insensitive' as const } } : {}),
      ...(q.action ? { action: q.action } : {}),
      ...(q.from || q.to
        ? {
            createdAt: {
              ...(q.from ? { gte: q.from } : {}),
              ...(q.to ? { lte: q.to } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      items,
      page: q.page,
      pageSize: q.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
    });
  }),
);

export const auditRouter = router;
