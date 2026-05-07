import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../infra/db.js';
import { asyncHandler, validate } from '../../../infra/validation.js';
import { requireAuth } from '../../iam/auth.middleware.js';
import { auditService } from '../../audit/audit.service.js';
import { actorContextFromRequest } from '../../masters/_common.js';

const VoucherLine = z.object({
  slNo: z.number().int().positive(),
  accountId: z.string().optional().nullable(),
  accountHeadNameSnapshot: z.string().max(200),
  description: z.string().max(500).optional().default(''),
  amount: z.number().nonnegative(),
});

const DenomRow = z.object({
  denomination: z.number().int().positive(),
  nos: z.number().int().nonnegative(),
  amount: z.number().nonnegative(),
});

const ListQuery = z.object({
  voucherType: z.enum(['PAYMENT', 'RECEIPT']).optional(),
  status: z.enum(['DRAFT', 'POSTED', 'CANCELLED']).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

const Create = z.object({
  voucherType: z.enum(['PAYMENT', 'RECEIPT']),
  docDate: z.coerce.date(),
  lines: z.array(VoucherLine).min(1),
  paymentMode: z.enum(['CASH', 'ONLINE', 'CREDIT', 'MIXED']).default('CASH'),
  bankId: z.string().optional().nullable(),
  transactionNo: z.string().max(100).optional().nullable(),
  denominations: z.array(DenomRow).default([]),
  preparedBySnapshot: z.string().max(120),
  remarks: z.string().max(500).optional().nullable(),
});

const Update = z.object({
  docDate: z.coerce.date().optional(),
  lines: z.array(VoucherLine).min(1).optional(),
  paymentMode: z.enum(['CASH', 'ONLINE', 'CREDIT', 'MIXED']).optional(),
  bankId: z.string().optional().nullable(),
  transactionNo: z.string().max(100).optional().nullable(),
  denominations: z.array(DenomRow).optional(),
  remarks: z.string().max(500).optional().nullable(),
  status: z.enum(['DRAFT', 'POSTED', 'CANCELLED']).optional(),
  cancelledReason: z.string().max(500).optional().nullable(),
});

const IdParam = z.object({ id: z.string().min(1) });
const router = Router();
router.use(requireAuth);

router.get('/', validate('query', ListQuery), asyncHandler(async (req, res) => {
  const q = req.query as unknown as z.infer<typeof ListQuery>;
  const where: Prisma.CashVoucherWhereInput = {
    ...(q.voucherType ? { voucherType: q.voucherType } : {}),
    ...(q.status ? { status: q.status } : {}),
    ...(q.search ? {
      OR: [
        { voucherNo: { contains: q.search, mode: 'insensitive' } },
        { preparedBySnapshot: { contains: q.search, mode: 'insensitive' } },
      ],
    } : {}),
    ...(q.dateFrom || q.dateTo ? {
      docDate: {
        ...(q.dateFrom ? { gte: q.dateFrom } : {}),
        ...(q.dateTo ? { lte: q.dateTo } : {}),
      },
    } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.cashVoucher.findMany({ where, orderBy: { docDate: 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
    prisma.cashVoucher.count({ where }),
  ]);
  res.json({ items, page: q.page, pageSize: q.pageSize, total });
}));

router.get('/:id', validate('params', IdParam), asyncHandler(async (req, res) => {
  const voucher = await prisma.cashVoucher.findUnique({ where: { id: req.params.id } });
  if (!voucher) return res.status(404).json({ message: 'Not found' });
  res.json(voucher);
}));

router.post('/', validate('body', Create), asyncHandler(async (req, res) => {
  const data = req.body as z.infer<typeof Create>;
  const actor = actorContextFromRequest(req);

  const totalAmount = data.lines.reduce((s, l) => s + l.amount, 0);
  const month = new Date().toLocaleString('en-IN', { month: 'short' });
  const yy = String(new Date().getFullYear()).slice(-2);
  const prefix = data.voucherType === 'PAYMENT' ? 'Pay' : 'Rec';
  const scope = `cv:${data.voucherType}:${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  let voucherNo = '';
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const counter = await prisma.counter.upsert({
      where: { scope },
      create: { scope, value: 1 },
      update: { value: { increment: 1 } },
    });
    const candidate = `${prefix}/${month}/${counter.value}/${yy}`;
    const clash = await prisma.cashVoucher.findUnique({ where: { voucherNo: candidate } });
    if (!clash) {
      voucherNo = candidate;
      break;
    }
  }
  if (!voucherNo) {
    return res.status(500).json({ message: 'Failed to allocate cash voucher number' });
  }

  const voucher = await prisma.cashVoucher.create({
    data: {
      voucherNo,
      voucherType: data.voucherType,
      docDate: data.docDate,
      lines: data.lines as unknown as Prisma.InputJsonValue,
      totalAmount,
      paymentMode: data.paymentMode,
      bankId: data.bankId ?? null,
      transactionNo: data.transactionNo ?? null,
      denominations: data.denominations as unknown as Prisma.InputJsonValue,
      preparedById: actor.actorId ?? 'system',
      preparedBySnapshot: data.preparedBySnapshot,
      remarks: data.remarks ?? null,
      status: 'DRAFT',
    },
  });
  await auditService.record({ ...actor, action: 'CREATE', resource: 'CashVoucher', resourceId: voucher.id, changes: data });
  res.status(201).json(voucher);
}));

router.patch('/:id', validate('params', IdParam), validate('body', Update), asyncHandler(async (req, res) => {
  const data = req.body as z.infer<typeof Update>;
  const actor = actorContextFromRequest(req);

  const existing = await prisma.cashVoucher.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ message: 'Not found' });
  if (existing.status === 'CANCELLED') {
    return res.status(422).json({ message: 'Cancelled vouchers cannot be edited' });
  }
  // Once POSTED, only allow status transitions (e.g. cancel) and remarks updates.
  if (existing.status === 'POSTED') {
    const allowed = ['status', 'cancelledReason', 'remarks'];
    const keys = Object.keys(data).filter((k) => (data as Record<string, unknown>)[k] !== undefined);
    const blocked = keys.filter((k) => !allowed.includes(k));
    if (blocked.length > 0) {
      return res.status(422).json({ message: `Posted vouchers cannot modify: ${blocked.join(', ')}` });
    }
  }

  const lines = data.lines ?? (existing.lines as unknown as z.infer<typeof VoucherLine>[]);
  const totalAmount = lines.reduce((s, l) => s + Number(l.amount), 0);

  const updated = await prisma.cashVoucher.update({
    where: { id: req.params.id },
    data: {
      ...(data.docDate ? { docDate: data.docDate } : {}),
      ...(data.lines ? { lines: data.lines as unknown as Prisma.InputJsonValue, totalAmount } : {}),
      ...(data.paymentMode ? { paymentMode: data.paymentMode } : {}),
      ...(data.bankId !== undefined ? { bankId: data.bankId ?? null } : {}),
      ...(data.transactionNo !== undefined ? { transactionNo: data.transactionNo ?? null } : {}),
      ...(data.denominations ? { denominations: data.denominations as unknown as Prisma.InputJsonValue } : {}),
      ...(data.remarks !== undefined ? { remarks: data.remarks ?? null } : {}),
      ...(data.status ? { status: data.status } : {}),
      ...(data.cancelledReason !== undefined ? { cancelledReason: data.cancelledReason ?? null } : {}),
    },
  });
  await auditService.record({ ...actor, action: 'UPDATE', resource: 'CashVoucher', resourceId: updated.id, changes: data });
  res.json(updated);
}));

export const cashVoucherRouter = router;
