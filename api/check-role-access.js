import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

(async () => {
  const accountsRole = await prisma.role.findUnique({ where: { code: 'ACCOUNTS' } });
  if (!accountsRole) {
    console.log('ACCOUNTS role not found');
    await prisma.$disconnect();
    return;
  }
  console.log('ACCOUNTS role ID:', accountsRole.id);
  const roleMenus = await prisma.roleMenu.findMany({
    where: { roleId: accountsRole.id, canView: true },
    include: { menu: { select: { code: true, name: true } } },
    orderBy: { menu: { code: 'asc' } }
  });
  console.log('\nAccessible menus for ACCOUNTS role (canView=true):');
  roleMenus.forEach(rm => {
    console.log('  -', rm.menu.code, ':', rm.menu.name);
  });
  console.log('\nTotal accessible menus:', roleMenus.length);
  await prisma.$disconnect();
})();
