import { z } from 'zod';
import { prisma } from '../../infra/db.js';
import { buildSimpleCrudRouter } from '../masters/_simple-crud.js';
import { Permissions } from './permissions.js';

const createSchema = z.object({
  code: z.string().min(1).max(60),
  name: z.string().min(1).max(120),
  moduleName: z.string().min(1).max(60),
  isActive: z.boolean().default(true),
});

export const featureRouter = buildSimpleCrudRouter({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: prisma.feature as any,
  resource: 'admin.feature',
  permissions: { view: Permissions.FEATURE_MANAGE, manage: Permissions.FEATURE_MANAGE },
  createSchema,
  updateSchema: createSchema.partial(),
  trackedFields: ['code', 'name', 'moduleName', 'isActive'] as const,
  searchFields: ['code', 'name', 'moduleName'] as const,
  orderBy: { moduleName: 'asc' as const },
});
