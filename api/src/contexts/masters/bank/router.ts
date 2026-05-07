import { z } from 'zod';
import { prisma } from '../../../infra/db.js';
import { Permissions } from '../../iam/permissions.js';
import { buildSimpleCrudRouter } from '../_simple-crud.js';

const Create = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(120),
  branch: z.string().max(120).optional(),
  accountNumber: z.string().max(40).optional(),
  ifsc: z
    .string()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code')
    .optional(),
  isActive: z.boolean().optional(),
});

export const bankRouter = buildSimpleCrudRouter({
  model: prisma.bank,
  resource: 'masters.bank',
  permissions: { view: Permissions.SALES_BILL_VIEW, manage: Permissions.BANK_MANAGE },
  createSchema: Create,
  updateSchema: Create.partial(),
  trackedFields: ['code', 'name', 'branch', 'accountNumber', 'ifsc', 'isActive'],
  searchFields: ['code', 'name', 'branch'],
});
