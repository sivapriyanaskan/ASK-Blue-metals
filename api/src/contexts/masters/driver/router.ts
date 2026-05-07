import { z } from 'zod';
import { prisma } from '../../../infra/db.js';
import { Permissions } from '../../iam/permissions.js';
import { buildSimpleCrudRouter } from '../_simple-crud.js';

const Create = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(120),
  isDriver: z.boolean().default(true),
  phone: z
    .string()
    .regex(/^[0-9+\-\s()]{6,20}$/, 'Invalid phone number')
    .optional(),
  designation: z.string().max(80).optional(),
  isActive: z.boolean().optional(),
});

export const driverRouter = buildSimpleCrudRouter({
  model: prisma.driver,
  resource: 'masters.driver',
  permissions: { view: Permissions.DRIVER_VIEW, manage: Permissions.DRIVER_MANAGE },
  createSchema: Create,
  updateSchema: Create.partial(),
  trackedFields: ['code', 'name', 'isDriver', 'phone', 'designation', 'isActive'],
  searchFields: ['code', 'name', 'phone'],
});
