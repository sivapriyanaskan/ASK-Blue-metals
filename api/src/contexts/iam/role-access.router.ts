import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../infra/db.js';
import { Errors } from '../../infra/errors.js';
import { asyncHandler, validate } from '../../infra/validation.js';
import { requireAuth, requirePermissions } from './auth.middleware.js';
import { Permissions } from './permissions.js';
import { auditService } from '../audit/audit.service.js';
import { actorContextFromRequest } from '../masters/_common.js';

const router = Router();
router.use(requireAuth);

const RoleIdParam = z.object({ roleId: z.string().min(1) });

/* ------------------------------------------------------------------ */
/* Current user's effective menu access (must precede '/:roleId/...')  */
/* ------------------------------------------------------------------ */
router.get(
  '/my/menus',
  asyncHandler(async (req, res) => {
    if (!req.user) throw Errors.unauthorized();
    const roleCodes = req.user.roles ?? [];

    // ADMIN / SUPER_ADMIN bypass: always grant every active menu.
    const isAdmin = roleCodes.some((c) => c === 'ADMIN' || c === 'SUPER_ADMIN');
    if (isAdmin) {
      const allMenus = await prisma.menu.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
      res.json({
        items: allMenus.map((m) => ({
          menuId: m.id,
          code: m.code,
          name: m.name,
          parentId: m.parentId,
          sortOrder: m.sortOrder,
          canView: true,
          canCreate: true,
          canEdit: true,
          canDelete: true,
        })),
      });
      return;
    }

    if (roleCodes.length === 0) {
      res.json({ items: [] });
      return;
    }
    const roles = await prisma.role.findMany({
      where: { code: { in: roleCodes } },
      select: { id: true },
    });
    const roleIds = roles.map((r) => r.id);
    if (roleIds.length === 0) {
      res.json({ items: [] });
      return;
    }
    const [menus, access] = await Promise.all([
      prisma.menu.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
      prisma.roleMenu.findMany({ where: { roleId: { in: roleIds } } }),
    ]);
    // Union across roles: a menu is allowed if ANY role grants the permission.
    const grant = new Map<string, { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }>();
    for (const a of access) {
      const cur = grant.get(a.menuId) ?? { canView: false, canCreate: false, canEdit: false, canDelete: false };
      grant.set(a.menuId, {
        canView: cur.canView || a.canView,
        canCreate: cur.canCreate || a.canCreate,
        canEdit: cur.canEdit || a.canEdit,
        canDelete: cur.canDelete || a.canDelete,
      });
    }
    res.json({
      items: menus.map((m) => {
        const g = grant.get(m.id);
        return {
          menuId: m.id,
          code: m.code,
          name: m.name,
          parentId: m.parentId,
          sortOrder: m.sortOrder,
          canView: g?.canView ?? false,
          canCreate: g?.canCreate ?? false,
          canEdit: g?.canEdit ?? false,
          canDelete: g?.canDelete ?? false,
        };
      }),
    });
  }),
);

/* ------------------------------------------------------------------ */
/* Role -> Menu access                                                */
/* ------------------------------------------------------------------ */

const RoleMenuPayload = z.object({
  entries: z
    .array(
      z.object({
        menuId: z.string().min(1),
        canView: z.boolean().default(false),
        canCreate: z.boolean().default(false),
        canEdit: z.boolean().default(false),
        canDelete: z.boolean().default(false),
      }),
    )
    .max(500),
});

router.get(
  '/:roleId/menus',
  requirePermissions(Permissions.ROLE_ACCESS_MANAGE),
  validate('params', RoleIdParam),
  asyncHandler(async (req, res) => {
    const { roleId } = req.params as { roleId: string };
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw Errors.notFound(`Role ${roleId} not found`);
    const [menus, access] = await Promise.all([
      prisma.menu.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
      prisma.roleMenu.findMany({ where: { roleId } }),
    ]);
    const map = new Map(access.map((a) => [a.menuId, a]));
    res.json({
      role: { id: role.id, code: role.code, name: role.name },
      items: menus.map((m) => {
        const a = map.get(m.id);
        return {
          menuId: m.id,
          code: m.code,
          name: m.name,
          parentId: m.parentId,
          sortOrder: m.sortOrder,
          canView: a?.canView ?? false,
          canCreate: a?.canCreate ?? false,
          canEdit: a?.canEdit ?? false,
          canDelete: a?.canDelete ?? false,
          updatedAt: a?.updatedAt ?? null,
        };
      }),
    });
  }),
);

router.put(
  '/:roleId/menus',
  requirePermissions(Permissions.ROLE_ACCESS_MANAGE),
  validate('params', RoleIdParam),
  validate('body', RoleMenuPayload),
  asyncHandler(async (req, res) => {
    const { roleId } = req.params as { roleId: string };
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw Errors.notFound(`Role ${roleId} not found`);
    const { entries } = req.body as z.infer<typeof RoleMenuPayload>;
    const ctx = actorContextFromRequest(req);

    await prisma.$transaction(async (tx) => {
      // Validate menuIds exist
      const ids = entries.map((e) => e.menuId);
      if (ids.length > 0) {
        const found = await tx.menu.count({ where: { id: { in: ids } } });
        if (found !== new Set(ids).size) throw Errors.unprocessable('One or more menuIds are invalid');
      }
      await tx.roleMenu.deleteMany({ where: { roleId } });
      if (entries.length > 0) {
        await tx.roleMenu.createMany({
          data: entries.map((e) => ({
            roleId,
            menuId: e.menuId,
            canView: e.canView,
            canCreate: e.canCreate,
            canEdit: e.canEdit,
            canDelete: e.canDelete,
          })),
          skipDuplicates: true,
        });
      }
    });

    await auditService.record({
      ...ctx,
      action: 'UPDATE',
      resource: 'admin.role_menu',
      resourceId: roleId,
      changes: { entryCount: entries.length },
    });

    res.json({ ok: true, count: entries.length });
  }),
);

/* ------------------------------------------------------------------ */
/* Role -> Feature access                                             */
/* ------------------------------------------------------------------ */

const RoleFeaturePayload = z.object({
  entries: z
    .array(
      z.object({
        featureId: z.string().min(1),
        isAllowed: z.boolean().default(false),
      }),
    )
    .max(500),
});

router.get(
  '/:roleId/features',
  requirePermissions(Permissions.ROLE_ACCESS_MANAGE),
  validate('params', RoleIdParam),
  asyncHandler(async (req, res) => {
    const { roleId } = req.params as { roleId: string };
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw Errors.notFound(`Role ${roleId} not found`);
    const [features, access] = await Promise.all([
      prisma.feature.findMany({
        where: { isActive: true },
        orderBy: [{ moduleName: 'asc' }, { name: 'asc' }],
      }),
      prisma.roleFeature.findMany({ where: { roleId } }),
    ]);
    const map = new Map(access.map((a) => [a.featureId, a]));
    res.json({
      role: { id: role.id, code: role.code, name: role.name },
      items: features.map((f) => {
        const a = map.get(f.id);
        return {
          featureId: f.id,
          code: f.code,
          name: f.name,
          moduleName: f.moduleName,
          isAllowed: a?.isAllowed ?? false,
          updatedAt: a?.updatedAt ?? null,
        };
      }),
    });
  }),
);

router.put(
  '/:roleId/features',
  requirePermissions(Permissions.ROLE_ACCESS_MANAGE),
  validate('params', RoleIdParam),
  validate('body', RoleFeaturePayload),
  asyncHandler(async (req, res) => {
    const { roleId } = req.params as { roleId: string };
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw Errors.notFound(`Role ${roleId} not found`);
    const { entries } = req.body as z.infer<typeof RoleFeaturePayload>;
    const ctx = actorContextFromRequest(req);

    await prisma.$transaction(async (tx) => {
      const ids = entries.map((e) => e.featureId);
      if (ids.length > 0) {
        const found = await tx.feature.count({ where: { id: { in: ids } } });
        if (found !== new Set(ids).size) throw Errors.unprocessable('One or more featureIds are invalid');
      }
      await tx.roleFeature.deleteMany({ where: { roleId } });
      if (entries.length > 0) {
        await tx.roleFeature.createMany({
          data: entries.map((e) => ({
            roleId,
            featureId: e.featureId,
            isAllowed: e.isAllowed,
          })),
          skipDuplicates: true,
        });
      }
    });

    await auditService.record({
      ...ctx,
      action: 'UPDATE',
      resource: 'admin.role_feature',
      resourceId: roleId,
      changes: { entryCount: entries.length },
    });

    res.json({ ok: true, count: entries.length });
  }),
);

/* ------------------------------------------------------------------ */
/* Current user's effective menu access (no special permission)        */
/* ------------------------------------------------------------------ */
// (route registered near the top of this file, before '/:roleId/...')

export const roleAccessRouter = router;
