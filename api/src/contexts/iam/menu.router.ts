import { z } from 'zod';
import { Router } from 'express';
import { prisma } from '../../infra/db.js';
import { buildSimpleCrudRouter } from '../masters/_simple-crud.js';
import { Permissions } from './permissions.js';
import { requireAuth, requirePermissions } from './auth.middleware.js';
import { asyncHandler, validate } from '../../infra/validation.js';

const createSchema = z.object({
  code: z.string().min(1).max(60),
  name: z.string().min(1).max(120),
  parentId: z.string().min(1).nullable().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

const baseRouter = buildSimpleCrudRouter({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: prisma.menu as any,
  resource: 'admin.menu',
  permissions: { view: Permissions.MENU_MANAGE, manage: Permissions.MENU_MANAGE },
  createSchema,
  updateSchema: createSchema.partial(),
  trackedFields: ['code', 'name', 'parentId', 'sortOrder', 'isActive'] as const,
  searchFields: ['code', 'name'] as const,
  orderBy: { sortOrder: 'asc' as const },
});

// Augment with a tree endpoint used by the Role-Menu Access screen.
const router = Router();

router.use(requireAuth);
router.get(
  '/tree',
  requirePermissions(Permissions.MENU_MANAGE),
  asyncHandler(async (_req, res) => {
    const menus = await prisma.menu.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ items: menus });
  }),
);

router.use('/', baseRouter);

export const menuRouter = router;
