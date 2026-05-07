import { z } from 'zod';

/**
 * Customer master schemas. SRS §3.2.1.
 *
 * - Customer Code, Name, Address required.
 * - Bill Type: TAX_INVOICE | NON_GST.
 * - GST Number conditionally required when Bill Type = TAX_INVOICE.
 * - TCS is a manual toggle (no automatic application).
 * - Credit Limit, Terms of Delivery (printed on invoice) optional but stored.
 * - Vehicles: list of registration numbers; uppercased and de-duplicated.
 */

const VEHICLE_REGEX = /^[A-Z0-9 -]{4,16}$/;
// Indian GSTIN: 15 chars, see https://gst.gov.in. We validate format only.
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

export const CreateCustomerSchema = z
  .object({
    code: z
      .string()
      .min(1)
      .max(32)
      .regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase alphanumeric with - or _'),
    name: z.string().min(1).max(160),
    address: z.string().max(500).optional(),
    billType: z.enum(['TAX_INVOICE', 'NON_GST']),
    gstNumber: z.string().regex(GSTIN_REGEX, 'Invalid GSTIN').optional(),
    tcsApplicable: z.boolean().default(false),
    creditLimit: z.number().nonnegative().default(0),
    termsOfDelivery: z.string().max(500).optional(),
    contactPerson: z.string().max(120).optional(),
    phone: z
      .string()
      .regex(/^[0-9+\-\s()]{6,20}$/, 'Invalid phone number')
      .optional(),
    email: z.string().email().max(254).optional(),
    isActive: z.boolean().optional(),
    vehicles: z.array(VehicleInput).max(50).optional(),
  })
  .superRefine((data, ctx) => {
    // SRS §3.2.1: GSTIN is mandatory when billType = TAX_INVOICE.
    if (data.billType === 'TAX_INVOICE' && !data.gstNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['gstNumber'],
        message: 'GST Number is required when Bill Type is TAX_INVOICE',
      });
    }
    // De-duplicate vehicles within the payload.
    if (data.vehicles) {
      const seen = new Set<string>();
      data.vehicles.forEach((v, i) => {
        if (seen.has(v.vehicleNumber)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['vehicles', i, 'vehicleNumber'],
            message: 'Duplicate vehicle number in payload',
          });
        }
        seen.add(v.vehicleNumber);
      });
    }
  });
export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;

export const UpdateCustomerSchema = z
  .object({
    name: z.string().min(1).max(160).optional(),
    address: z.string().max(500).optional(),
    billType: z.enum(['TAX_INVOICE', 'NON_GST']).optional(),
    gstNumber: z.string().regex(GSTIN_REGEX, 'Invalid GSTIN').nullable().optional(),
    tcsApplicable: z.boolean().optional(),
    creditLimit: z.number().nonnegative().optional(),
    termsOfDelivery: z.string().max(500).nullable().optional(),
    contactPerson: z.string().max(120).nullable().optional(),
    phone: z
      .string()
      .regex(/^[0-9+\-\s()]{6,20}$/, 'Invalid phone number')
      .nullable()
      .optional(),
    email: z.string().email().max(254).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    // If both fields are present in the patch, enforce the same rule.
    if (data.billType === 'TAX_INVOICE' && data.gstNumber === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['gstNumber'],
        message: 'GST Number is required when Bill Type is TAX_INVOICE',
      });
    }
  });
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>;

export const ListCustomersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  search: z.string().max(120).optional(),
  billType: z.enum(['TAX_INVOICE', 'NON_GST']).optional(),
  isActive: z
    .union([z.literal('true'), z.literal('false')])
    .transform((v) => v === 'true')
    .optional(),
});
export type ListCustomersQuery = z.infer<typeof ListCustomersQuerySchema>;

export const VehicleUpsertSchema = VehicleInput.extend({
  isActive: z.boolean().optional(),
});
export type VehicleUpsertInput = z.infer<typeof VehicleUpsertSchema>;
