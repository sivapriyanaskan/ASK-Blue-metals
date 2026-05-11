import { Prisma } from '@prisma/client';
import { prisma } from '../../../infra/db.js';
import { Errors } from '../../../infra/errors.js';
import { auditService } from '../../audit/audit.service.js';
import type { ActorContext } from '../_common.js';
import { diff } from '../_common.js';
import type {
  CreateSupplierInput,
  ListSuppliersQuery,
  UpdateSupplierInput,
  VehicleUpsertInput,
} from './schema.js';

const RESOURCE = 'masters.supplier';
const SUPPORTS_SUPPLIER_STATE = Prisma.dmmf.datamodel.models
  .find((m) => m.name === 'Supplier')
  ?.fields.some((f) => f.name === 'state') ?? false;

const TRACKED_FIELDS = [
  'code',
  'name',
  'address',
  'state',
  'supplierType',
  'controlAccountId',
  'gstNumber',
  'contactPerson',
  'phone',
  'email',
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

async function nextSupplierCode(): Promise<string> {
  const last = await prisma.supplier.findFirst({
    where: { code: { startsWith: 'SUP' } },
    orderBy: { code: 'desc' },
    select: { code: true },
  });
  let next = 1;
  if (last?.code) {
    const m = /^SUP(\d+)$/.exec(last.code);
    if (m) next = parseInt(m[1], 10) + 1;
  }
  return `SUP${String(next).padStart(4, '0')}`;
}

export const supplierService = {
  async list(q: ListSuppliersQuery) {
    const where: Prisma.SupplierWhereInput = {
      ...(typeof q.isActive === 'boolean' ? { isActive: q.isActive } : {}),
      ...(q.supplierType ? { supplierType: q.supplierType } : {}),
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
      prisma.supplier.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: {
          vehicles: {
            where: { isActive: true },
            orderBy: { vehicleNumber: 'asc' },
          },
          _count: { select: { vehicles: true } },
        },
      }),
      prisma.supplier.count({ where }),
    ]);

    return { items, page: q.page, pageSize: q.pageSize, total };
  },

  async getById(id: string) {
    const row = await prisma.supplier.findUnique({
      where: { id },
      include: {
        vehicles: { orderBy: { vehicleNumber: 'asc' } },
        controlAccount: { select: { id: true, code: true, name: true, type: true } },
      },
    });
    if (!row) throw Errors.notFound(`Supplier ${id} not found`);
    return row;
  },

  async create(input: CreateSupplierInput, ctx: ActorContext) {
    const createSupplier = async (code: string) =>
      prisma.supplier.create({
        data: {
          code,
          name: input.name,
          address: input.address ?? null,
          ...(SUPPORTS_SUPPLIER_STATE
            ? { state: input.state ?? inferStateFromGstin(input.gstNumber) }
            : {}),
          supplierType: input.supplierType,
          controlAccountId: input.controlAccountId ?? null,
          gstNumber: input.gstNumber ?? null,
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
        include: { vehicles: true },
      });

    let created;
    if (input.code) {
      created = await createSupplier(input.code);
    } else {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const code = await nextSupplierCode();
        try {
          created = await createSupplier(code);
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
      throw Errors.internal('Failed to create supplier');
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

  async update(id: string, input: UpdateSupplierInput, ctx: ActorContext) {
    const before = await prisma.supplier.findUnique({ where: { id } });
    if (!before) throw Errors.notFound(`Supplier ${id} not found`);

    const updated = await prisma.$transaction(async (tx) => {
      if (input.vehicles !== undefined) {
        await tx.supplierVehicle.deleteMany({ where: { supplierId: id } });
      }

      return tx.supplier.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.address !== undefined ? { address: input.address } : {}),
          ...(SUPPORTS_SUPPLIER_STATE && input.state !== undefined
            ? { state: input.state }
            : {}),
          ...(input.supplierType !== undefined ? { supplierType: input.supplierType } : {}),
          ...(input.controlAccountId !== undefined
            ? { controlAccountId: input.controlAccountId }
            : {}),
          ...(input.gstNumber !== undefined ? { gstNumber: input.gstNumber } : {}),
          ...(input.contactPerson !== undefined ? { contactPerson: input.contactPerson } : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.email !== undefined ? { email: input.email } : {}),
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
    const before = await prisma.supplier.findUnique({ where: { id } });
    if (!before) throw Errors.notFound(`Supplier ${id} not found`);
    if (!before.isActive) return;
    await prisma.supplier.update({ where: { id }, data: { isActive: false } });
    await auditService.record({ ...ctx, action: 'DEACTIVATE', resource: RESOURCE, resourceId: id });
  },

  async listVehicles(supplierId: string) {
    await this.getById(supplierId);
    return prisma.supplierVehicle.findMany({
      where: { supplierId },
      orderBy: { vehicleNumber: 'asc' },
    });
  },

  async addVehicle(supplierId: string, input: VehicleUpsertInput, ctx: ActorContext) {
    await this.getById(supplierId);
    const created = await prisma.supplierVehicle.create({
      data: {
        supplierId,
        vehicleNumber: input.vehicleNumber,
        driverName: input.driverName ?? null,
        driverPhone: input.driverPhone ?? null,
        isActive: input.isActive ?? true,
      },
    });
    await auditService.record({
      ...ctx,
      action: 'CREATE',
      resource: 'masters.supplier.vehicle',
      resourceId: created.id,
      changes: { supplierId, ...input },
    });
    return created;
  },

  async removeVehicle(supplierId: string, vehicleId: string, ctx: ActorContext) {
    const v = await prisma.supplierVehicle.findUnique({ where: { id: vehicleId } });
    if (!v || v.supplierId !== supplierId) throw Errors.notFound(`Vehicle ${vehicleId} not found`);
    await prisma.supplierVehicle.delete({ where: { id: vehicleId } });
    await auditService.record({
      ...ctx,
      action: 'DELETE',
      resource: 'masters.supplier.vehicle',
      resourceId: vehicleId,
      changes: { vehicleNumber: v.vehicleNumber },
    });
  },
};
