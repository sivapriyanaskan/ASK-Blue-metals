import { z } from 'zod';
import { prisma } from '../../../infra/db.js';
import { Permissions } from '../../iam/permissions.js';
import { buildSimpleCrudRouter } from '../_simple-crud.js';

const Create = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(120),
  type: z.enum(['ASSET', 'LIABILITY', 'INCOME', 'EXPENSE', 'EQUITY']),
  parentId: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export const accountRouter = buildSimpleCrudRouter({
  model: prisma.account,
  resource: 'masters.account',
  permissions: { view: Permissions.SALES_BILL_VIEW, manage: Permissions.ACCOUNT_MANAGE },
  createSchema: Create,
  updateSchema: Create.partial(),
  trackedFields: ['code', 'name', 'type', 'parentId', 'isActive'],
  searchFields: ['code', 'name'],
});
