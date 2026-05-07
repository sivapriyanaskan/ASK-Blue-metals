import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../infra/db.js';
import { asyncHandler, validate } from '../../../infra/validation.js';
import { requireAuth } from '../../iam/auth.middleware.js';
import { auditService } from '../../audit/audit.service.js';
import { actorContextFromRequest } from '../../masters/_common.js';

const Expense = z.object({
  slNo: z.number().int().positive(),
  expenseHead: z.string().max(200),
  supplierName: z.string().max(200).optional().default(''),
  amount: z.number().nonnegative(),
  paid: z.number().nonnegative().default(0),
});

const ListQuery = z.object({
  vehicleId: z.string().min(1).optional(),
  supplierId: z.string().min(1).optional(),
  workCentreId: z.string().min(1).optional(),
  status: z.enum(['SAVED', 'POSTED', 'CANCELLED']).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

const Create = z.object({
  entryDateTime: z.coerce.date().optional(),
  vehicleId: z.string().min(1),
  driverId: z.string().optional().nullable(),
  driverNameSnapshot: z.string().max(120).optional().nullable(),
  workCentreId: z.string().min(1),
  supplierId: z.string().min(1),
  referenceNo: z.string().max(50).optional().nullable(),
  meterStartReading: z.coerce.number().nonnegative(),
  meterCurrentReading: z.coerce.number().nonnegative(),
  fuelFilledQty: z.coerce.number().nonnegative(),
  ratePerLiter: z.coerce.number().nonnegative(),
  expenses: z.array(Expense).default([]),
  paidAmount: z.coerce.number().nonnegative().default(0),
  remarks: z.string().max(500).optional().nullable(),
});

const Update = z.object({
  entryDateTime: z.coerce.date().optional(),
  vehicleId: z.string().min(1).optional(),
  driverId: z.string().optional().nullable(),
  driverNameSnapshot: z.string().max(120).optional().nullable(),
  workCentreId: z.string().min(1).optional(),
  supplierId: z.string().min(1).optional(),
  referenceNo: z.string().max(50).optional().nullable(),
  meterStartReading: z.coerce.number().nonnegative().optional(),
  meterCurrentReading: z.coerce.number().nonnegative().optional(),
  fuelFilledQty: z.coerce.number().nonnegative().optional(),
  ratePerLiter: z.coerce.number().nonnegative().optional(),
  expenses: z.array(Expense).optional(),
  paidAmount: z.coerce.number().nonnegative().optional(),
  remarks: z.string().max(500).optional().nullable(),
  status: z.enum(['SAVED', 'POSTED', 'CANCELLED']).optional(),
});

const IdParam = z.object({ id: z.string().min(1) });
const router = Router();
router.use(requireAuth);

router.get('/', validate('query', ListQuery), asyncHandler(async (req, res) => {
  const q = req.query as unknown as z.infer<typeof ListQuery>;
  const where: Prisma.FuelConsumptionWhereInput = {
    ...(q.vehicleId ? { vehicleId: q.vehicleId } : {}),
    ...(q.supplierId ? { supplierId: q.supplierId } : {}),
    ...(q.workCentreId ? { workCentreId: q.workCentreId } : {}),
    ...(q.status ? { status: q.status } : {}),
    ...(q.search ? {
      OR: [
        { entryNo: { contains: q.search, mode: 'insensitive' } },
        { vehicleRegNoSnapshot: { contains: q.search, mode: 'insensitive' } },
        { driverNameSnapshot: { contains: q.search, mode: 'insensitive' } },
        { supplierNameSnapshot: { contains: q.search, mode: 'insensitive' } },
      ],
    } : {}),
    ...(q.dateFrom || q.dateTo ? {
      entryDateTime: {
        ...(q.dateFrom ? { gte: q.dateFrom } : {}),
        ...(q.dateTo ? { lte: q.dateTo } : {}),
      },
    } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.fuelConsumption.findMany({
      where,
      orderBy: { entryDateTime: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: {
        vehicle: { select: { id: true, registrationNumber: true } },
        supplier: { select: { id: true, name: true } },
        workCentre: { select: { id: true, name: true } },
      },
    }),
    prisma.fuelConsumption.count({ where }),
  ]);
  res.json({ items, page: q.page, pageSize: q.pageSize, total });
}));

router.get('/:id', validate('params', IdParam), asyncHandler(async (req, res) => {
  const entry = await prisma.fuelConsumption.findUnique({
    where: { id: req.params.id },
    include: {
      vehicle: { select: { id: true, registrationNumber: true } },
      supplier: { select: { id: true, name: true } },
      workCentre: { select: { id: true, name: true } },
    },
  });
  if (!entry) return res.status(404).json({ message: 'Not found' });
  res.json(entry);
}));

router.post('/', validate('body', Create), asyncHandler(async (req, res) => {
  const data = req.body as z.infer<typeof Create>;
  const actor = actorContextFromRequest(req);

  const vehicle = await prisma.vehicle.findUnique({ where: { id: data.vehicleId } });
  if (!vehicle) return res.status(422).json({ message: 'Vehicle not found' });
  const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId } });
  if (!supplier) return res.status(422).json({ message: 'Supplier not found' });
  const workCentre = await prisma.workCentre.findUnique({ where: { id: data.workCentreId } });
  if (!workCentre) return res.status(422).json({ message: 'Work centre not found' });

  const fuelAmount = data.fuelFilledQty * data.ratePerLiter;
  const totalExpenseAmount = fuelAmount + data.expenses.reduce((s, e) => s + e.amount, 0);

  const year = new Date().getFullYear();
  const scope = `fuel:${year}`;
  // Generate a unique entryNo, tolerating a desynced counter or seeded rows.
  let entryNo = '';
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const counter = await prisma.counter.upsert({
      where: { scope },
      create: { scope, value: 1 },
      update: { value: { increment: 1 } },
    });
    const candidate = `FE-${year}-${String(counter.value).padStart(3, '0')}`;
    const clash = await prisma.fuelConsumption.findUnique({ where: { entryNo: candidate } });
    if (!clash) {
      entryNo = candidate;
      break;
    }
  }
  if (!entryNo) {
    return res.status(500).json({ message: 'Failed to allocate fuel entry number' });
  }

  const entry = await prisma.fuelConsumption.create({
    data: {
      entryNo,
      entryDateTime: data.entryDateTime ?? new Date(),
      vehicleId: data.vehicleId,
      vehicleRegNoSnapshot: vehicle.registrationNumber,
      driverId: data.driverId ?? null,
      driverNameSnapshot: data.driverNameSnapshot ?? null,
      workCentreId: data.workCentreId,
      supplierId: data.supplierId,
      supplierNameSnapshot: supplier.name,
      referenceNo: data.referenceNo ?? null,
      meterStartReading: data.meterStartReading,
      meterCurrentReading: data.meterCurrentReading,
      fuelFilledQty: data.fuelFilledQty,
      ratePerLiter: data.ratePerLiter,
      fuelAmount,
      expenses: data.expenses as unknown as Prisma.InputJsonValue,
      totalExpenseAmount,
      paidAmount: data.paidAmount,
      status: 'SAVED',
      remarks: data.remarks ?? null,
      createdById: actor.actorId ?? 'system',
    },
  });
  await auditService.record({ ...actor, action: 'CREATE', resource: 'FuelConsumption', resourceId: entry.id, changes: data });
  res.status(201).json(entry);
}));

router.patch('/:id', validate('params', IdParam), validate('body', Update), asyncHandler(async (req, res) => {
  const data = req.body as z.infer<typeof Update>;
  const actor = actorContextFromRequest(req);

  const existing = await prisma.fuelConsumption.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ message: 'Not found' });
  if (existing.status === 'CANCELLED') {
    return res.status(422).json({ message: 'Cancelled entries cannot be edited' });
  }

  let vehicleRegNoSnapshot = existing.vehicleRegNoSnapshot;
  if (data.vehicleId && data.vehicleId !== existing.vehicleId) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: data.vehicleId } });
    if (!vehicle) return res.status(422).json({ message: 'Vehicle not found' });
    vehicleRegNoSnapshot = vehicle.registrationNumber;
  }
  let supplierNameSnapshot = existing.supplierNameSnapshot;
  if (data.supplierId && data.supplierId !== existing.supplierId) {
    const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId } });
    if (!supplier) return res.status(422).json({ message: 'Supplier not found' });
    supplierNameSnapshot = supplier.name;
  }
  if (data.workCentreId && data.workCentreId !== existing.workCentreId) {
    const workCentre = await prisma.workCentre.findUnique({ where: { id: data.workCentreId } });
    if (!workCentre) return res.status(422).json({ message: 'Work centre not found' });
  }

  const fuelFilledQty = data.fuelFilledQty ?? Number(existing.fuelFilledQty);
  const ratePerLiter = data.ratePerLiter ?? Number(existing.ratePerLiter);
  const fuelAmount = fuelFilledQty * ratePerLiter;
  const expenses = data.expenses ?? (existing.expenses as unknown as z.infer<typeof Expense>[]);
  const totalExpenseAmount = fuelAmount + expenses.reduce((s, e) => s + Number(e.amount), 0);

  const updated = await prisma.fuelConsumption.update({
    where: { id: req.params.id },
    data: {
      ...(data.entryDateTime ? { entryDateTime: data.entryDateTime } : {}),
      ...(data.vehicleId ? { vehicleId: data.vehicleId, vehicleRegNoSnapshot } : {}),
      ...(data.driverId !== undefined ? { driverId: data.driverId ?? null } : {}),
      ...(data.driverNameSnapshot !== undefined ? { driverNameSnapshot: data.driverNameSnapshot ?? null } : {}),
      ...(data.workCentreId ? { workCentreId: data.workCentreId } : {}),
      ...(data.supplierId ? { supplierId: data.supplierId, supplierNameSnapshot } : {}),
      ...(data.referenceNo !== undefined ? { referenceNo: data.referenceNo ?? null } : {}),
      ...(data.meterStartReading !== undefined ? { meterStartReading: data.meterStartReading } : {}),
      ...(data.meterCurrentReading !== undefined ? { meterCurrentReading: data.meterCurrentReading } : {}),
      fuelFilledQty,
      ratePerLiter,
      fuelAmount,
      ...(data.expenses ? { expenses: data.expenses as unknown as Prisma.InputJsonValue } : {}),
      totalExpenseAmount,
      ...(data.paidAmount !== undefined ? { paidAmount: data.paidAmount } : {}),
      ...(data.remarks !== undefined ? { remarks: data.remarks ?? null } : {}),
      ...(data.status ? { status: data.status } : {}),
    },
  });
  await auditService.record({ ...actor, action: 'UPDATE', resource: 'FuelConsumption', resourceId: updated.id, changes: data });
  res.json(updated);
}));

export const fuelConsumptionRouter = router;
