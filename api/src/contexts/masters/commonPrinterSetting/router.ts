import { z } from 'zod';
import { prisma } from '../../../infra/db.js';
import { buildSimpleCrudRouter } from '../_simple-crud.js';
import { Permissions } from '../../iam/permissions.js';

const createSchema = z.object({
  formName: z.string().min(1).max(120),
  printerId: z.string().min(1).nullable().optional(),
  printEngine: z.string().min(1).max(60),
  printFormat: z.string().min(1).max(60),
  defaultCopies: z.number().int().min(1).max(20).default(1),
  showPreview: z.boolean().default(true),
  allowPdfFallback: z.boolean().default(false),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const commonPrinterSettingsRouter = buildSimpleCrudRouter({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: prisma.commonPrinterSetting as any,
  resource: 'masters.common_printer_setting',
  permissions: {
    view: Permissions.PRINTER_SETTING_MANAGE,
    manage: Permissions.PRINTER_SETTING_MANAGE,
  },
  createSchema,
  updateSchema: createSchema.partial(),
  trackedFields: [
    'formName',
    'printerId',
    'printEngine',
    'printFormat',
    'defaultCopies',
    'showPreview',
    'allowPdfFallback',
    'isDefault',
    'isActive',
  ] as const,
  searchFields: ['formName', 'printEngine', 'printFormat'] as const,
  orderBy: { formName: 'asc' as const },
});
