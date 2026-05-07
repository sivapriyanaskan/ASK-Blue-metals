import { Prisma } from '@prisma/client';
import { prisma } from '../../../infra/db.js';
import { Errors } from '../../../infra/errors.js';
import { auditService } from '../../audit/audit.service.js';
import type { ActorContext } from '../_common.js';
import { diff } from '../_common.js';
import type {
  CreateCustomerInput,
  ListCustomersQuery,
  UpdateCustomerInput,
  VehicleUpsertInput,
} from './schema.js';

const RESOURCE = 'masters.customer';
const TRACKED_FIELDS = [
  'code',
  'name',
  'address',
  'billType',
  'gstNumber',
  'tcsApplicable',
  'creditLimit',
  'termsOfDelivery',
  'contactPerson',
  'phone',
  'email',
  'isActive',
] as const;

export const customerService = {
  async list(q: ListCustomersQuery) {
    const where: Prisma.CustomerWhereInput = {
      ...(typeof q.isActive === 'boolean' ? { isActive: q.isActive } : {}),
      ...(q.billType ? { billType: q.billType } : {}),
      ...(q.search
        ? {
            OR: [
              { code: { contains: q.search, mode: 'insensitive' } },
              { name: { contains: q.search, mode: 'insensitive' } },
              { gstNumber: { contains: q.search, mode: 'insensitive' } },
              { phone: { contains: q.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: { _count: { select: { vehicles: true } } },
      }),
      prisma.customer.count({ where }),
    ]);

    return { items, page: q.page, pageSize: q.pageSize, total };
  },

  async getById(id: string) {
    const row = await prisma.customer.findUnique({
      where: { id },
      include: { vehicles: { orderBy: { vehicleNumber: 'asc' } } },
    });
    if (!row) throw Errors.notFound(`Customer ${id} not found`);
    return row;
  },

  async create(input: CreateCustomerInput, ctx: ActorContext) {
    const created = await prisma.$transaction(async (tx) => {
      const c = await tx.customer.create({
        data: {
          code: input.code,
          name: input.name,
          address: input.address ?? null,
          billType: input.billType,
          gstNumber: input.gstNumber ?? null,
          tcsApplicable: input.tcsApplicable,
          creditLimit: input.creditLimit,
          termsOfDelivery: input.termsOfDelivery ?? null,
          contactPerson: input.contactPerson ?? null,
          phone: input.phone ?? null,
          email: input.email ?? null,
          isActive: input.isActive ?? true,
          vehicles: input.vehicles?.length
            ? {
                createMany: {
                  data: input.vehicles.map((v) => ({
                    vehicleNumber: v.vehicleNumber,
                    driverName: v.driverName ?? null,
                    driverPhone: v.driverPhone ?? null,
                  })),
                },
              }
            : undefined,
        },
        include: { vehicles: { orderBy: { vehicleNumber: 'asc' } } },
      });
      return c;
    });

    await auditService.record({
      ...ctx,
      action: 'CREATE',
      resource: RESOURCE,
      resourceId: created.id,
      changes: { ...input },
    });

    return created;
  },

  async update(id: string, input: UpdateCustomerInput, ctx: ActorContext) {
    const before = await prisma.customer.findUnique({ where: { id } });
    if (!before) throw Errors.notFound(`Customer ${id} not found`);

    // Cross-field rule: existing billType TAX_INVOICE + clearing GSTIN.
    const nextBillType = input.billType ?? before.billType;
    const nextGst = input.gstNumber === undefined ? before.gstNumber : input.gstNumber;
    if (nextBillType === 'TAX_INVOICE' && !nextGst) {
      throw Errors.badRequest('GST Number is required when Bill Type is TAX_INVOICE');
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.billType !== undefined ? { billType: input.billType } : {}),
        ...(input.gstNumber !== undefined ? { gstNumber: input.gstNumber } : {}),
        ...(input.tcsApplicable !== undefined ? { tcsApplicable: input.tcsApplicable } : {}),
        ...(input.creditLimit !== undefined ? { creditLimit: input.creditLimit } : {}),
        ...(input.termsOfDelivery !== undefined ? { termsOfDelivery: input.termsOfDelivery } : {}),
        ...(input.contactPerson !== undefined ? { contactPerson: input.contactPerson } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });

    const changes = diff(
      before as unknown as Record<string, unknown>,
      updated as unknown as Record<string, unknown>,
      TRACKED_FIELDS,
    );

    if (Object.keys(changes).length > 0) {
      await auditService.record({
        ...ctx,
        action: 'UPDATE',
        resource: RESOURCE,
        resourceId: id,
        changes,
      });
    }

    return updated;
  },

  async deactivate(id: string, ctx: ActorContext) {
    const before = await prisma.customer.findUnique({ where: { id } });
    if (!before) throw Errors.notFound(`Customer ${id} not found`);
    if (!before.isActive) return;

    await prisma.customer.update({ where: { id }, data: { isActive: false } });
    await auditService.record({
      ...ctx,
      action: 'DEACTIVATE',
      resource: RESOURCE,
      resourceId: id,
    });
  },

  // ----- Vehicles -----

  async listVehicles(customerId: string) {
    await this.getById(customerId); // 404 if missing
    return prisma.customerVehicle.findMany({
      where: { customerId },
      orderBy: { vehicleNumber: 'asc' },
    });
  },

  async addVehicle(customerId: string, input: VehicleUpsertInput, ctx: ActorContext) {
    await this.getById(customerId);
    const created = await prisma.customerVehicle.create({
      data: {
        customerId,
        vehicleNumber: input.vehicleNumber,
        driverName: input.driverName ?? null,
        driverPhone: input.driverPhone ?? null,
        isActive: input.isActive ?? true,
      },
    });
    await auditService.record({
      ...ctx,
      action: 'CREATE',
      resource: 'masters.customer.vehicle',
      resourceId: created.id,
      changes: { customerId, ...input },
    });
    return created;
  },

  async removeVehicle(customerId: string, vehicleId: string, ctx: ActorContext) {
    const v = await prisma.customerVehicle.findUnique({ where: { id: vehicleId } });
    if (!v || v.customerId !== customerId) throw Errors.notFound(`Vehicle ${vehicleId} not found`);
    await prisma.customerVehicle.delete({ where: { id: vehicleId } });
    await auditService.record({
      ...ctx,
      action: 'DELETE',
      resource: 'masters.customer.vehicle',
      resourceId: vehicleId,
      changes: { vehicleNumber: v.vehicleNumber },
    });
  },
};
