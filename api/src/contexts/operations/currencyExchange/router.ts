import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../infra/db.js';
import { asyncHandler, validate } from '../../../infra/validation.js';
import { requireAuth } from '../../iam/auth.middleware.js';
import { auditService } from '../../audit/audit.service.js';
import { actorContextFromRequest } from '../../masters/_common.js';

const DenomDetail = z.object({
  denomination: z.number().int().positive(),
  nos: z.number().int().nonnegative(),
  amount: z.number().nonnegative(),
});

const ListQuery = z.object({
  status: z.enum(['OPEN', 'CLOSED', 'CANCELLED']).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

const Create = z.object({
  billDateTime: z.coerce.date().optional(),
  outDetails: z.array(DenomDetail).default([]),
  inDetails: z.array(DenomDetail).default([]),
});

const Update = z.object({
  billDateTime: z.coerce.date().optional(),
  outDetails: z.array(DenomDetail).optional(),
  inDetails: z.array(DenomDetail).optional(),
  status: z.enum(['OPEN', 'CLOSED', 'CANCELLED']).optional(),
});

const IdParam = z.object({ id: z.string().min(1) });
const router = Router();
router.use(requireAuth);

router.get('/', validate('query', ListQuery), asyncHandler(async (req, res) => {
  const q = req.query as unknown as z.infer<typeof ListQuery>;
  const where: Prisma.CurrencyExchangeWhereInput = {
    ...(q.status ? { status: q.status } : {}),
    ...(q.search ? { entryNo: { contains: q.search, mode: 'insensitive' } } : {}),
    ...(q.dateFrom || q.dateTo ? {
      billDateTime: {
        ...(q.dateFrom ? { gte: q.dateFrom } : {}),
        ...(q.dateTo ? { lte: q.dateTo } : {}),
      },
    } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.currencyExchange.findMany({ where, orderBy: { billDateTime: 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
    prisma.currencyExchange.count({ where }),
  ]);
  res.json({ items, page: q.page, pageSize: q.pageSize, total });
}));

router.get('/:id', validate('params', IdParam), asyncHandler(async (req, res) => {
  const entry = await prisma.currencyExchange.findUnique({ where: { id: req.params.id } });
  if (!entry) return res.status(404).json({ message: 'Not found' });
  res.json(entry);
}));

router.post('/', validate('body', Create), asyncHandler(async (req, res) => {
  const data = req.body as z.infer<typeof Create>;
  const actor = actorContextFromRequest(req);

  const year = new Date().getFullYear();
  const scope = `cx:${year}`;
  let entryNo = '';
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const counter = await prisma.counter.upsert({
      where: { scope },
      create: { scope, value: 1 },
      update: { value: { increment: 1 } },
    });
    const candidate = `CXG-${year}-${String(counter.value).padStart(3, '0')}`;
    const clash = await prisma.currencyExchange.findUnique({ where: { entryNo: candidate } });
    if (!clash) {
      entryNo = candidate;
      break;
    }
  }
  if (!entryNo) {
    return res.status(500).json({ message: 'Failed to allocate currency exchange entry number' });
  }
  const totalAmountPaid = data.outDetails.reduce((s, d) => s + d.amount, 0);
  const totalAmountReceived = data.inDetails.reduce((s, d) => s + d.amount, 0);

  const entry = await prisma.currencyExchange.create({
    data: {
      entryNo,
      billDateTime: data.billDateTime ?? new Date(),
      outDetails: data.outDetails as unknown as Prisma.InputJsonValue,
      inDetails: data.inDetails as unknown as Prisma.InputJsonValue,
      totalAmountPaid,
      totalAmountReceived,
      status: 'OPEN',
      createdById: actor.actorId ?? 'system',
    },
  });
  await auditService.record({ ...actor, action: 'CREATE', resource: 'CurrencyExchange', resourceId: entry.id, changes: data });
  res.status(201).json(entry);
}));

router.patch('/:id', validate('params', IdParam), validate('body', Update), asyncHandler(async (req, res) => {
  const data = req.body as z.infer<typeof Update>;
  const actor = actorContextFromRequest(req);

  const existing = await prisma.currencyExchange.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ message: 'Not found' });
  if (existing.status === 'CANCELLED') {
    return res.status(422).json({ message: 'Cancelled entries cannot be edited' });
  }

  const outDetails = data.outDetails ?? (existing.outDetails as unknown as z.infer<typeof DenomDetail>[]);
  const inDetails = data.inDetails ?? (existing.inDetails as unknown as z.infer<typeof DenomDetail>[]);
  const totalAmountPaid = outDetails.reduce((s, d) => s + Number(d.amount), 0);
  const totalAmountReceived = inDetails.reduce((s, d) => s + Number(d.amount), 0);

  const updated = await prisma.currencyExchange.update({
    where: { id: req.params.id },
    data: {
      ...(data.billDateTime ? { billDateTime: data.billDateTime } : {}),
      ...(data.outDetails ? { outDetails: data.outDetails as unknown as Prisma.InputJsonValue } : {}),
      ...(data.inDetails ? { inDetails: data.inDetails as unknown as Prisma.InputJsonValue } : {}),
      totalAmountPaid,
      totalAmountReceived,
      ...(data.status ? { status: data.status } : {}),
    },
  });
  await auditService.record({ ...actor, action: 'UPDATE', resource: 'CurrencyExchange', resourceId: updated.id, changes: data });
  res.json(updated);
}));

export const currencyExchangeRouter = router;
