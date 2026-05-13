/**
 * Idempotent admin bootstrap.
 *
 * Reads the following env vars and creates / upserts the matching users:
 *   ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD
 *   SUPERADMIN_USERNAME, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD
 *
 * Also ensures a `SUPER_ADMIN` role exists with every permission, every menu,
 * and every feature granted (mirrors the ADMIN role).
 *
 * Safe to re-run.
 */
import { prisma } from '../src/infra/db.js';
import { hashPassword } from '../src/contexts/iam/password.js';
import { ALL_PERMISSIONS } from '../src/contexts/iam/permissions.js';

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim().length === 0) {
    throw new Error(`Missing required env: ${name}`);
  }
  return v.trim();
}

async function ensureRoleFullAccess(code: string, name: string) {
  const role = await prisma.role.upsert({
    where: { code },
    update: { name, isSystem: true },
    create: { code, name, description: `${name} (auto-bootstrapped)`, isSystem: true },
  });

  // Permissions: reset to full ALL_PERMISSIONS
  const permRows = await prisma.permission.findMany({
    where: { code: { in: ALL_PERMISSIONS as unknown as string[] } },
  });
  await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
  if (permRows.length > 0) {
    await prisma.rolePermission.createMany({
      data: permRows.map((p) => ({ roleId: role.id, permissionId: p.id })),
      skipDuplicates: true,
    });
  }

  // Menus
  const menus = await prisma.menu.findMany();
  for (const m of menus) {
    await prisma.roleMenu.upsert({
      where: { roleId_menuId: { roleId: role.id, menuId: m.id } },
      update: { canView: true, canCreate: true, canEdit: true, canDelete: true },
      create: { roleId: role.id, menuId: m.id, canView: true, canCreate: true, canEdit: true, canDelete: true },
    });
  }
  // Features
  const features = await prisma.feature.findMany();
  for (const f of features) {
    await prisma.roleFeature.upsert({
      where: { roleId_featureId: { roleId: role.id, featureId: f.id } },
      update: { isAllowed: true },
      create: { roleId: role.id, featureId: f.id, isAllowed: true },
    });
  }
  return role;
}

async function upsertUser(opts: {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleCode: string;
}) {
  const role = await prisma.role.findUniqueOrThrow({ where: { code: opts.roleCode } });
  const passwordHash = await hashPassword(opts.password);
  const existing = await prisma.user.findUnique({ where: { username: opts.username } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        email: opts.email,
        firstName: opts.firstName,
        lastName: opts.lastName,
        passwordHash,
        status: 'ACTIVE',
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
    await prisma.userRole.deleteMany({ where: { userId: existing.id } });
    await prisma.userRole.create({ data: { userId: existing.id, roleId: role.id } });
    console.log(`Updated user "${opts.username}" (${opts.roleCode}).`);
  } else {
    await prisma.user.create({
      data: {
        username: opts.username,
        email: opts.email,
        firstName: opts.firstName,
        lastName: opts.lastName,
        passwordHash,
        status: 'ACTIVE',
        roles: { create: { roleId: role.id } },
      },
    });
    console.log(`Created user "${opts.username}" (${opts.roleCode}).`);
  }
}

async function main() {
  const adminUsername = required('ADMIN_USERNAME');
  const adminEmail = required('ADMIN_EMAIL');
  const adminPassword = required('ADMIN_PASSWORD');
  const superUsername = required('SUPERADMIN_USERNAME');
  const superEmail = required('SUPERADMIN_EMAIL');
  const superPassword = required('SUPERADMIN_PASSWORD');

  // SUPER_ADMIN role + full grants
  await ensureRoleFullAccess('SUPER_ADMIN', 'Super Admin');
  // Also reapply ADMIN full menu/feature access in case new menus were added
  // after initial seed.
  const adminRole = await prisma.role.findUnique({ where: { code: 'ADMIN' } });
  if (adminRole) {
    await ensureRoleFullAccess('ADMIN', adminRole.name);
  }

  await upsertUser({
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
    firstName: 'System',
    lastName: 'Administrator',
    roleCode: 'ADMIN',
  });
  await upsertUser({
    username: superUsername,
    email: superEmail,
    password: superPassword,
    firstName: 'Super',
    lastName: 'Administrator',
    roleCode: 'SUPER_ADMIN',
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
