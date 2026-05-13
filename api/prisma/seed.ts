import { PrismaClient } from '@prisma/client';
import { config } from '../src/infra/config.js';
import { ALL_PERMISSIONS, DEFAULT_ROLES } from '../src/contexts/iam/permissions.js';
import { DEFAULT_MENUS, DEFAULT_FEATURES } from '../src/contexts/iam/admin-seeds.js';
import { hashPassword } from '../src/contexts/iam/password.js';

const prisma = new PrismaClient();

async function main() {
  // 1. Permissions
  for (const code of ALL_PERMISSIONS) {
    const [resource, ...rest] = code.split('.');
    const action = rest.pop() ?? 'view';
    const fullResource = [resource, ...rest].join('.');
    await prisma.permission.upsert({
      where: { code },
      update: { resource: fullResource, action },
      create: { code, resource: fullResource, action },
    });
  }

  // 2. Roles + role->permission links
  for (const role of DEFAULT_ROLES) {
    const r = await prisma.role.upsert({
      where: { code: role.code },
      update: {
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
      },
      create: {
        code: role.code,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
      },
    });

    const perms = await prisma.permission.findMany({
      where: { code: { in: role.permissions } },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: r.id } });
    if (perms.length > 0) {
      await prisma.rolePermission.createMany({
        data: perms.map((p) => ({ roleId: r.id, permissionId: p.id })),
        skipDuplicates: true,
      });
    }
  }

  // 2b. Menus (UI navigation catalogue) — pass 1: parents
  for (const m of DEFAULT_MENUS.filter((x) => x.parentCode === null)) {
    await prisma.menu.upsert({
      where: { code: m.code },
      update: { name: m.name, parentId: null, sortOrder: m.sortOrder, isActive: true },
      create: { code: m.code, name: m.name, sortOrder: m.sortOrder, isActive: true },
    });
  }
  // pass 2: children (need parent ids)
  for (const m of DEFAULT_MENUS.filter((x) => x.parentCode !== null)) {
    const parent = await prisma.menu.findUnique({ where: { code: m.parentCode! } });
    await prisma.menu.upsert({
      where: { code: m.code },
      update: { name: m.name, parentId: parent?.id ?? null, sortOrder: m.sortOrder, isActive: true },
      create: { code: m.code, name: m.name, parentId: parent?.id ?? null, sortOrder: m.sortOrder, isActive: true },
    });
  }

  // 2c. Features (UI capability catalogue)
  for (const f of DEFAULT_FEATURES) {
    await prisma.feature.upsert({
      where: { code: f.code },
      update: { name: f.name, moduleName: f.moduleName, isActive: true },
      create: { code: f.code, name: f.name, moduleName: f.moduleName, isActive: true },
    });
  }

  // 2d. Default role-menu / role-feature access for ADMIN + SUPER_ADMIN (full grant)
  const adminRoleSeed = await prisma.role.findUnique({ where: { code: 'ADMIN' } });
  const superAdminRoleSeed = await prisma.role.findUnique({ where: { code: 'SUPER_ADMIN' } });
  const adminLikeRoles = [adminRoleSeed, superAdminRoleSeed].filter(
    (r): r is NonNullable<typeof r> => r !== null,
  );
  for (const adminLike of adminLikeRoles) {
    const allMenus = await prisma.menu.findMany();
    for (const m of allMenus) {
      await prisma.roleMenu.upsert({
        where: { roleId_menuId: { roleId: adminLike.id, menuId: m.id } },
        update: { canView: true, canCreate: true, canEdit: true, canDelete: true },
        create: { roleId: adminLike.id, menuId: m.id, canView: true, canCreate: true, canEdit: true, canDelete: true },
      });
    }
    const allFeatures = await prisma.feature.findMany();
    for (const f of allFeatures) {
      await prisma.roleFeature.upsert({
        where: { roleId_featureId: { roleId: adminLike.id, featureId: f.id } },
        update: { isAllowed: true },
        create: { roleId: adminLike.id, featureId: f.id, isAllowed: true },
      });
    }
  }

  // 2e. INVOICE_BILLING role: grant only the menus needed for GST sales billing.
  //     (Created by Super-Admin; restricted to tax-invoice flows.)
  const invoiceRoleSeed = await prisma.role.findUnique({ where: { code: 'INVOICE_BILLING' } });
  if (invoiceRoleSeed) {
    const INVOICE_MENU_CODES = [
      'DASHBOARD',
      'MASTERS',
      'CUSTOMER_MASTER',
      'ITEM_MASTER',
      'VEHICLE_MASTER',
      'DRIVER_LABOUR_MASTER',
      'OPERATIONS',
      'TOKEN_CREATE',
      'SALES_BILL',
      'REPORTS',
      'SALES_REGISTER',
      'SALES_WITH_GST_FULL_QTY',
      'SALES_GST_COMBINED',
      'SALES_CUSTOMER_WISE',
      'CUSTOMER_LEDGER',
    ];
    const invoiceMenus = await prisma.menu.findMany({
      where: { code: { in: INVOICE_MENU_CODES } },
    });
    for (const m of invoiceMenus) {
      await prisma.roleMenu.upsert({
        where: { roleId_menuId: { roleId: invoiceRoleSeed.id, menuId: m.id } },
        update: { canView: true, canCreate: true, canEdit: true, canDelete: false },
        create: { roleId: invoiceRoleSeed.id, menuId: m.id, canView: true, canCreate: true, canEdit: true, canDelete: false },
      });
    }
  }

  // 3. Default Admin user (also granted SUPER_ADMIN so a bootstrap super-admin exists)
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { code: 'ADMIN' } });
  const superAdminRole = await prisma.role.findUnique({ where: { code: 'SUPER_ADMIN' } });
  const existing = await prisma.user.findUnique({
    where: { username: config.SEED_ADMIN_USERNAME },
    include: { roles: true },
  });

  if (!existing) {
    const passwordHash = await hashPassword(config.SEED_ADMIN_PASSWORD);
    const rolesToCreate = [{ roleId: adminRole.id }];
    if (superAdminRole) rolesToCreate.push({ roleId: superAdminRole.id });
    await prisma.user.create({
      data: {
        username: config.SEED_ADMIN_USERNAME,
        email: config.SEED_ADMIN_EMAIL,
        firstName: 'System',
        lastName: 'Administrator',
        passwordHash,
        status: 'ACTIVE',
        roles: { create: rolesToCreate },
      },
    });
    // eslint-disable-next-line no-console
    console.log(`Seeded admin user "${config.SEED_ADMIN_USERNAME}".`);
  } else {
    // Ensure the existing admin user has SUPER_ADMIN granted (idempotent backfill).
    if (superAdminRole && !existing.roles.some((r) => r.roleId === superAdminRole.id)) {
      await prisma.userRole.create({
        data: { userId: existing.id, roleId: superAdminRole.id },
      });
      // eslint-disable-next-line no-console
      console.log(`Granted SUPER_ADMIN to existing admin user "${config.SEED_ADMIN_USERNAME}".`);
    } else {
      // eslint-disable-next-line no-console
      console.log(`Admin user "${config.SEED_ADMIN_USERNAME}" already exists; skipping.`);
    }
  }

  // 3b. Dedicated Super Admin user (separate credentials from the regular Admin).
  if (superAdminRole) {
    const SUPER_USERNAME = 'superadmin';
    const SUPER_PASSWORD = 'SuperAdmin@12345678';
    const SUPER_EMAIL = 'superadmin@askbluemetal.local';
    const existingSuper = await prisma.user.findUnique({ where: { username: SUPER_USERNAME } });
    if (!existingSuper) {
      const passwordHash = await hashPassword(SUPER_PASSWORD);
      await prisma.user.create({
        data: {
          username: SUPER_USERNAME,
          email: SUPER_EMAIL,
          firstName: 'Super',
          lastName: 'Admin',
          passwordHash,
          status: 'ACTIVE',
          roles: { create: { roleId: superAdminRole.id } },
        },
      });
      // eslint-disable-next-line no-console
      console.log(
        `Seeded Super Admin user "${SUPER_USERNAME}" (password: ${SUPER_PASSWORD}). CHANGE THIS AFTER FIRST LOGIN.`,
      );
    } else {
      // eslint-disable-next-line no-console
      console.log(`Super Admin user "${SUPER_USERNAME}" already exists; skipping.`);
    }
  }

  // 5. Company profile (singleton row used to print invoice headers).
  await prisma.companyProfile.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      name: 'ASK Blue Metal',
      address: '',
      gstin: '',
      panNumber: '',
      msmeNumber: '',
      cin: '',
      phone: '',
      email: '',
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      upiId: '',
    },
  });

  await prisma.systemSetting.upsert({
    where: { key: 'tokens.externalEntryRequired' },
    update: {},
    create: {
      key: 'tokens.externalEntryRequired',
      category: 'operations.token',
      value: false,
      updatedBy: 'seed',
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
