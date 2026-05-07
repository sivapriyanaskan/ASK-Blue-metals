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
  status: z.enum(['OPEN', 'CLOSED']).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

const Create = z.object({
  shiftDate: z.coerce.date(),
  openedBySnapshot: z.string().trim().min(1).max(120),
  openingAmount: z.coerce.number().nonnegative().default(0),
  remarks: z.string().trim().max(500).optional().nullable(),
  openingDenominations: z.array(DenomDetail).optional(),
});

const Update = z.object({
  remarks: z.string().trim().max(500).optional().nullable(),
  nextShiftUserId: z.string().trim().min(1).optional().nullable(),
  transferAmount: z.coerce.number().nonnegative().optional(),
  closingAmount: z.coerce.number().nonnegative().optional(),
  openingDenominations: z.array(DenomDetail).optional(),
  closingDenominations: z.array(DenomDetail).optional(),
  transferDenominations: z.array(DenomDetail).optional(),
});

const Close = z.object({
  closedBySnapshot: z.string().trim().min(1).max(120),
  transferAmount: z.coerce.number().nonnegative().default(0),
  closingAmount: z.coerce.number().nonnegative().default(0),
  remarks: z.string().trim().max(500).optional().nullable(),
  nextShiftUserId: z.string().trim().min(1).optional().nullable(),
  closingDenominations: z.array(DenomDetail).optional(),
  transferDenominations: z.array(DenomDetail).optional(),
});

const TransferDenomBody = z.object({
  transferDenominations: z.array(DenomDetail),
  transferAmount: z.coerce.number().nonnegative().optional(),
});

const IdParam = z.object({ id: z.string().min(1) });
const router = Router();
router.use(requireAuth);

// Aggregate live totals from related transactional tables for a shift's time window.
async function computeShiftTotals(shift: {
  openedAt: Date;
  closedAt: Date | null;
  openingDenominations: Prisma.JsonValue;
}) {
  const from = shift.openedAt;
  const to = shift.closedAt ?? new Date();
  const range = { gte: from, lte: to };
  // Cash vouchers carry a date-only `docDate` stored at IST midnight
  // (e.g. 2026-05-06 IST → 2026-05-05T18:30:00Z). The shift's openedAt
  // is a precise instant which can be later than the IST-midnight of the
  // same calendar day. Floor the lower bound to IST midnight of the
  // shift's open date so same-day vouchers are included without leaking
  // in vouchers from previous calendar days.
  const IST_OFFSET_MIN = 330; // +05:30
  const istMs = from.getTime() + IST_OFFSET_MIN * 60_000;
  const istMidnightMs = Math.floor(istMs / 86_400_000) * 86_400_000;
  const fromDay = new Date(istMidnightMs - IST_OFFSET_MIN * 60_000);
  const voucherRange = { gte: fromDay, lte: to };

  const [salesAgg, purchaseAgg, receiptAgg, paymentAgg, salesBillsForDenom, receiptVouchersForDenom, paymentVouchersForDenom] = await Promise.all([
    prisma.salesBill.aggregate({
      where: { status: 'POSTED', billDate: range },
      _sum: { cashAmount: true, totalAmount: true },
    }),
    prisma.purchaseBill.aggregate({
      where: { status: 'POSTED', paymentMode: 'CASH', purchaseDateTime: range },
      _sum: { grossPayable: true },
    }),
    prisma.cashVoucher.aggregate({
      where: { status: { not: 'CANCELLED' }, voucherType: 'RECEIPT', paymentMode: 'CASH', docDate: voucherRange },
      _sum: { totalAmount: true },
    }),
    prisma.cashVoucher.aggregate({
      where: { status: { not: 'CANCELLED' }, voucherType: 'PAYMENT', paymentMode: 'CASH', docDate: voucherRange },
      _sum: { totalAmount: true },
    }),
    prisma.salesBill.findMany({
      where: { status: 'POSTED', billDate: range, paymentMode: { in: ['CASH', 'MIXED'] } },
      select: { denominations: true },
    }),
    prisma.cashVoucher.findMany({
      where: { status: { not: 'CANCELLED' }, voucherType: 'RECEIPT', paymentMode: 'CASH', docDate: voucherRange },
      select: { denominations: true },
    }),
    prisma.cashVoucher.findMany({
      where: { status: { not: 'CANCELLED' }, voucherType: 'PAYMENT', paymentMode: 'CASH', docDate: voucherRange },
      select: { denominations: true },
    }),
  ]);

  const num = (v: Prisma.Decimal | null | undefined) => Number(v ?? 0);

  // Live denomination breakdown: opening + sales(cash) + receipts - payments.
  // Purchase cash payouts are not denomination-tracked; their effect is on
  // the total cash-in-hand value, not on per-denomination NOS.
  type DRow = { denomination: number | string; nos: number | string; amount?: number | string };
  const denomMap = new Map<number, number>(); // denomination → nos
  const addRows = (rows: unknown, sign: 1 | -1) => {
    if (!Array.isArray(rows)) return;
    for (const r of rows as DRow[]) {
      const d = Number(r.denomination) || 0;
      const n = Number(r.nos) || 0;
      if (d <= 0 || n === 0) continue;
      denomMap.set(d, (denomMap.get(d) ?? 0) + sign * n);
    }
  };
  addRows(shift.openingDenominations, 1);
  for (const b of salesBillsForDenom) addRows(b.denominations, 1);
  for (const v of receiptVouchersForDenom) addRows(v.denominations, 1);
  for (const v of paymentVouchersForDenom) addRows(v.denominations, -1);

  const liveDenominations = Array.from(denomMap.entries())
    .map(([denomination, nos]) => ({
      denomination,
      nos: Math.max(0, nos),
      amount: denomination * Math.max(0, nos),
    }))
    .sort((a, b) => b.denomination - a.denomination);

  return {
    billingTotal: num(salesAgg._sum.cashAmount),
    invoiceTotal: num(salesAgg._sum.totalAmount),
    purchaseTotal: num(purchaseAgg._sum.grossPayable),
    receiptTotal: num(receiptAgg._sum.totalAmount),
    paymentTotal: num(paymentAgg._sum.totalAmount),
    weightSlipTotal: 0,
    liveDenominations,
  };
}

function withTotals<T extends { openedAt: Date; closedAt: Date | null }>(
  shift: T,
  totals: Awaited<ReturnType<typeof computeShiftTotals>>,
) {
  return {
    ...shift,
    billingTotal: totals.billingTotal,
    invoiceTotal: totals.invoiceTotal,
    purchaseTotal: totals.purchaseTotal,
    receiptTotal: totals.receiptTotal,
    paymentTotal: totals.paymentTotal,
    weightSlipTotal: totals.weightSlipTotal,
    liveDenominations: totals.liveDenominations,
  };
}

router.get('/', validate('query', ListQuery), asyncHandler(async (req, res) => {
  const q = req.query as unknown as z.infer<typeof ListQuery>;
  const where: Prisma.ShiftWhereInput = {
    ...(q.status ? { status: q.status } : {}),
    ...(q.search
      ? {
          OR: [
            { shiftNo: { contains: q.search, mode: 'insensitive' } },
            { openedBySnapshot: { contains: q.search, mode: 'insensitive' } },
            { remarks: { contains: q.search, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(q.dateFrom || q.dateTo
      ? {
          shiftDate: {
            ...(q.dateFrom ? { gte: q.dateFrom } : {}),
            ...(q.dateTo ? { lte: q.dateTo } : {}),
          },
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.shift.findMany({
      where,
      orderBy: { shiftDate: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.shift.count({ where }),
  ]);
  const enriched = await Promise.all(
    items.map(async (s) => withTotals(s, await computeShiftTotals(s))),
  );
  res.json({ items: enriched, page: q.page, pageSize: q.pageSize, total });
}));

// Flat listing of transfer denominations across all shifts (must be before /:id)
router.get('/transfer-denominations', asyncHandler(async (_req, res) => {
  const shifts = await prisma.shift.findMany({
    orderBy: { shiftDate: 'desc' },
    select: {
      id: true,
      shiftNo: true,
      shiftDate: true,
      status: true,
      transferDenominations: true,
    },
  });
  type Row = z.infer<typeof DenomDetail>;
  const items: Array<Row & {
    shiftTransferDenomId: string;
    shiftId: string;
    shiftNo: string;
    shiftDate: Date;
    status: string;
  }> = [];
  for (const s of shifts) {
    const arr = Array.isArray(s.transferDenominations) ? (s.transferDenominations as unknown as Row[]) : [];
    arr.forEach((d, i) => {
      items.push({
        shiftTransferDenomId: `${s.id}:${i}`,
        shiftId: s.id,
        shiftNo: s.shiftNo,
        shiftDate: s.shiftDate,
        status: s.status,
        denomination: Number(d.denomination) || 0,
        nos: Number(d.nos) || 0,
        amount: Number(d.amount) || 0,
      });
    });
  }
  res.json({ items, total: items.length });
}));

router.get('/:id', validate('params', IdParam), asyncHandler(async (req, res) => {
  const shift = await prisma.shift.findUnique({ where: { id: req.params.id } });
  if (!shift) return res.status(404).json({ message: 'Not found' });
  const totals = await computeShiftTotals(shift);
  res.json(withTotals(shift, totals));
}));

router.post('/', validate('body', Create), asyncHandler(async (req, res) => {
  const data = req.body as z.infer<typeof Create>;
  const actor = actorContextFromRequest(req);

  const year = new Date().getFullYear();
  const scope = `shift:${year}`;
  let shiftNo = '';
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const counter = await prisma.counter.upsert({
      where: { scope },
      create: { scope, value: 1 },
      update: { value: { increment: 1 } },
    });
    const candidate = `SH-${year}-${String(counter.value).padStart(3, '0')}`;
    const exists = await prisma.shift.findUnique({ where: { shiftNo: candidate } });
    if (!exists) {
      shiftNo = candidate;
      break;
    }
  }
  if (!shiftNo) return res.status(500).json({ message: 'Could not allocate shift number' });

  const created = await prisma.shift.create({
    data: {
      shiftNo,
      shiftDate: data.shiftDate,
      openedById: actor.actorId ?? 'system',
      openedBySnapshot: data.openedBySnapshot,
      openingAmount: data.openingAmount,
      remarks: data.remarks ?? null,
      status: 'OPEN',
      openingDenominations: (data.openingDenominations ?? []) as unknown as Prisma.InputJsonValue,
    },
  });
  await auditService.record({ ...actor, action: 'CREATE', resource: 'Shift', resourceId: created.id, changes: data });
  res.status(201).json(created);
}));

router.patch('/:id', validate('params', IdParam), validate('body', Update), asyncHandler(async (req, res) => {
  const actor = actorContextFromRequest(req);
  const shift = await prisma.shift.findUnique({ where: { id: req.params.id } });
  if (!shift) return res.status(404).json({ message: 'Not found' });

  const body = req.body as z.infer<typeof Update>;
  const data: Prisma.ShiftUpdateInput = {};
  if (body.remarks !== undefined) data.remarks = body.remarks;
  if (body.nextShiftUserId !== undefined) data.nextShiftUserId = body.nextShiftUserId;
  if (body.transferAmount !== undefined) data.transferAmount = body.transferAmount;
  if (body.closingAmount !== undefined) data.closingAmount = body.closingAmount;
  if (body.openingDenominations !== undefined)
    data.openingDenominations = body.openingDenominations as unknown as Prisma.InputJsonValue;
  if (body.closingDenominations !== undefined)
    data.closingDenominations = body.closingDenominations as unknown as Prisma.InputJsonValue;
  if (body.transferDenominations !== undefined)
    data.transferDenominations = body.transferDenominations as unknown as Prisma.InputJsonValue;

  const updated = await prisma.shift.update({ where: { id: req.params.id }, data });
  await auditService.record({ ...actor, action: 'UPDATE', resource: 'Shift', resourceId: shift.id, changes: body });
  res.json(updated);
}));

router.put('/:id/transfer-denominations', validate('params', IdParam), validate('body', TransferDenomBody), asyncHandler(async (req, res) => {
  const actor = actorContextFromRequest(req);
  const shift = await prisma.shift.findUnique({ where: { id: req.params.id } });
  if (!shift) return res.status(404).json({ message: 'Not found' });
  const body = req.body as z.infer<typeof TransferDenomBody>;
  const total = body.transferDenominations.reduce((s, d) => s + Number(d.amount || 0), 0);
  const updated = await prisma.shift.update({
    where: { id: req.params.id },
    data: {
      transferDenominations: body.transferDenominations as unknown as Prisma.InputJsonValue,
      transferAmount: body.transferAmount ?? total,
    },
  });
  await auditService.record({ ...actor, action: 'UPDATE', resource: 'Shift.TransferDenominations', resourceId: shift.id, changes: body });
  res.json(updated);
}));

router.post('/:id/close', validate('params', IdParam), validate('body', Close), asyncHandler(async (req, res) => {
  const actor = actorContextFromRequest(req);
  const shift = await prisma.shift.findUnique({ where: { id: req.params.id } });
  if (!shift) return res.status(404).json({ message: 'Not found' });
  if (shift.status !== 'OPEN') return res.status(422).json({ message: 'Shift is not OPEN' });

  const body = req.body as z.infer<typeof Close>;
  const updated = await prisma.shift.update({
    where: { id: req.params.id },
    data: {
      status: 'CLOSED',
      closedAt: new Date(),
      closedById: actor.actorId ?? 'system',
      closedBySnapshot: body.closedBySnapshot,
      transferAmount: body.transferAmount,
      closingAmount: body.closingAmount,
      remarks: body.remarks ?? shift.remarks,
      nextShiftUserId: body.nextShiftUserId ?? shift.nextShiftUserId,
      ...(body.closingDenominations !== undefined
        ? { closingDenominations: body.closingDenominations as unknown as Prisma.InputJsonValue }
        : {}),
      ...(body.transferDenominations !== undefined
        ? { transferDenominations: body.transferDenominations as unknown as Prisma.InputJsonValue }
        : {}),
    },
  });
  await auditService.record({ ...actor, action: 'CLOSE', resource: 'Shift', resourceId: shift.id, changes: body });
  res.json(updated);
}));

export const shiftRouter = router;
