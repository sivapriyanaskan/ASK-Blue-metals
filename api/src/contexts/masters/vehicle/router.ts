import { z } from 'zod';
import { prisma } from '../../../infra/db.js';
import { Permissions } from '../../iam/permissions.js';
import { buildSimpleCrudRouter } from '../_simple-crud.js';

const VEHICLE_REGEX = /^[A-Z0-9 -]{4,16}$/;

const Create = z.object({
  registrationNumber: z
    .string()
    .min(4)
    .max(16)
    .transform((v) => v.toUpperCase().trim())
    .pipe(z.string().regex(VEHICLE_REGEX, 'Invalid registration number')),
  name: z.string().min(1).max(120),
  workCentreId: z.string().min(1).optional(),
  tankCapacityLitres: z.number().nonnegative().optional(),
  emptyWeightKg: z.number().nonnegative().optional(),
  meterOpening: z.number().nonnegative().optional(),
  meterMax: z.number().nonnegative().optional(),
  hourOpening: z.number().nonnegative().optional(),
  hourMax: z.number().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

export const vehicleRouter = buildSimpleCrudRouter({
  model: prisma.vehicle,
  resource: 'masters.vehicle',
  permissions: { view: Permissions.VEHICLE_VIEW, manage: Permissions.VEHICLE_MANAGE },
  createSchema: Create,
  updateSchema: Create.partial(),
  trackedFields: [
    'registrationNumber',
    'name',
    'workCentreId',
    'tankCapacityLitres',
    'emptyWeightKg',
    'meterOpening',
    'meterMax',
    'hourOpening',
    'hourMax',
    'isActive',
  ],
  searchFields: ['registrationNumber', 'name'],
});
