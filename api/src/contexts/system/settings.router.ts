import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../infra/db.js';
import { Errors } from '../../infra/errors.js';
import { asyncHandler, validate } from '../../infra/validation.js';
import { requireAuth, requirePermissions } from '../iam/auth.middleware.js';
import { Permissions } from '../iam/permissions.js';
import { auditService } from '../audit/audit.service.js';
import { actorContextFromRequest } from '../masters/_common.js';

const router = Router();
router.use(requireAuth);

/**
 * Key-value system settings grouped by `category`.
 *
 *   GET    /                  list (optional ?category=)
 *   GET    /:key              read one
 *   PUT    /:key              upsert (creates if missing)
 *   PUT    /                  bulk upsert by category
 */

const ListQuery = z.object({ category: z.string().min(1).max(60).optional() });

router.get(
  '/',
  requirePermissions(Permissions.SYSTEM_SETTINGS_MANAGE),
  validate('query', ListQuery),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as z.infer<typeof ListQuery>;
    const items = await prisma.systemSetting.findMany({
      where: q.category ? { category: q.category } : undefined,
      orderBy: { key: 'asc' },
    });
    res.json({ items });
  }),
);

const KeyParam = z.object({ key: z.string().min(1).max(120) });

// Settings that are safe to expose to any authenticated user. These are
// non-sensitive configuration values that the frontend needs to apply
// validation rules consistently (e.g. high-value confirmation prompts).
const PUBLIC_READABLE_SETTING_KEYS = new Set<string>([
  'billing.highValueConfirmationLimit',
  'billing.externalEntryRequired',
  'billing.cancelWeightToleranceKg',
]);

router.get(
  '/:key',
  validate('params', KeyParam),
  asyncHandler(async (req, res) => {
    const { key } = req.params as { key: string };
    if (!PUBLIC_READABLE_SETTING_KEYS.has(key)) {
      // Non-public keys require the manage permission.
      if (!req.user) throw Errors.unauthorized();
      if (!req.user.permissions.has(Permissions.SYSTEM_SETTINGS_MANAGE)) {
        throw Errors.forbidden(`Missing permissions: ${Permissions.SYSTEM_SETTINGS_MANAGE}`);
      }
    }
    const item = await prisma.systemSetting.findUnique({ where: { key } });
    if (!item) throw Errors.notFound(`Setting ${key}`);
    res.json(item);
  }),
);

const UpsertBody = z.object({
  category: z.string().min(1).max(60),
  value: z.unknown(),
});

router.put(
  '/:key',
  requirePermissions(Permissions.SYSTEM_SETTINGS_MANAGE),
  validate('params', KeyParam),
  validate('body', UpsertBody),
  asyncHandler(async (req, res) => {
    const { key } = req.params as { key: string };
    const body = req.body as z.infer<typeof UpsertBody>;
    const ctx = actorContextFromRequest(req);
    const before = await prisma.systemSetting.findUnique({ where: { key } });
    const item = await prisma.systemSetting.upsert({
      where: { key },
      update: { category: body.category, value: body.value as never, updatedBy: ctx.actorName },
      create: { key, category: body.category, value: body.value as never, updatedBy: ctx.actorName },
    });
    await auditService.record({
      ...ctx,
      action: before ? 'UPDATE' : 'CREATE',
      resource: 'system.setting',
      resourceId: key,
      changes: { from: before?.value ?? null, to: body.value },
    });
    res.json(item);
  }),
);

const BulkBody = z.object({
  category: z.string().min(1).max(60),
  values: z.record(z.string().min(1), z.unknown()),
});

router.put(
  '/',
  requirePermissions(Permissions.SYSTEM_SETTINGS_MANAGE),
  validate('body', BulkBody),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof BulkBody>;
    const ctx = actorContextFromRequest(req);
    const updates = Object.entries(body.values);
    await prisma.$transaction(
      updates.map(([k, v]) =>
        prisma.systemSetting.upsert({
          where: { key: k },
          update: { category: body.category, value: v as never, updatedBy: ctx.actorName },
          create: { key: k, category: body.category, value: v as never, updatedBy: ctx.actorName },
        }),
      ),
    );
    await auditService.record({
      ...ctx,
      action: 'UPDATE',
      resource: 'system.setting',
      resourceId: body.category,
      changes: { count: updates.length, values: body.values },
    });
    res.json({ ok: true, count: updates.length });
  }),
);

export const systemSettingsRouter = router;
