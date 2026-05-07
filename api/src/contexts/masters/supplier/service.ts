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
const TRACKED_FIELDS = [
  'code',
  'name',
  'address',
  'supplierType',
  'controlAccountId',
  'gstNumber',
  'contactPerson',
  'phone',
  'email',
  'isActive',
] as const;

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
        include: { _count: { select: { vehicles: true } } },
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
    const created = await prisma.supplier.create({
      data: {
        code: input.code,
        name: input.name,
        address: input.address ?? null,
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

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.supplierType !== undefined ? { supplierType: input.supplierType } : {}),
        ...(input.controlAccountId !== undefined
          ? { controlAccountId: input.controlAccountId }
          : {}),
        ...(input.gstNumber !== undefined ? { gstNumber: input.gstNumber } : {}),
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
