import { z } from 'zod';

/**
 * Item master schemas. SRS §3.2.3.
 *
 * Mandatory: code, name, group, sub-group, purchase unit, selling unit,
 *            HSN code, isRawMaterial, isSaleMaterial, sellingPrice, gstPercent,
 *            defaultPrinter (associated for token printing).
 */
export const CreateItemSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(32)
    .regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase alphanumeric'),
  name: z.string().min(1).max(160),
  groupId: z.string().min(1),
  subGroupId: z.string().min(1),
  purchaseUnitId: z.string().min(1),
  sellingUnitId: z.string().min(1),
  hsnCode: z
    .string()
    .regex(/^[0-9]{4,8}$/, 'HSN code must be 4-8 digits')
    .optional(),
  isRawMaterial: z.boolean().default(false),
  isSaleMaterial: z.boolean().default(true),
  sellingPrice: z.number().nonnegative().default(0),
  gstPercent: z.number().min(0).max(50).default(0),
  defaultPrinterId: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});
export type CreateItemInput = z.infer<typeof CreateItemSchema>;

export const UpdateItemSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  groupId: z.string().min(1).optional(),
  subGroupId: z.string().min(1).optional(),
  purchaseUnitId: z.string().min(1).optional(),
  sellingUnitId: z.string().min(1).optional(),
  hsnCode: z.string().regex(/^[0-9]{4,8}$/).nullable().optional(),
  isRawMaterial: z.boolean().optional(),
  isSaleMaterial: z.boolean().optional(),
  sellingPrice: z.number().nonnegative().optional(),
  gstPercent: z.number().min(0).max(50).optional(),
  defaultPrinterId: z.string().min(1).nullable().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateItemInput = z.infer<typeof UpdateItemSchema>;

export const ListItemsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  search: z.string().max(120).optional(),
  groupId: z.string().min(1).optional(),
  subGroupId: z.string().min(1).optional(),
  isRawMaterial: z
    .union([z.literal('true'), z.literal('false')])
    .transform((v) => v === 'true')
    .optional(),
  isSaleMaterial: z
    .union([z.literal('true'), z.literal('false')])
    .transform((v) => v === 'true')
    .optional(),
  isActive: z
    .union([z.literal('true'), z.literal('false')])
    .transform((v) => v === 'true')
    .optional(),
});
export type ListItemsQuery = z.infer<typeof ListItemsQuerySchema>;
