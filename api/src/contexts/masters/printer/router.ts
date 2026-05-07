import { z } from 'zod';
import { prisma } from '../../../infra/db.js';
import { Permissions } from '../../iam/permissions.js';
import { buildSimpleCrudRouter } from '../_simple-crud.js';

const Create = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(120),
  type: z.enum(['THERMAL', 'A4', 'A5']),
  connection: z.string().min(1).max(255),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

export const printerRouter = buildSimpleCrudRouter({
  model: prisma.printer,
  resource: 'masters.printer',
  permissions: { view: Permissions.ITEM_VIEW, manage: Permissions.PRINTER_MANAGE },
  createSchema: Create,
  updateSchema: Create.partial(),
  trackedFields: ['code', 'name', 'type', 'connection', 'description', 'isActive'],
  searchFields: ['code', 'name'],
});
