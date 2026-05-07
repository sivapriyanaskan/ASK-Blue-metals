import { z } from 'zod';
import { prisma } from '../../../infra/db.js';
import { Permissions } from '../../iam/permissions.js';
import { buildSimpleCrudRouter } from '../_simple-crud.js';

const codeField = z.string().min(1).max(32).regex(/^[A-Z0-9_-]+$/, 'Use uppercase code');

const CreateUnit = z.object({
  code: codeField,
  name: z.string().min(1).max(80),
  isActive: z.boolean().optional(),
});

export const unitRouter = buildSimpleCrudRouter({
  model: prisma.unit,
  resource: 'masters.unit',
  permissions: { view: Permissions.ITEM_VIEW, manage: Permissions.UNIT_MANAGE },
  createSchema: CreateUnit,
  updateSchema: CreateUnit.partial(),
  trackedFields: ['code', 'name', 'isActive'],
  searchFields: ['code', 'name'],
});
