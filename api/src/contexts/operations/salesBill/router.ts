import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../infra/db.js';
import { Errors } from '../../../infra/errors.js';
import { asyncHandler, validate } from '../../../infra/validation.js';
import { requireAuth, requirePermissions } from '../../iam/auth.middleware.js';
import { Permissions } from '../../iam/permissions.js';
import { auditService } from '../../audit/audit.service.js';
import { actorContextFromRequest } from '../../masters/_common.js';
import {
  nextValue,
  salesBillScope,
  formatSalesBillNo,
} from '../_counters.js';

/**
 * Sales bill (Tax Invoice / Non-GST) — SRS §3.3.2.
 *
 * Primary path: convert an OPEN token by capturing the gross weight; the bill
 * inherits empty weight, customer, item, vehicle, driver from the token. Rate
 * is resolved from CustomerItemRate (active + valid window) with fallback to
 * Item.sellingPrice. GST split is CGST+SGST for intra-state, IGST for
 * inter-state — admin will key the split via percentage fields. Bill is
 * POSTED on creation. Cancelling a bill releases the token back to OPEN.
 */

const D = (v: number | string | Prisma.Decimal) => new Prisma.Decimal(v);
const round2 = (d: Prisma.Decimal) => d.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
const DEFAULT_HIGH_VALUE_CONFIRMATION_LIMIT = 750000;

async function getHighValueConfirmationLimit(db: Prisma.TransactionClient) {
  const raw = await db.systemSetting.findUnique({
    where: { key: 'billing.highValueConfirmationLimit' },
    select: { value: true },
  });
  const parsed = Number(raw?.value ?? DEFAULT_HIGH_VALUE_CONFIRMATION_LIMIT);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_HIGH_VALUE_CONFIRMATION_LIMIT;
}

// Manual override for rate / GST is allowed; otherwise the server resolves them.
const DenomRow = z.object({
  denomination: z.coerce.number().int().min(1),
  nos: z.coerce.number().int().min(0),
  amount: z.coerce.number().min(0),
});

const FromToken = z.object({
  // grossWeight may be omitted when directAmount is used.
  grossWeight: z.coerce.number().positive().max(99999999).optional(),
  // Direct amount entry path (#24): when set, we skip weight×rate calc and
  // back-calculate the taxable amount from this value (GST exclusive).
  directAmount: z.coerce.number().positive().max(9_999_999_999).optional(),
  // Override of bill type at the bill level (#2 / #9).
  billTypeOverride: z.enum(['TAX_INVOICE', 'NON_GST', 'WEIGHT_SLIP']).optional(),
  // Capture-reason for high-value bills (#5).
  confirmationReason: z.string().trim().max(500).optional(),
  placeOfSupply: z.string().trim().max(160).optional(),
  billToAddress: z.string().trim().max(500).optional(),
  shipToAddress: z.string().trim().max(500).optional(),
  rateOverride: z.coerce.number().nonnegative().optional(),
  cgstPercent: z.coerce.number().min(0).max(50).optional(),
  sgstPercent: z.coerce.number().min(0).max(50).optional(),
  igstPercent: z.coerce.number().min(0).max(50).optional(),
  tcsPercent: z.coerce.number().min(0).max(10).optional(),
  paymentMode: z.enum(['CASH', 'ONLINE', 'CREDIT', 'MIXED']).default('CREDIT'),
  cashAmount: z.coerce.number().min(0).default(0),
  onlineAmount: z.coerce.number().min(0).default(0),
  // #23: credit may be negative to represent a debit adjustment.
  creditAmount: z.coerce.number().default(0),
  denominations: z.array(DenomRow).default([]),
  paymentDeferralOption: z.enum(['PAY_NOW', 'PAY_NEXT_BILL']).optional(),
  remainingBalance: z.coerce.number().min(0).optional(),
  remarks: z.string().trim().max(500).optional().nullable(),
});

const ListQuery = z.object({
  customerId: z.string().min(1).optional(),
  itemId: z.string().min(1).optional(),
  status: z.enum(['DRAFT', 'POSTED', 'CANCELLED']).optional(),
  search: z.string().trim().min(1).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

const Cancel = z.object({
  cancelledReason: z.string().trim().min(3).max(500),
});

const IdParam = z.object({ id: z.string().min(1) });
const TokenIdParam = z.object({ tokenId: z.string().min(1) });

const billInclude = {
  customer: { select: { id: true, code: true, name: true, billType: true, gstNumber: true, address: true, paymentDueDays: true } },
  item: { select: { id: true, code: true, name: true, hsnCode: true } },
  token: {
    select: {
      id: true,
      tokenNo: true,
      entryNo: true,
      tokenDateTime: true,
      anprImageRef: true,
      anprNumberPlateText: true,
      loadImageRef: true,
    },
  },
} as const;

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  requirePermissions(Permissions.SALES_BILL_VIEW),
  validate('query', ListQuery),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as z.infer<typeof ListQuery>;
    const where: Prisma.SalesBillWhereInput = {
      ...(q.customerId ? { customerId: q.customerId } : {}),
      ...(q.itemId ? { itemId: q.itemId } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.dateFrom || q.dateTo
        ? {
            billDate: {
              ...(q.dateFrom ? { gte: q.dateFrom } : {}),
              ...(q.dateTo ? { lte: q.dateTo } : {}),
            },
          }
        : {}),
      ...(q.search
        ? {
            OR: [
              { billNo: { contains: q.search, mode: 'insensitive' } },
              { vehicleNo: { contains: q.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.salesBill.findMany({
        where,
        orderBy: { billDate: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: billInclude,
      }),
      prisma.salesBill.count({ where }),
    ]);
    res.json({ items, page: q.page, pageSize: q.pageSize, total });
  }),
);

router.get(
  '/:id',
  requirePermissions(Permissions.SALES_BILL_VIEW),
  validate('params', IdParam),
  asyncHandler(async (req, res) => {
    const { id } = req.params as { id: string };
    const bill = await prisma.salesBill.findUnique({ where: { id }, include: billInclude });
    if (!bill) throw Errors.notFound(`Sales bill ${id} not found`);
    res.json(bill);
  }),
);

/**
 * Resolve the rate for (customer, item) on a given date by picking the
 * active CustomerItemRate whose validity window covers the date. Falls
 * back to Item.sellingPrice if no override is configured.
 */
async function resolveRate(
  tx: Prisma.TransactionClient,
  customerId: string,
  itemId: string,
  on: Date,
  fallback: Prisma.Decimal,
): Promise<Prisma.Decimal> {
  const overrides = await tx.customerItemRate.findMany({
    where: {
      customerId,
      itemId,
      isActive: true,
      AND: [
        { OR: [{ validFrom: null }, { validFrom: { lte: on } }] },
        { OR: [{ validTo: null }, { validTo: { gte: on } }] },
      ],
    },
    orderBy: [{ validFrom: 'desc' }, { updatedAt: 'desc' }],
    take: 1,
  });
  return overrides[0]?.rate ?? fallback;
}

router.post(
  '/from-token/:tokenId',
  requirePermissions(Permissions.SALES_BILL_CREATE),
  validate('params', TokenIdParam),
  validate('body', FromToken),
  asyncHandler(async (req, res) => {
    const ctx = actorContextFromRequest(req);
    const { tokenId } = req.params as { tokenId: string };
    const body = req.body as z.infer<typeof FromToken>;

    const created = await prisma.$transaction(async (tx) => {
      const token = await tx.token.findUnique({
        where: { id: tokenId },
        include: { customer: true, item: true, bill: true },
      });
      if (!token) throw Errors.notFound(`Token ${tokenId} not found`);
      if (token.status !== 'OPEN') {
        throw Errors.badRequest(`Token is ${token.status} and cannot be billed`);
      }
      // Ignore cancelled bills — the token has effectively been released.
      if (token.bill && token.bill.status !== 'CANCELLED') {
        throw Errors.conflict('Token already has a bill');
      }

      const empty = D(token.emptyWeight);
      // Resolve the effective bill type for this transaction:
      //   override (per-bill) > customer default.
      const effectiveBillType = body.billTypeOverride ?? token.customer.billType;
      const isNonGst = effectiveBillType !== 'TAX_INVOICE';
      const isWeightSlip = effectiveBillType === 'WEIGHT_SLIP';

      // Compute weights & taxable amount. Two entry paths:
      //   (a) directAmount  -> taxable comes straight from the user.
      //   (b) grossWeight   -> classic weight × rate calculation.
      let gross: Prisma.Decimal;
      let net: Prisma.Decimal;
      let rate: Prisma.Decimal;
      let taxable: Prisma.Decimal;
      const billDate = new Date();

      if (body.directAmount !== undefined) {
        if (!body.grossWeight) {
          // For direct-amount bills we still want a sensible weight record.
          gross = empty;
          net = D(0);
        } else {
          gross = D(body.grossWeight);
          if (gross.lessThanOrEqualTo(empty)) {
            throw Errors.badRequest('Gross weight must exceed empty weight');
          }
          const netKgActual = gross.minus(empty);
          const netKg = isNonGst && !isWeightSlip ? netKgActual.dividedBy(2) : netKgActual;
          net = round2(netKg.dividedBy(1000));
        }
        taxable = round2(D(body.directAmount));
        // Synthesize a per-ton rate for record-keeping when net > 0.
        rate = net.greaterThan(0) ? round2(taxable.dividedBy(net)) : D(0);
      } else {
        if (body.grossWeight === undefined) {
          throw Errors.badRequest('grossWeight is required when directAmount is not provided');
        }
        gross = D(body.grossWeight);
        if (gross.lessThanOrEqualTo(empty)) {
          throw Errors.badRequest('Gross weight must exceed empty weight');
        }
        const netKgActual = gross.minus(empty);
        // Non-GST (Estimate) customers historically billed for half quantity.
        // WEIGHT_SLIP is treated as a full-quantity, no-tax slip.
        const netKg = isNonGst && !isWeightSlip ? netKgActual.dividedBy(2) : netKgActual;
        net = round2(netKg.dividedBy(1000));
        rate = body.rateOverride !== undefined
          ? D(body.rateOverride)
          : await resolveRate(tx, token.customerId, token.itemId, billDate, D(token.item.sellingPrice));
        taxable = round2(net.times(rate));
      }

      const itemGst = D(token.item.gstPercent);
      let cgstP: Prisma.Decimal;
      let sgstP: Prisma.Decimal;
      let igstP: Prisma.Decimal;
      if (isWeightSlip) {
        // Weight slip never carries GST.
        cgstP = D(0);
        sgstP = D(0);
        igstP = D(0);
      } else if (
        body.cgstPercent !== undefined ||
        body.sgstPercent !== undefined ||
        body.igstPercent !== undefined
      ) {
        cgstP = D(body.cgstPercent ?? 0);
        sgstP = D(body.sgstPercent ?? 0);
        igstP = D(body.igstPercent ?? 0);
      } else if (!isNonGst) {
        // Auto-detect intra/inter-state split from GSTIN state codes.
        const company = await tx.companyProfile.findUnique({
          where: { id: 'singleton' },
          select: { gstin: true },
        });
        const companyStateCode = company?.gstin?.slice(0, 2) ?? '';
        const customerStateCode = token.customer.gstNumber?.slice(0, 2) ?? '';
        const isInterState =
          companyStateCode.length === 2 &&
          customerStateCode.length === 2 &&
          companyStateCode !== customerStateCode;

        if (isInterState) {
          cgstP = D(0);
          sgstP = D(0);
          igstP = itemGst;
        } else {
          const half = itemGst.dividedBy(2);
          cgstP = half;
          sgstP = half;
          igstP = D(0);
        }
      } else {
        // Non-GST customer: bill is on half quantity/amount, but GST is still
        // computed on that halved taxable amount so the recorded total is
        // accurate. UI prints/displays 0% GST for these customers.
        const half = itemGst.dividedBy(2);
        cgstP = half;
        sgstP = half;
        igstP = D(0);
      }

      const cgstAmt = round2(taxable.times(cgstP).dividedBy(100));
      const sgstAmt = round2(taxable.times(sgstP).dividedBy(100));
      const igstAmt = round2(taxable.times(igstP).dividedBy(100));
      const tcsP = isWeightSlip
        ? D(0)
        : D(body.tcsPercent ?? (token.customer.tcsApplicable ? 0.1 : 0));
      const tcsAmt = round2(taxable.plus(cgstAmt).plus(sgstAmt).plus(igstAmt).times(tcsP).dividedBy(100));

      const subtotal = taxable.plus(cgstAmt).plus(sgstAmt).plus(igstAmt).plus(tcsAmt);
      const rounded = subtotal.toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
      const roundOff = rounded.minus(subtotal);
      const total = rounded;

      // Payment validation
      const priorBalance = D(token.customer.remainingBalance ?? 0);
      const paymentDeferralOption = body.paymentDeferralOption ?? 'PAY_NOW';
      const appliedAdvanceToCurrentBill = paymentDeferralOption === 'PAY_NOW' && priorBalance.lessThan(0)
        ? Prisma.Decimal.min(priorBalance.negated(), total)
        : D(0);

      const cash = D(body.cashAmount);
      const online = D(body.onlineAmount);
      // #23: credit may be negative — don't coerce to positive.
      const credit = D(body.creditAmount);
      const paySum = cash.plus(online).plus(credit);
      if (body.paymentMode === 'CASH' && !cash.equals(total)) {
        // tolerate caller passing zero — auto-fill cash for CASH mode
        if (paySum.equals(0)) {
          // ok, will normalise below
        }
      }
      // Normalise payments by mode if caller left them at zero
      let normCash = cash;
      let normOnline = online;
      let normCredit = credit;
      if (paySum.equals(0) && body.remainingBalance === undefined && !(paymentDeferralOption === 'PAY_NOW' && !priorBalance.equals(0))) {
        if (body.paymentMode === 'CASH') normCash = total;
        else if (body.paymentMode === 'ONLINE') normOnline = total;
        else if (body.paymentMode === 'CREDIT') normCredit = total;
      }

      const receivedTotal = normCash.plus(normOnline).plus(normCredit);
      const billExposure = total.minus(appliedAdvanceToCurrentBill).greaterThan(0)
        ? round2(total.minus(appliedAdvanceToCurrentBill))
        : D(0);
      const computedRemaining = receivedTotal.lessThan(billExposure)
        ? round2(billExposure.minus(receivedTotal))
        : D(0);
      const requestedRemaining = body.remainingBalance !== undefined
        ? round2(D(body.remainingBalance))
        : computedRemaining;
      const remainingForBill = requestedRemaining.greaterThan(0) ? requestedRemaining : D(0);

      const highValueConfirmationLimit = await getHighValueConfirmationLimit(tx);
      const confirmationAmount = paymentDeferralOption === 'PAY_NOW'
        ? round2(total.plus(priorBalance))
        : total;
      const normalizedConfirmationAmount = confirmationAmount.greaterThan(0)
        ? confirmationAmount.toNumber()
        : 0;
      if (normalizedConfirmationAmount > highValueConfirmationLimit && !body.confirmationReason?.trim()) {
        throw Errors.badRequest('Confirmation reason is required when payment amount exceeds the configured limit');
      }

      const overflowAfterCurrentBill = receivedTotal.greaterThan(total)
        ? round2(receivedTotal.minus(total))
        : D(0);

      const seq = await nextValue(tx, salesBillScope(billDate));
      const billNo = formatSalesBillNo(seq, billDate);

      const bill = await tx.salesBill.create({
        data: {
          billNo,
          billDate,
          tokenId: token.id,
          customerId: token.customerId,
          itemId: token.itemId,
          vehicleNo: token.vehicleNo,
          driverName: token.driverName,
          driverMobile: token.driverMobile,
          emptyWeight: empty,
          grossWeight: gross,
          netWeight: net,
          rate,
          taxableAmount: taxable,
          cgstPercent: cgstP,
          sgstPercent: sgstP,
          igstPercent: igstP,
          cgstAmount: cgstAmt,
          sgstAmount: sgstAmt,
          igstAmount: igstAmt,
          tcsPercent: tcsP,
          tcsAmount: tcsAmt,
          roundOff,
          totalAmount: total,
          paymentMode: body.paymentMode,
          cashAmount: normCash,
          onlineAmount: normOnline,
          creditAmount: normCredit,
          denominations: (body.denominations ?? []) as unknown as Prisma.InputJsonValue,
          paymentDeferralOption,
          remainingBalance: remainingForBill,
          remarks: body.remarks ?? null,
          billTypeOverride: body.billTypeOverride ?? null,
          confirmationReason: body.confirmationReason ?? null,
          directAmount: body.directAmount !== undefined ? D(body.directAmount) : null,
          placeOfSupply: body.placeOfSupply ?? null,
          billToAddress: body.billToAddress ?? null,
          shipToAddress: body.shipToAddress ?? null,
          status: 'POSTED',
          createdById: ctx.actorId,
        },
        include: billInclude,
      });

      await tx.token.update({
        where: { id: token.id },
        data: { status: 'BILLED', updatedById: ctx.actorId },
      });

      const nextPending = round2(priorBalance.plus(total).minus(receivedTotal));

      await tx.customer.update({
        where: { id: token.customerId },
        data: { remainingBalance: nextPending },
      });

      return bill;
    });

    await auditService.record({
      ...ctx,
      action: 'CREATE',
      resource: 'operations.sales_bill',
      resourceId: created.id,
      changes: {
        billNo: created.billNo,
        tokenId: created.tokenId,
        customerId: created.customerId,
        itemId: created.itemId,
        netWeight: created.netWeight.toString(),
        totalAmount: created.totalAmount.toString(),
      },
    });
    res.status(201).json(created);
  }),
);

router.post(
  '/:id/cancel',
  requirePermissions(Permissions.SALES_BILL_EDIT),
  validate('params', IdParam),
  validate('body', Cancel),
  asyncHandler(async (req, res) => {
    const ctx = actorContextFromRequest(req);
    const { id } = req.params as { id: string };
    const body = req.body as z.infer<typeof Cancel>;
    const updated = await prisma.$transaction(async (tx) => {
      const before = await tx.salesBill.findUnique({ where: { id } });
      if (!before) throw Errors.notFound(`Sales bill ${id} not found`);
      if (before.status === 'CANCELLED') throw Errors.badRequest('Bill is already cancelled');

      const bill = await tx.salesBill.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledReason: body.cancelledReason,
          // Detach the token so a new bill can be created against it.
          // The tokenId is unique on SalesBill, so leaving it set would
          // block re-billing on the released token.
          tokenId: null,
          updatedById: ctx.actorId,
        },
        include: billInclude,
      });
      // Release the token so the customer can be re-billed if needed.
      if (before.tokenId) {
        await tx.token.update({
          where: { id: before.tokenId },
          data: { status: 'OPEN', updatedById: ctx.actorId },
        });
      }
      return bill;
    });
    await auditService.record({
      ...ctx,
      action: 'CANCEL',
      resource: 'operations.sales_bill',
      resourceId: id,
      changes: { cancelledReason: body.cancelledReason },
    });
    res.json(updated);
  }),
);

export const salesBillRouter = router;
