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
  'state',
  'billType',
  'gstNumber',
  'tcsApplicable',
  'creditLimit',
  'termsOfDelivery',
  'contactPerson',
  'phone',
  'email',
  'eWayBillNo',
  'anprNumber',
  'paymentTerms',
  'paymentDueDays',
  'isActive',
] as const;

const GST_STATE_NAME: Record<string, string> = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '25': 'Daman and Diu',
  '26': 'Dadra and Nagar Haveli and Daman and Diu',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh (New)',
  '38': 'Ladakh',
};

function inferStateFromGstin(gstin?: string | null): string | null {
  const stateCode = (gstin ?? '').trim().slice(0, 2);
  return GST_STATE_NAME[stateCode] ?? null;
}

// Generate the next sequential customer code (CUST0001, CUST0002, ...).
// Uses a SERIALIZABLE-style read of the highest existing code to avoid
// cross-request collisions; the unique index on Customer.code provides
// a final guard if two writers race.
async function nextCustomerCode(tx: Prisma.TransactionClient): Promise<string> {
  const last = await tx.customer.findFirst({
    where: { code: { startsWith: 'CUST' } },
    orderBy: { code: 'desc' },
    select: { code: true },
  });
  let next = 1;
  if (last?.code) {
    const m = /^CUST(\d+)$/.exec(last.code);
    if (m) next = parseInt(m[1], 10) + 1;
  }
  return `CUST${String(next).padStart(4, '0')}`;
}

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
    const createCustomer = async (code: string) =>
      prisma.customer.create({
        data: {
          code,
          name: input.name,
          address: input.address ?? null,
          state: input.state ?? inferStateFromGstin(input.gstNumber),
          billType: input.billType,
          gstNumber: input.gstNumber ?? null,
          tcsApplicable: input.tcsApplicable,
          creditLimit: input.creditLimit,
          termsOfDelivery: input.termsOfDelivery ?? null,
          contactPerson: input.contactPerson ?? null,
          phone: input.phone ?? null,
          email: input.email ?? null,
          eWayBillNo: input.eWayBillNo ?? null,
          anprNumber: input.anprNumber ?? null,
          paymentTerms: input.paymentTerms ?? null,
          paymentDueDays: input.paymentDueDays ?? 0,
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

    let created;
    if (input.code) {
      created = await createCustomer(input.code);
    } else {
      // Retry generated codes to handle rare create races on unique customer code.
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const code = await nextCustomerCode(prisma as unknown as Prisma.TransactionClient);
        try {
          created = await createCustomer(code);
          break;
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError
            && error.code === 'P2002'
            && attempt < 4
          ) {
            continue;
          }
          throw error;
        }
      }
    }

    if (!created) {
      throw Errors.internal('Failed to create customer');
    }

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

    const updated = await prisma.$transaction(async (tx) => {
      const inferredStateFromGst =
        input.gstNumber !== undefined && input.state === undefined
          ? inferStateFromGstin(input.gstNumber)
          : undefined;

      if (input.vehicles !== undefined) {
        await tx.customerVehicle.deleteMany({ where: { customerId: id } });
      }

      return tx.customer.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.address !== undefined ? { address: input.address } : {}),
          ...(input.state !== undefined ? { state: input.state } : {}),
          ...(inferredStateFromGst !== undefined ? { state: inferredStateFromGst } : {}),
          ...(input.billType !== undefined ? { billType: input.billType } : {}),
          ...(input.gstNumber !== undefined ? { gstNumber: input.gstNumber } : {}),
          ...(input.tcsApplicable !== undefined ? { tcsApplicable: input.tcsApplicable } : {}),
          ...(input.creditLimit !== undefined ? { creditLimit: input.creditLimit } : {}),
          ...(input.termsOfDelivery !== undefined ? { termsOfDelivery: input.termsOfDelivery } : {}),
          ...(input.contactPerson !== undefined ? { contactPerson: input.contactPerson } : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.email !== undefined ? { email: input.email } : {}),
          ...(input.eWayBillNo !== undefined ? { eWayBillNo: input.eWayBillNo } : {}),
          ...(input.anprNumber !== undefined ? { anprNumber: input.anprNumber } : {}),
          ...(input.paymentTerms !== undefined ? { paymentTerms: input.paymentTerms } : {}),
          ...(input.paymentDueDays !== undefined ? { paymentDueDays: input.paymentDueDays ?? 0 } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          ...(input.vehicles !== undefined
            ? input.vehicles.length
              ? {
                vehicles: {
                  createMany: {
                    data: input.vehicles.map((v) => ({
                      vehicleNumber: v.vehicleNumber,
                      driverName: v.driverName ?? null,
                      driverPhone: v.driverPhone ?? null,
                    })),
                  },
                },
              }
              : {}
            : {}),
        },
      });
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
