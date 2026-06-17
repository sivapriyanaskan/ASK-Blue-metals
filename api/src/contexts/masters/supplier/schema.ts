import { z } from 'zod';

const VEHICLE_REGEX = /^[A-Z0-9 -]{4,16}$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const VehicleInput = z.object({
  vehicleNumber: z
    .string()
    .min(4)
    .max(16)
    .transform((v) => v.toUpperCase().trim())
    .pipe(z.string().regex(VEHICLE_REGEX, 'Invalid vehicle number')),
  driverName: z.string().max(120).optional(),
  driverPhone: z
    .string()
    .regex(/^[0-9+\-\s()]{6,20}$/, 'Invalid phone number')
    .optional(),
});
export type VehicleInput = z.infer<typeof VehicleInput>;

export const CreateSupplierSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(32)
    .regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase alphanumeric with - or _'),
  name: z.string().min(1).max(160),
  address: z.string().max(500).optional(),
  supplierType: z.enum(['TON_BASED', 'REPAIR_MAINTENANCE']),
  controlAccountId: z.string().min(1).optional(),
  gstNumber: z.string().regex(GSTIN_REGEX, 'Invalid GSTIN').optional(),
  contactPerson: z.string().max(120).optional(),
  phone: z
    .string()
    .regex(/^[0-9+\-\s()]{6,20}$/, 'Invalid phone number')
    .optional(),
  email: z.string().email().max(254).optional(),
  isActive: z.boolean().optional(),
  vehicles: z.array(VehicleInput).max(50).optional(),
});
export type CreateSupplierInput = z.infer<typeof CreateSupplierSchema>;

export const UpdateSupplierSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  address: z.string().max(500).nullable().optional(),
  supplierType: z.enum(['TON_BASED', 'REPAIR_MAINTENANCE']).optional(),
  controlAccountId: z.string().min(1).nullable().optional(),
  gstNumber: z.string().regex(GSTIN_REGEX, 'Invalid GSTIN').nullable().optional(),
  contactPerson: z.string().max(120).nullable().optional(),
  phone: z
    .string()
    .regex(/^[0-9+\-\s()]{6,20}$/, 'Invalid phone number')
    .nullable()
    .optional(),
  email: z.string().email().max(254).nullable().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateSupplierInput = z.infer<typeof UpdateSupplierSchema>;

export const ListSuppliersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  search: z.string().max(120).optional(),
  supplierType: z.enum(['TON_BASED', 'REPAIR_MAINTENANCE']).optional(),
  isActive: z
    .union([z.literal('true'), z.literal('false')])
    .transform((v) => v === 'true')
    .optional(),
});
export type ListSuppliersQuery = z.infer<typeof ListSuppliersQuerySchema>;

export const VehicleUpsertSchema = VehicleInput.extend({
  isActive: z.boolean().optional(),
});
export type VehicleUpsertInput = z.infer<typeof VehicleUpsertSchema>;
