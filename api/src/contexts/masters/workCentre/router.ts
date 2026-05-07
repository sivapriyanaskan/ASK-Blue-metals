import { z } from 'zod';
import { prisma } from '../../../infra/db.js';
import { Permissions } from '../../iam/permissions.js';
import { buildSimpleCrudRouter } from '../_simple-crud.js';

const Create = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(120),
  address: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

export const workCentreRouter = buildSimpleCrudRouter({
  model: prisma.workCentre,
  resource: 'masters.work_centre',
  permissions: { view: Permissions.VEHICLE_VIEW, manage: Permissions.WORK_CENTRE_MANAGE },
  createSchema: Create,
  updateSchema: Create.partial(),
  trackedFields: ['code', 'name', 'address', 'isActive'],
  searchFields: ['code', 'name'],
});
