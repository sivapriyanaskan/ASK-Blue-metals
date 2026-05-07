import { Prisma } from '@prisma/client';
import { prisma } from '../../../infra/db.js';
import { Errors } from '../../../infra/errors.js';
import { auditService } from '../../audit/audit.service.js';
import type { ActorContext } from '../_common.js';
import { diff } from '../_common.js';
import type { CreateItemInput, ListItemsQuery, UpdateItemInput } from './schema.js';

const RESOURCE = 'masters.item';
const TRACKED_FIELDS = [
  'code',
  'name',
  'groupId',
  'subGroupId',
  'purchaseUnitId',
  'sellingUnitId',
  'hsnCode',
  'isRawMaterial',
  'isSaleMaterial',
  'sellingPrice',
  'gstPercent',
  'defaultPrinterId',
  'isActive',
] as const;

async function assertSubGroupBelongsToGroup(groupId: string, subGroupId: string) {
  const sub = await prisma.itemSubGroup.findUnique({
    where: { id: subGroupId },
    select: { groupId: true },
  });
  if (!sub) throw Errors.badRequest(`Sub-group ${subGroupId} not found`);
  if (sub.groupId !== groupId) {
    throw Errors.badRequest(`Sub-group ${subGroupId} does not belong to group ${groupId}`);
  }
}

export const itemService = {
  async list(q: ListItemsQuery) {
    const where: Prisma.ItemWhereInput = {
      ...(typeof q.isActive === 'boolean' ? { isActive: q.isActive } : {}),
      ...(typeof q.isRawMaterial === 'boolean' ? { isRawMaterial: q.isRawMaterial } : {}),
      ...(typeof q.isSaleMaterial === 'boolean' ? { isSaleMaterial: q.isSaleMaterial } : {}),
      ...(q.groupId ? { groupId: q.groupId } : {}),
      ...(q.subGroupId ? { subGroupId: q.subGroupId } : {}),
      ...(q.search
        ? {
            OR: [
              { code: { contains: q.search, mode: 'insensitive' } },
              { name: { contains: q.search, mode: 'insensitive' } },
              { hsnCode: { contains: q.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: {
          group: { select: { id: true, code: true, name: true } },
          subGroup: { select: { id: true, code: true, name: true } },
          purchaseUnit: { select: { id: true, code: true, name: true } },
          sellingUnit: { select: { id: true, code: true, name: true } },
          defaultPrinter: { select: { id: true, code: true, name: true, type: true } },
        },
      }),
      prisma.item.count({ where }),
    ]);

    return { items, page: q.page, pageSize: q.pageSize, total };
  },

  async getById(id: string) {
    const row = await prisma.item.findUnique({
      where: { id },
      include: {
        group: true,
        subGroup: true,
        purchaseUnit: true,
        sellingUnit: true,
        defaultPrinter: true,
      },
    });
    if (!row) throw Errors.notFound(`Item ${id} not found`);
    return row;
  },

  async create(input: CreateItemInput, ctx: ActorContext) {
    await assertSubGroupBelongsToGroup(input.groupId, input.subGroupId);

    const created = await prisma.item.create({
      data: {
        code: input.code,
        name: input.name,
        groupId: input.groupId,
        subGroupId: input.subGroupId,
        purchaseUnitId: input.purchaseUnitId,
        sellingUnitId: input.sellingUnitId,
        hsnCode: input.hsnCode ?? null,
        isRawMaterial: input.isRawMaterial,
        isSaleMaterial: input.isSaleMaterial,
        sellingPrice: input.sellingPrice,
        gstPercent: input.gstPercent,
        defaultPrinterId: input.defaultPrinterId ?? null,
        isActive: input.isActive ?? true,
      },
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

  async update(id: string, input: UpdateItemInput, ctx: ActorContext) {
    const before = await prisma.item.findUnique({ where: { id } });
    if (!before) throw Errors.notFound(`Item ${id} not found`);

    if (input.groupId !== undefined || input.subGroupId !== undefined) {
      const groupId = input.groupId ?? before.groupId;
      const subGroupId = input.subGroupId ?? before.subGroupId;
      await assertSubGroupBelongsToGroup(groupId, subGroupId);
    }

    const updated = await prisma.item.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.groupId !== undefined ? { groupId: input.groupId } : {}),
        ...(input.subGroupId !== undefined ? { subGroupId: input.subGroupId } : {}),
        ...(input.purchaseUnitId !== undefined ? { purchaseUnitId: input.purchaseUnitId } : {}),
        ...(input.sellingUnitId !== undefined ? { sellingUnitId: input.sellingUnitId } : {}),
        ...(input.hsnCode !== undefined ? { hsnCode: input.hsnCode } : {}),
        ...(input.isRawMaterial !== undefined ? { isRawMaterial: input.isRawMaterial } : {}),
        ...(input.isSaleMaterial !== undefined ? { isSaleMaterial: input.isSaleMaterial } : {}),
        ...(input.sellingPrice !== undefined ? { sellingPrice: input.sellingPrice } : {}),
        ...(input.gstPercent !== undefined ? { gstPercent: input.gstPercent } : {}),
        ...(input.defaultPrinterId !== undefined ? { defaultPrinterId: input.defaultPrinterId } : {}),
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
    const before = await prisma.item.findUnique({ where: { id } });
    if (!before) throw Errors.notFound(`Item ${id} not found`);
    if (!before.isActive) return;
    await prisma.item.update({ where: { id }, data: { isActive: false } });
    await auditService.record({ ...ctx, action: 'DEACTIVATE', resource: RESOURCE, resourceId: id });
  },
};
