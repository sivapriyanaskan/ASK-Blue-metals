import { Router } from 'express';
import { z, ZodObject, type ZodRawShape, type ZodTypeAny } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../infra/db.js';
import { Errors } from '../../infra/errors.js';
import { asyncHandler, validate } from '../../infra/validation.js';
import { requireAuth, requirePermissions } from '../iam/auth.middleware.js';
import { auditService } from '../audit/audit.service.js';
import { actorContextFromRequest, diff } from './_common.js';

/**
 * Factory that builds a uniform CRUD router for a "simple" master:
 * a single Prisma model with scalar attributes and no nested relations.
 *
 * Provides:
 *   GET    /            list with optional ?search and ?isActive filter
 *   GET    /:id         get one
 *   POST   /            create
 *   PATCH  /:id         partial update
 *   DELETE /:id         soft delete (sets isActive=false)
 *
 * Uniform error mapping (P2002 → 409, P2025 → 404) is delivered by the global
 * error middleware, so each factory instance stays free of try/catch noise.
 */
export interface SimpleCrudConfig<TCreate extends ZodRawShape, TUpdate extends ZodRawShape> {
  /** Prisma delegate, e.g. `prisma.unit`. Typed loosely because Prisma's
   *  generated delegate types don't expose a public union. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any;
  /** Logical resource name for audit + permissions, e.g. "masters.unit". */
  resource: string;
  /** Permission codes required for each action. */
  permissions: {
    view: string;
    manage: string; // create/edit/delete share one permission for simple masters
  };
  /** Zod create schema. */
  createSchema: ZodObject<TCreate>;
  /** Zod update schema (typically `.partial()` of create). */
  updateSchema: ZodObject<TUpdate>;
  /** Fields to compare for the audit diff. */
  trackedFields: readonly string[];
  /** Optional fields to use for the `?search` filter (case-insensitive contains). */
  searchFields?: readonly string[];
  /** Optional default order (defaults to createdAt desc). */
  orderBy?: Prisma.Sql | Record<string, 'asc' | 'desc'>;
}

const ListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  search: z.string().max(120).optional(),
  isActive: z
    .union([z.literal('true'), z.literal('false')])
    .transform((v) => v === 'true')
    .optional(),
});

const IdParam = z.object({ id: z.string().min(1) });

export function buildSimpleCrudRouter<TCreate extends ZodRawShape, TUpdate extends ZodRawShape>(
  cfg: SimpleCrudConfig<TCreate, TUpdate>,
): Router {
  const router = Router();
  const order = cfg.orderBy ?? { createdAt: 'desc' as const };

  router.use(requireAuth);

  // GET /
  router.get(
    '/',
    requirePermissions(cfg.permissions.view),
    validate('query', ListQuery),
    asyncHandler(async (req, res) => {
      const q = req.query as unknown as z.infer<typeof ListQuery>;
      const where: Record<string, unknown> = {};
      if (typeof q.isActive === 'boolean') where.isActive = q.isActive;
      if (q.search && cfg.searchFields?.length) {
        where.OR = cfg.searchFields.map((f) => ({
          [f]: { contains: q.search, mode: 'insensitive' as const },
        }));
      }

      const [items, total] = await Promise.all([
        cfg.model.findMany({
          where,
          orderBy: order,
          skip: (q.page - 1) * q.pageSize,
          take: q.pageSize,
        }),
        cfg.model.count({ where }),
      ]);

      res.json({ items, page: q.page, pageSize: q.pageSize, total });
    }),
  );

  // GET /:id
  router.get(
    '/:id',
    requirePermissions(cfg.permissions.view),
    validate('params', IdParam),
    asyncHandler(async (req, res) => {
      const { id } = req.params as { id: string };
      const row = await cfg.model.findUnique({ where: { id } });
      if (!row) throw Errors.notFound(`${cfg.resource} ${id} not found`);
      res.json(row);
    }),
  );

  // POST /
  router.post(
    '/',
    requirePermissions(cfg.permissions.manage),
    validate('body', cfg.createSchema as unknown as ZodTypeAny),
    asyncHandler(async (req, res) => {
      const ctx = actorContextFromRequest(req);
      const created = await cfg.model.create({ data: req.body });
      await auditService.record({
        ...ctx,
        action: 'CREATE',
        resource: cfg.resource,
        resourceId: created.id,
        changes: req.body as Record<string, unknown>,
      });
      res.status(201).json(created);
    }),
  );

  // PATCH /:id
  router.patch(
    '/:id',
    requirePermissions(cfg.permissions.manage),
    validate('params', IdParam),
    validate('body', cfg.updateSchema as unknown as ZodTypeAny),
    asyncHandler(async (req, res) => {
      const { id } = req.params as { id: string };
      const ctx = actorContextFromRequest(req);
      const before = await cfg.model.findUnique({ where: { id } });
      if (!before) throw Errors.notFound(`${cfg.resource} ${id} not found`);
      const updated = await cfg.model.update({ where: { id }, data: req.body });
      const changes = diff(
        before as Record<string, unknown>,
        updated as Record<string, unknown>,
        cfg.trackedFields,
      );
      if (Object.keys(changes).length > 0) {
        await auditService.record({
          ...ctx,
          action: 'UPDATE',
          resource: cfg.resource,
          resourceId: id,
          changes,
        });
      }
      res.json(updated);
    }),
  );

  // DELETE /:id  → soft delete
  router.delete(
    '/:id',
    requirePermissions(cfg.permissions.manage),
    validate('params', IdParam),
    asyncHandler(async (req, res) => {
      const { id } = req.params as { id: string };
      const ctx = actorContextFromRequest(req);
      const before = await cfg.model.findUnique({ where: { id } });
      if (!before) throw Errors.notFound(`${cfg.resource} ${id} not found`);
      if (before.isActive === false) {
        return res.status(204).send();
      }
      await cfg.model.update({ where: { id }, data: { isActive: false } });
      await auditService.record({
        ...ctx,
        action: 'DEACTIVATE',
        resource: cfg.resource,
        resourceId: id,
      });
      res.status(204).send();
    }),
  );

  return router;
}
