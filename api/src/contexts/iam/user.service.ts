import { z } from 'zod';
import { prisma } from '../../infra/db.js';
import { Errors } from '../../infra/errors.js';
import { checkPasswordPolicy, hashPassword } from './password.js';
import { SUPER_ADMIN_ONLY_ROLES, actorIsSuperAdmin } from './permissions.js';
import { auditService } from '../audit/audit.service.js';

export const CreateUserSchema = z.object({
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  username: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Only letters, digits, dot, underscore, hyphen allowed'),
  email: z.string().email().max(254),
  password: z.string().min(12).max(128),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  roleCodes: z.array(z.string().min(1)).min(1, 'At least one role is required'),
});
export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z.object({
  firstName: z.string().min(1).max(60).optional(),
  lastName: z.string().min(1).max(60).optional(),
  email: z.string().email().max(254).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'LOCKED']).optional(),
  roleCodes: z.array(z.string().min(1)).optional(),
});
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

export const ListUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
  search: z.string().max(120).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'LOCKED']).optional(),
});
export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>;

interface ActorContext {
  actorId: string;
  actorName: string;
  actorRoles?: string[];
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

function assertSuperAdminAssignment(roleCodes: string[], actorRoles: string[] | undefined) {
  // SUPER_ADMIN is never assignable through the API. The only Super Admin
  // accounts are those provisioned via the seed.
  if (roleCodes.includes('SUPER_ADMIN')) {
    throw Errors.forbidden('SUPER_ADMIN cannot be assigned through the API');
  }
  const elevated = roleCodes.filter((c) => SUPER_ADMIN_ONLY_ROLES.includes(c));
  if (elevated.length === 0) return;
  if (!actorIsSuperAdmin(actorRoles)) {
    throw Errors.forbidden(
      `Only a Super Admin can assign the following role(s): ${elevated.join(', ')}`,
    );
  }
}

// Returns a Prisma `where` fragment for the user list.
// SUPER_ADMIN accounts are NEVER listed (seed-only, hidden from everyone).
// Non-super-admin actors additionally cannot see INVOICE_BILLING users.
function elevatedUserScope(actorRoles: string[] | undefined) {
  const hiddenForAll = ['SUPER_ADMIN'];
  const hidden = actorIsSuperAdmin(actorRoles)
    ? hiddenForAll
    : Array.from(new Set([...hiddenForAll, ...SUPER_ADMIN_ONLY_ROLES]));
  return {
    roles: { none: { role: { code: { in: hidden } } } },
  } as const;
}

function assertCanTouchTarget(
  targetRoles: { role: { code: string } }[] | undefined,
  actorRoles: string[] | undefined,
) {
  const codes = (targetRoles ?? []).map((r) => r.role.code);
  const hasElevated = codes.some((c) => SUPER_ADMIN_ONLY_ROLES.includes(c));
  if (hasElevated && !actorIsSuperAdmin(actorRoles)) {
    throw Errors.forbidden('Only a Super Admin can manage this user');
  }
}

export const userService = {
  async list(q: ListUsersQuery, actorRoles?: string[]) {
    const where = {
      ...elevatedUserScope(actorRoles),
      ...(q.status ? { status: q.status } : {}),
      ...(q.search
        ? {
            OR: [
              { username: { contains: q.search, mode: 'insensitive' as const } },
              { email: { contains: q.search, mode: 'insensitive' as const } },
              { firstName: { contains: q.search, mode: 'insensitive' as const } },
              { lastName: { contains: q.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        orderBy: { createdAt: 'desc' },
        include: { roles: { include: { role: true } } },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      items: items.map(toPublic),
      page: q.page,
      pageSize: q.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
    };
  },

  async getById(id: string, actorRoles?: string[]) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });
    if (!user) throw Errors.notFound('User');
    assertCanTouchTarget(user.roles, actorRoles);
    return toPublic(user);
  },

  async create(input: CreateUserInput, ctx: ActorContext) {
    const policy = checkPasswordPolicy(input.password);
    if (!policy.valid) throw Errors.unprocessable('Password does not meet policy', policy.reasons);

    assertSuperAdminAssignment(input.roleCodes, ctx.actorRoles);

    const roles = await prisma.role.findMany({ where: { code: { in: input.roleCodes } } });
    if (roles.length !== input.roleCodes.length) {
      const found = new Set(roles.map((r) => r.code));
      const missing = input.roleCodes.filter((c) => !found.has(c));
      throw Errors.unprocessable('Unknown roles', missing);
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        username: input.username,
        email: input.email,
        passwordHash,
        status: input.status,
        roles: { create: roles.map((r) => ({ roleId: r.id })) },
      },
      include: { roles: { include: { role: true } } },
    });

    await auditService.record({
      actorId: ctx.actorId,
      actorName: ctx.actorName,
      action: 'CREATE',
      resource: 'iam.user',
      resourceId: user.id,
      changes: {
        username: input.username,
        email: input.email,
        status: input.status,
        roles: input.roleCodes,
      },
      ipAddress: ctx.ipAddress ?? null,
      userAgent: ctx.userAgent ?? null,
      requestId: ctx.requestId ?? null,
    });

    return toPublic(user);
  },

  async update(id: string, input: UpdateUserInput, ctx: ActorContext) {
    const existing = await prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });
    if (!existing) throw Errors.notFound('User');
    assertCanTouchTarget(existing.roles, ctx.actorRoles);

    let roleIds: string[] | undefined;
    if (input.roleCodes) {
      assertSuperAdminAssignment(input.roleCodes, ctx.actorRoles);
      const roles = await prisma.role.findMany({ where: { code: { in: input.roleCodes } } });
      if (roles.length !== input.roleCodes.length) {
        throw Errors.unprocessable('Unknown roles');
      }
      roleIds = roles.map((r) => r.id);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id },
        data: {
          firstName: input.firstName ?? undefined,
          lastName: input.lastName ?? undefined,
          email: input.email ?? undefined,
          status: input.status ?? undefined,
        },
      });
      if (roleIds) {
        await tx.userRole.deleteMany({ where: { userId: id } });
        await tx.userRole.createMany({ data: roleIds.map((rid) => ({ userId: id, roleId: rid })) });
      }
      return tx.user.findUniqueOrThrow({
        where: { id: u.id },
        include: { roles: { include: { role: true } } },
      });
    });

    await auditService.record({
      actorId: ctx.actorId,
      actorName: ctx.actorName,
      action: 'UPDATE',
      resource: 'iam.user',
      resourceId: id,
      changes: diffUser(existing, updated),
      ipAddress: ctx.ipAddress ?? null,
      userAgent: ctx.userAgent ?? null,
      requestId: ctx.requestId ?? null,
    });

    return toPublic(updated);
  },

  async deactivate(id: string, ctx: ActorContext) {
    const existing = await prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });
    if (!existing) throw Errors.notFound('User');
    assertCanTouchTarget(existing.roles, ctx.actorRoles);
    if (existing.status === 'INACTIVE') return toPublic(existing as never);

    const updated = await prisma.user.update({
      where: { id },
      data: { status: 'INACTIVE' },
      include: { roles: { include: { role: true } } },
    });

    await prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await auditService.record({
      actorId: ctx.actorId,
      actorName: ctx.actorName,
      action: 'DELETE',
      resource: 'iam.user',
      resourceId: id,
      changes: { status: { from: existing.status, to: 'INACTIVE' } },
      ipAddress: ctx.ipAddress ?? null,
      userAgent: ctx.userAgent ?? null,
      requestId: ctx.requestId ?? null,
    });

    return toPublic(updated);
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPublic(user: any) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    status: user.status,
    roles: (user.roles ?? []).map((ur: { role: { code: string } }) => ur.role.code),
    lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt).toISOString() : null,
    createdAt: new Date(user.createdAt).toISOString(),
    updatedAt: new Date(user.updatedAt).toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function diffUser(before: any, after: any): Record<string, { from: unknown; to: unknown }> {
  const fields = ['firstName', 'lastName', 'email', 'status'] as const;
  const out: Record<string, { from: unknown; to: unknown }> = {};
  for (const f of fields) {
    if (before[f] !== after[f]) out[f] = { from: before[f], to: after[f] };
  }
  const beforeRoles = (before.roles ?? []).map((ur: { role: { code: string } }) => ur.role.code).sort();
  const afterRoles = (after.roles ?? []).map((ur: { role: { code: string } }) => ur.role.code).sort();
  if (JSON.stringify(beforeRoles) !== JSON.stringify(afterRoles)) {
    out.roles = { from: beforeRoles, to: afterRoles };
  }
  return out;
}
