import { z } from 'zod';
import { prisma } from '../../../infra/db.js';
import { Permissions } from '../../iam/permissions.js';
import { buildSimpleCrudRouter } from '../_simple-crud.js';

const Create = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(120),
  isActive: z.boolean().optional(),
});

export const itemGroupRouter = buildSimpleCrudRouter({
  model: prisma.itemGroup,
  resource: 'masters.item_group',
  permissions: { view: Permissions.ITEM_VIEW, manage: Permissions.ITEM_GROUP_MANAGE },
  createSchema: Create,
  updateSchema: Create.partial(),
  trackedFields: ['code', 'name', 'isActive'],
  searchFields: ['code', 'name'],
});
