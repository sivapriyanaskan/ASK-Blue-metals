import { z } from 'zod';
import { prisma } from '../../../infra/db.js';
import { Permissions } from '../../iam/permissions.js';
import { buildSimpleCrudRouter } from '../_simple-crud.js';

const Create = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(120),
  isAddition: z.boolean().default(true),
  affectsGst: z.boolean().default(false),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

export const billSundryRouter = buildSimpleCrudRouter({
  model: prisma.billSundry,
  resource: 'masters.bill_sundry',
  permissions: { view: Permissions.SALES_BILL_VIEW, manage: Permissions.BILL_SUNDRY_MANAGE },
  createSchema: Create,
  updateSchema: Create.partial(),
  trackedFields: ['code', 'name', 'isAddition', 'affectsGst', 'description', 'isActive'],
  searchFields: ['code', 'name'],
});
