import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, validate } from '../../infra/validation.js';
import { Errors } from '../../infra/errors.js';
import { prisma } from '../../infra/db.js';
import { requireAuth, requirePermissions } from './auth.middleware.js';
import { Permissions, SUPER_ADMIN_ONLY_ROLES, actorIsSuperAdmin } from './permissions.js';
import { auditService } from '../audit/audit.service.js';
import { actorContextFromRequest } from '../masters/_common.js';

const router = Router();
router.use(requireAuth);

const IdParam = z.object({ id: z.string().min(1) });

const CreateSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[A-Z][A-Z0-9_]*$/, 'Code must be UPPER_SNAKE_CASE'),
  name: z.string().min(1).max(80),
  description: z.string().max(500).nullable().optional(),
  permissions: z.array(z.string().min(1)).default([]),
});

const UpdateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).nullable().optional(),
  permissions: z.array(z.string().min(1)).optional(),
});

const serialize = (r: {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: { permission: { code: string } }[];
}) => ({
  id: r.id,
  code: r.code,
  name: r.name,
  description: r.description,
  isSystem: r.isSystem,
  permissions: r.permissions.map((rp) => rp.permission.code).sort(),
});

router.get(
  '/',
  requirePermissions(Permissions.ROLE_VIEW),
  asyncHandler(async (req, res) => {
    const isSA = actorIsSuperAdmin(req.user?.roles);
    const roles = await prisma.role.findMany({
      where: isSA ? {} : { code: { notIn: SUPER_ADMIN_ONLY_ROLES } },
      orderBy: { code: 'asc' },
      include: { permissions: { include: { permission: true } } },
    });
    res.json({ items: roles.map(serialize) });
  }),
);

router.get(
  '/_catalogue/permissions',
  requirePermissions(Permissions.ROLE_VIEW),
  asyncHandler(async (_req, res) => {
    const perms = await prisma.permission.findMany({ orderBy: { code: 'asc' } });
    res.json({
      items: perms.map((p) => ({ code: p.code, resource: p.resource, action: p.action })),
    });
  }),
);

router.get(
  '/:id',
  requirePermissions(Permissions.ROLE_VIEW),
  validate('params', IdParam),
  asyncHandler(async (req, res) => {
    const { id } = req.params as { id: string };
    const role = await prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } } },
    });
    if (!role) throw Errors.notFound(`Role ${id}`);
    if (SUPER_ADMIN_ONLY_ROLES.includes(role.code) && !actorIsSuperAdmin(req.user?.roles)) {
      throw Errors.notFound(`Role ${id}`);
    }
    res.json(serialize(role));
  }),
);

router.post(
  '/',
  requirePermissions(Permissions.ROLE_MANAGE),
  validate('body', CreateSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof CreateSchema>;
    const ctx = actorContextFromRequest(req);
    const existing = await prisma.role.findUnique({ where: { code: body.code } });
    if (existing) throw Errors.conflict(`Role with code ${body.code} already exists`);

    const role = await prisma.$transaction(async (tx) => {
      const created = await tx.role.create({
        data: {
          code: body.code,
          name: body.name,
          description: body.description ?? null,
          isSystem: false,
        },
      });
      if (body.permissions.length > 0) {
        const perms = await tx.permission.findMany({
          where: { code: { in: body.permissions } },
        });
        if (perms.length !== new Set(body.permissions).size) {
          throw Errors.unprocessable('One or more permission codes are invalid');
        }
        await tx.rolePermission.createMany({
          data: perms.map((p) => ({ roleId: created.id, permissionId: p.id })),
          skipDuplicates: true,
        });
      }
      return tx.role.findUniqueOrThrow({
        where: { id: created.id },
        include: { permissions: { include: { permission: true } } },
      });
    });

    await auditService.record({
      ...ctx,
      action: 'CREATE',
      resource: 'iam.role',
      resourceId: role.id,
      changes: { code: role.code, name: role.name, permissions: body.permissions },
    });

    res.status(201).json(serialize(role));
  }),
);

router.patch(
  '/:id',
  requirePermissions(Permissions.ROLE_MANAGE),
  validate('params', IdParam),
  validate('body', UpdateSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params as { id: string };
    const body = req.body as z.infer<typeof UpdateSchema>;
    const ctx = actorContextFromRequest(req);
    const before = await prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } } },
    });
    if (!before) throw Errors.notFound(`Role ${id}`);
    if (SUPER_ADMIN_ONLY_ROLES.includes(before.code) && !actorIsSuperAdmin(req.user?.roles)) {
      throw Errors.forbidden('Only a Super Admin can modify this role');
    }

    const role = await prisma.$transaction(async (tx) => {
      await tx.role.update({
        where: { id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
        },
      });
      if (body.permissions) {
        const perms = await tx.permission.findMany({
          where: { code: { in: body.permissions } },
        });
        if (perms.length !== new Set(body.permissions).size) {
          throw Errors.unprocessable('One or more permission codes are invalid');
        }
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        if (perms.length > 0) {
          await tx.rolePermission.createMany({
            data: perms.map((p) => ({ roleId: id, permissionId: p.id })),
            skipDuplicates: true,
          });
        }
      }
      return tx.role.findUniqueOrThrow({
        where: { id },
        include: { permissions: { include: { permission: true } } },
      });
    });

    await auditService.record({
      ...ctx,
      action: 'UPDATE',
      resource: 'iam.role',
      resourceId: role.id,
      changes: {
        from: {
          name: before.name,
          description: before.description,
          permissions: before.permissions.map((rp) => rp.permission.code).sort(),
        },
        to: {
          name: role.name,
          description: role.description,
          permissions: role.permissions.map((rp) => rp.permission.code).sort(),
        },
      },
    });

    res.json(serialize(role));
  }),
);

router.delete(
  '/:id',
  requirePermissions(Permissions.ROLE_MANAGE),
  validate('params', IdParam),
  asyncHandler(async (req, res) => {
    const { id } = req.params as { id: string };
    const ctx = actorContextFromRequest(req);
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) throw Errors.notFound(`Role ${id}`);
    if (SUPER_ADMIN_ONLY_ROLES.includes(role.code) && !actorIsSuperAdmin(req.user?.roles)) {
      throw Errors.forbidden('Only a Super Admin can delete this role');
    }
    if (role.isSystem) throw Errors.conflict('System roles cannot be deleted');

    const inUse = await prisma.userRole.count({ where: { roleId: id } });
    if (inUse > 0) {
      throw Errors.conflict(
        `Cannot delete role: ${inUse} user(s) still assigned. Reassign them first.`,
      );
    }

    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      prisma.roleMenu.deleteMany({ where: { roleId: id } }),
      prisma.roleFeature.deleteMany({ where: { roleId: id } }),
      prisma.role.delete({ where: { id } }),
    ]);

    await auditService.record({
      ...ctx,
      action: 'DELETE',
      resource: 'iam.role',
      resourceId: id,
      changes: { code: role.code, name: role.name },
    });

    res.json({ ok: true });
  }),
);

export const roleRouter = router;
