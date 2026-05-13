import { Router } from 'express';
import ExcelJS from 'exceljs';
import { z } from 'zod';
import { prisma } from '../../../infra/db.js';
import { asyncHandler, validate } from '../../../infra/validation.js';
import { requireAuth } from '../../iam/auth.middleware.js';

const IdParam = z.object({ id: z.string().min(1) });

const router = Router();
router.use(requireAuth);

const fmtMoney = (n: unknown) =>
  Number(n ?? 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtDate = (d: Date | string | null | undefined) => {
  if (!d) return '';
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } } as const;
const SECTION_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } } as const;
const TOTAL_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } } as const;

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    c.fill = HEADER_FILL;
    c.border = { bottom: { style: 'thin', color: { argb: 'FF1E40AF' } } };
  });
  row.height = 22;
}

function styleSectionRow(row: ExcelJS.Row) {
  row.eachCell((c) => {
    c.font = { bold: true, size: 12, color: { argb: 'FF1E3A8A' } };
    c.fill = SECTION_FILL;
    c.alignment = { vertical: 'middle' };
  });
  row.height = 24;
}

function styleTotalRow(row: ExcelJS.Row) {
  row.eachCell((c) => {
    c.font = { bold: true, size: 11 };
    c.fill = TOTAL_FILL;
    c.border = { top: { style: 'thin' }, bottom: { style: 'double' } };
  });
}

function addBorder(row: ExcelJS.Row) {
  row.eachCell((c) => {
    c.border = {
      top: { style: 'hair', color: { argb: 'FFE5E7EB' } },
      bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } },
      left: { style: 'hair', color: { argb: 'FFE5E7EB' } },
      right: { style: 'hair', color: { argb: 'FFE5E7EB' } },
    };
  });
}

interface DenomRow {
  denomination: number;
  nos: number;
  amount: number;
}

function denomArr(v: unknown): DenomRow[] {
  if (!Array.isArray(v)) return [];
  return v.map((r) => ({
    denomination: Number((r as DenomRow).denomination) || 0,
    nos: Number((r as DenomRow).nos) || 0,
    amount: Number((r as DenomRow).amount) || 0,
  }));
}

const fmtDateOnly = (d: Date | string | null | undefined) => {
  if (!d) return '';
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
};

const fmtTimeOnly = (d: Date | string | null | undefined) => {
  if (!d) return '';
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
};

interface DetailRow {
  date: Date;
  entryNo: string;
  tokenNo?: string;
  vehicleNo: string;
  vehicleName: string;
  entryUser: string;
  itemName: string;
  qty: number;
  rate: number;
  taxable: number;
  gst: number;
  receiptMode: string;
  amount: number;
}

async function buildShiftWorkbook(shiftId: string): Promise<{
  workbook: ExcelJS.Workbook;
  filename: string;
} | null> {
  const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
  if (!shift) return null;

  const from = shift.openedAt;
  const to = shift.closedAt ?? new Date();
  const range = { gte: from, lte: to };

  // Floor docDate lower bound to IST midnight, same as the totals helper.
  const IST_OFFSET_MIN = 330;
  const istMs = from.getTime() + IST_OFFSET_MIN * 60_000;
  const istMidnightMs = Math.floor(istMs / 86_400_000) * 86_400_000;
  const fromDay = new Date(istMidnightMs - IST_OFFSET_MIN * 60_000);
  const voucherRange = { gte: fromDay, lte: to };

  const [
    salesBills,
    purchaseBills,
    receipts,
    payments,
    weightSlips,
    company,
    openedByUser,
    closedByUser,
    nextShiftUser,
  ] = await Promise.all([
    prisma.salesBill.findMany({
      where: { billDate: range },
      include: { customer: true, item: true, token: true },
      orderBy: { billDate: 'asc' },
    }),
    prisma.purchaseBill.findMany({
      where: { purchaseDateTime: range },
      orderBy: { purchaseDateTime: 'asc' },
    }),
    prisma.cashVoucher.findMany({
      where: { voucherType: 'RECEIPT', docDate: voucherRange },
      orderBy: { docDate: 'asc' },
    }),
    prisma.cashVoucher.findMany({
      where: { voucherType: 'PAYMENT', docDate: voucherRange },
      orderBy: { docDate: 'asc' },
    }),
    prisma.weightSlip.findMany({
      where: { capturedAt: range },
      orderBy: { capturedAt: 'asc' },
    }),
    prisma.companyProfile.findFirst().catch(() => null),
    prisma.user.findUnique({ where: { id: shift.openedById } }).catch(() => null),
    shift.closedById
      ? prisma.user.findUnique({ where: { id: shift.closedById } }).catch(() => null)
      : Promise.resolve(null),
    shift.nextShiftUserId
      ? prisma.user.findUnique({ where: { id: shift.nextShiftUserId } }).catch(() => null)
      : Promise.resolve(null),
  ]);

  const postedSales = salesBills.filter((b) => b.status === 'POSTED');
  const postedPurchase = purchaseBills.filter((b) => b.status === 'POSTED');
  const liveReceipts = receipts.filter((v) => v.status !== 'CANCELLED');
  const livePayments = payments.filter((v) => v.status !== 'CANCELLED');

  const gstOf = (b: (typeof postedSales)[number]) =>
    Number(b.cgstAmount ?? 0) + Number(b.sgstAmount ?? 0) + Number(b.igstAmount ?? 0);
  const receiptModeOf = (b: (typeof postedSales)[number]) => {
    if (b.paymentMode === 'MIXED') return 'Mixed';
    return b.paymentMode.charAt(0) + b.paymentMode.slice(1).toLowerCase();
  };

  const invoiceBills = postedSales.filter(
    (b) =>
      b.billTypeOverride === 'TAX_INVOICE' ||
      Number(b.cgstAmount ?? 0) + Number(b.sgstAmount ?? 0) + Number(b.igstAmount ?? 0) > 0,
  );
  const cashBills = postedSales.filter((b) => !invoiceBills.includes(b));

  const totalDriverBata = postedSales.reduce((s, b) => s + Number(b.driverBata ?? 0), 0);
  const totalPurchaseDriverBata = postedPurchase.reduce(
    (s, b) => s + Number(b.driverBata ?? 0),
    0,
  );
  const billingTotal = postedSales.reduce((s, b) => s + Number(b.cashAmount ?? 0), 0);
  const invoiceTotal = postedSales.reduce((s, b) => s + Number(b.totalAmount ?? 0), 0);
  const receiptTotal = liveReceipts.reduce((s, v) => s + Number(v.totalAmount ?? 0), 0);
  const paymentTotal = livePayments.reduce((s, v) => s + Number(v.totalAmount ?? 0), 0);
  const purchaseTotal = postedPurchase
    .filter((b) => b.paymentMode === 'CASH')
    .reduce((s, b) => s + Number(b.grossPayable ?? 0), 0);
  const weightSlipTotal = weightSlips.length;
  const totalCashReceived =
    Number(shift.openingAmount ?? 0) + billingTotal + receiptTotal;
  const netAmount = totalCashReceived - paymentTotal - purchaseTotal;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ASK Blue Metal';
  workbook.created = new Date();

  const userName = (u: typeof openedByUser) =>
    u ? [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.username : '';

  // ─── Single-sheet PDF-style layout ────────────────────────────────────────
  const ws = workbook.addWorksheet('Shift Closing', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    },
  });
  // 14 working columns A..N
  const COL_COUNT = 14;
  ws.columns = Array.from({ length: COL_COUNT }, (_, i) => ({
    key: `c${i + 1}`,
    width: i === 0 ? 6 : 12,
  }));

  let r = 1;

  // Company header line
  const companyLine = company
    ? [company.name, company.address, company.phone ? `Ph: ${company.phone}` : '']
        .filter(Boolean)
        .join(', ')
    : 'Ask M Sand No:48,Thollamur Village & Post,Villupuram District,Ph: 9952277580';
  ws.getCell(`A${r}`).value = companyLine;
  ws.mergeCells(`A${r}:N${r}`);
  ws.getRow(r).font = { bold: true, size: 11 };
  ws.getRow(r).alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(r).height = 20;
  r++;

  // Title row
  ws.getCell(`A${r}`).value = 'SHIFT CLOSING DETAILS';
  ws.mergeCells(`A${r}:N${r}`);
  ws.getRow(r).font = { bold: true, size: 14, color: { argb: 'FF1E3A8A' } };
  ws.getRow(r).alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(r).fill = SECTION_FILL;
  ws.getRow(r).height = 26;
  r++;
  r++; // blank

  // Two-column key/value header info (cols A-D label/value, H-K label/value)
  const setKV = (row: number, leftLabel: string, leftValue: string | number, rightLabel: string, rightValue: string | number) => {
    ws.getCell(`A${row}`).value = leftLabel;
    ws.getCell(`A${row}`).font = { bold: true, color: { argb: 'FF334155' } };
    ws.mergeCells(`A${row}:C${row}`);
    ws.getCell(`D${row}`).value = leftValue;
    ws.mergeCells(`D${row}:G${row}`);
    ws.getCell(`H${row}`).value = rightLabel;
    ws.getCell(`H${row}`).font = { bold: true, color: { argb: 'FF334155' } };
    ws.mergeCells(`H${row}:J${row}`);
    ws.getCell(`K${row}`).value = rightValue;
    ws.mergeCells(`K${row}:N${row}`);
    ws.getCell(`K${row}`).alignment = { horizontal: 'right' };
    ws.getCell(`D${row}`).alignment = { horizontal: 'left' };
  };

  setKV(r, 'Closing No', shift.shiftNo, 'Weight Slip Total', weightSlipTotal); r++;
  setKV(r, 'Date', fmtDateOnly(shift.shiftDate), 'Billing Total', fmtMoney(billingTotal)); r++;
  setKV(r, 'Time', fmtTimeOnly(shift.closedAt), 'Cash Receipt Total', fmtMoney(receiptTotal)); r++;
  setKV(r, 'Closed By', shift.closedBySnapshot ?? userName(closedByUser), 'Cash In Hand', fmtMoney(shift.cashInHand)); r++;
  setKV(r, 'Next Shift By', userName(nextShiftUser), 'Cash Payment Total', fmtMoney(paymentTotal)); r++;
  setKV(r, 'Shift Open Date', fmtDateOnly(shift.openedAt), 'Opening Amount', fmtMoney(shift.openingAmount)); r++;
  setKV(r, 'Shift Open Time', fmtTimeOnly(shift.openedAt), 'Total Cash Received', fmtMoney(totalCashReceived)); r++;
  setKV(r, 'Opened By', shift.openedBySnapshot, 'Net Amount', fmtMoney(netAmount)); r++;
  setKV(r, 'Purchase Total', fmtMoney(purchaseTotal), 'Total Bata Paid', fmtMoney(totalDriverBata)); r++;
  setKV(r, 'Invoice Total', fmtMoney(invoiceTotal), 'Total Cash Sale', fmtMoney(billingTotal)); r++;
  setKV(r, 'Next Shift Transfer Total', fmtMoney(shift.transferAmount), 'Bill Sundry Bata Entry', fmtMoney(totalPurchaseDriverBata)); r++;
  r++; // blank

  // ─── Denomination tables (3 side-by-side) ────────────────────────────────
  const closingDenom = denomArr(shift.closingDenominations);
  const transferDenom = denomArr(shift.transferDenominations);
  const denomByValue = (rows: DenomRow[]) => {
    const m = new Map<number, DenomRow>();
    rows.forEach((d) => m.set(d.denomination, d));
    return m;
  };
  const closeMap = denomByValue(closingDenom);
  const transferMap = denomByValue(transferDenom);
  const allDenoms = Array.from(
    new Set([...closeMap.keys(), ...transferMap.keys()]),
  ).sort((a, b) => b - a);
  const balanceRows: DenomRow[] = allDenoms.map((d) => {
    const c = closeMap.get(d)?.nos ?? 0;
    const t = transferMap.get(d)?.nos ?? 0;
    const nos = c - t;
    return { denomination: d, nos, amount: nos * d };
  });

  const denomTables: Array<{ title: string; rows: DenomRow[]; startCol: string; endCol: string }> = [
    { title: 'Closing Denomination', rows: closingDenom, startCol: 'A', endCol: 'D' },
    { title: 'Next Shift Opening Denominations', rows: transferDenom, startCol: 'F', endCol: 'I' },
    { title: 'Shift Balance Denominations', rows: balanceRows, startCol: 'K', endCol: 'N' },
  ];
  // Section title row spanning each block
  const denomTitleRow = r;
  for (const t of denomTables) {
    const cell = ws.getCell(`${t.startCol}${denomTitleRow}`);
    cell.value = t.title;
    ws.mergeCells(`${t.startCol}${denomTitleRow}:${t.endCol}${denomTitleRow}`);
    cell.font = { bold: true, color: { argb: 'FF1E3A8A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = SECTION_FILL;
  }
  ws.getRow(denomTitleRow).height = 20;
  r++;
  // Header row
  const denomHeaderRow = r;
  for (const t of denomTables) {
    const cols = [t.startCol, String.fromCharCode(t.startCol.charCodeAt(0) + 1), String.fromCharCode(t.startCol.charCodeAt(0) + 2), t.endCol];
    ws.getCell(`${cols[0]}${denomHeaderRow}`).value = 'Denomination';
    ws.mergeCells(`${cols[0]}${denomHeaderRow}:${cols[1]}${denomHeaderRow}`);
    ws.getCell(`${cols[2]}${denomHeaderRow}`).value = 'Nos';
    ws.getCell(`${cols[3]}${denomHeaderRow}`).value = 'Amount';
  }
  ws.getRow(denomHeaderRow).eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = HEADER_FILL;
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });
  r++;
  const maxDenomRows = Math.max(...denomTables.map((t) => t.rows.length), 1);
  for (let i = 0; i < maxDenomRows; i++) {
    for (const t of denomTables) {
      const cols = [t.startCol, String.fromCharCode(t.startCol.charCodeAt(0) + 1), String.fromCharCode(t.startCol.charCodeAt(0) + 2), t.endCol];
      const d = t.rows[i];
      if (!d) {
        ws.getCell(`${cols[0]}${r}`).value = '';
        ws.mergeCells(`${cols[0]}${r}:${cols[1]}${r}`);
        ws.getCell(`${cols[2]}${r}`).value = '';
        ws.getCell(`${cols[3]}${r}`).value = '';
      } else {
        ws.getCell(`${cols[0]}${r}`).value = d.denomination;
        ws.mergeCells(`${cols[0]}${r}:${cols[1]}${r}`);
        ws.getCell(`${cols[2]}${r}`).value = d.nos;
        ws.getCell(`${cols[3]}${r}`).value = d.amount;
        ws.getCell(`${cols[3]}${r}`).numFmt = '#,##0.00';
      }
      [cols[0], cols[1], cols[2], cols[3]].forEach((c) => {
        ws.getCell(`${c}${r}`).border = {
          top: { style: 'hair', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } },
          left: { style: 'hair', color: { argb: 'FFE5E7EB' } },
          right: { style: 'hair', color: { argb: 'FFE5E7EB' } },
        };
        ws.getCell(`${c}${r}`).alignment = { horizontal: 'center' };
      });
    }
    r++;
  }
  // Totals row
  for (const t of denomTables) {
    const cols = [t.startCol, String.fromCharCode(t.startCol.charCodeAt(0) + 1), String.fromCharCode(t.startCol.charCodeAt(0) + 2), t.endCol];
    ws.getCell(`${cols[0]}${r}`).value = 'Total';
    ws.mergeCells(`${cols[0]}${r}:${cols[1]}${r}`);
    ws.getCell(`${cols[2]}${r}`).value = t.rows.reduce((s, d) => s + d.nos, 0);
    ws.getCell(`${cols[3]}${r}`).value = t.rows.reduce((s, d) => s + d.amount, 0);
    ws.getCell(`${cols[3]}${r}`).numFmt = '#,##0.00';
  }
  styleTotalRow(ws.getRow(r));
  r++;
  r++; // blank

  // ─── Helper: render a labelled detail section ────────────────────────────
  const detailHeaders = [
    'Sl No', 'Date', 'Time', 'Entry No', 'Vehicle No', 'Vehicle Name',
    'Entry User', 'Item Name', 'Qty', 'Rate', 'Taxable', 'GST Amt', 'Receipt Mode', 'Amount',
  ];

  const renderSection = (title: string, rows: DetailRow[]) => {
    // Section title
    ws.getCell(`A${r}`).value = title;
    ws.mergeCells(`A${r}:N${r}`);
    styleSectionRow(ws.getRow(r));
    ws.getRow(r).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    r++;

    // Header row
    detailHeaders.forEach((h, i) => {
      const col = String.fromCharCode('A'.charCodeAt(0) + i);
      ws.getCell(`${col}${r}`).value = h;
    });
    styleHeaderRow(ws.getRow(r));
    r++;

    if (rows.length === 0) {
      ws.getCell(`A${r}`).value = 'No records';
      ws.mergeCells(`A${r}:N${r}`);
      ws.getRow(r).alignment = { horizontal: 'center' };
      ws.getRow(r).font = { italic: true, color: { argb: 'FF94A3B8' } };
      r++;
    } else {
      rows.forEach((row, idx) => {
        const values = [
          idx + 1,
          fmtDateOnly(row.date),
          fmtTimeOnly(row.date),
          row.entryNo,
          row.vehicleNo,
          row.vehicleName,
          row.entryUser,
          row.itemName,
          row.qty || '',
          row.rate || '',
          row.taxable || '',
          row.gst || '',
          row.receiptMode,
          row.amount || '',
        ];
        values.forEach((v, i) => {
          const col = String.fromCharCode('A'.charCodeAt(0) + i);
          ws.getCell(`${col}${r}`).value = v as ExcelJS.CellValue;
          if (i >= 8 && i <= 11) ws.getCell(`${col}${r}`).numFmt = '#,##0.00';
          if (i === 13) ws.getCell(`${col}${r}`).numFmt = '#,##0.00';
        });
        addBorder(ws.getRow(r));
        r++;
      });
      // Total row
      const totals = {
        qty: rows.reduce((s, x) => s + x.qty, 0),
        taxable: rows.reduce((s, x) => s + x.taxable, 0),
        gst: rows.reduce((s, x) => s + x.gst, 0),
        amount: rows.reduce((s, x) => s + x.amount, 0),
      };
      ws.getCell(`A${r}`).value = 'TOTAL';
      ws.mergeCells(`A${r}:H${r}`);
      ws.getCell(`I${r}`).value = totals.qty;
      ws.getCell(`K${r}`).value = totals.taxable;
      ws.getCell(`L${r}`).value = totals.gst;
      ws.getCell(`N${r}`).value = totals.amount;
      ['I', 'K', 'L', 'N'].forEach((c) => (ws.getCell(`${c}${r}`).numFmt = '#,##0.00'));
      styleTotalRow(ws.getRow(r));
      r++;
    }
    r++; // blank
  };

  // Build rows
  const weightSlipRows: DetailRow[] = weightSlips.map((w) => ({
    date: w.capturedAt,
    entryNo: w.slipNo,
    vehicleNo: w.vehicleNo ?? '',
    vehicleName: '',
    entryUser: '',
    itemName: '',
    qty: Number(w.weight ?? 0),
    rate: 0,
    taxable: 0,
    gst: 0,
    receiptMode: '',
    amount: 0,
  }));

  const billToDetail = (b: (typeof postedSales)[number]): DetailRow => ({
    date: b.billDate,
    entryNo: b.billNo,
    vehicleNo: b.vehicleNo,
    vehicleName: b.customer?.name ?? '',
    entryUser: '',
    itemName: b.item?.name ?? '',
    qty: Number(b.netWeight ?? 0),
    rate: Number(b.rate ?? 0),
    taxable: Number(b.taxableAmount ?? 0),
    gst: gstOf(b),
    receiptMode: receiptModeOf(b),
    amount: Number(b.totalAmount ?? 0),
  });

  renderSection('Weight Slip Details', weightSlipRows);
  renderSection('Invoice Details', invoiceBills.map(billToDetail));
  renderSection('Billing Details', cashBills.map(billToDetail));

  // Purchase details (slightly different mapping)
  const purchaseRows: DetailRow[] = postedPurchase.map((p) => ({
    date: p.purchaseDateTime,
    entryNo: p.purchaseNo,
    vehicleNo: p.vehicleNoSnapshot,
    vehicleName: p.supplierNameSnapshot,
    entryUser: '',
    itemName: p.itemNameSnapshot,
    qty: Number(p.netWeight ?? 0),
    rate: Number(p.rate ?? 0),
    taxable: Number(p.grossAmount ?? 0),
    gst: Number(p.gstAmount ?? 0),
    receiptMode: p.paymentMode.charAt(0) + p.paymentMode.slice(1).toLowerCase(),
    amount: Number(p.grossPayable ?? 0),
  }));
  renderSection('Purchase Details', purchaseRows);

  // ─── Driver Bata Payment Details (from sales bills with bata) ────────────
  const bataHeaders = [
    'Sl No', 'Date', 'Time', 'Entry No', 'Token No',
    'Vehicle No', 'Vehicle Name', 'Entry User', 'Entry Type', 'Bata Amount',
  ];
  const renderBataSection = (title: string, rows: Array<{
    date: Date;
    entryNo: string;
    tokenNo: string;
    vehicleNo: string;
    vehicleName: string;
    entryUser: string;
    entryType: string;
    bataAmount: number;
  }>) => {
    ws.getCell(`A${r}`).value = title;
    ws.mergeCells(`A${r}:N${r}`);
    styleSectionRow(ws.getRow(r));
    ws.getRow(r).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    r++;

    // header
    bataHeaders.forEach((h, i) => {
      const col = String.fromCharCode('A'.charCodeAt(0) + i);
      ws.getCell(`${col}${r}`).value = h;
    });
    // Merge "Bata Amount" header across J-N for alignment, optional. Keep simple: J header only, K-N blank
    styleHeaderRow(ws.getRow(r));
    r++;

    if (rows.length === 0) {
      ws.getCell(`A${r}`).value = 'No records';
      ws.mergeCells(`A${r}:N${r}`);
      ws.getRow(r).alignment = { horizontal: 'center' };
      ws.getRow(r).font = { italic: true, color: { argb: 'FF94A3B8' } };
      r++;
    } else {
      rows.forEach((row, idx) => {
        const vals = [
          idx + 1,
          fmtDateOnly(row.date),
          fmtTimeOnly(row.date),
          row.entryNo,
          row.tokenNo,
          row.vehicleNo,
          row.vehicleName,
          row.entryUser,
          row.entryType,
          row.bataAmount,
        ];
        vals.forEach((v, i) => {
          const col = String.fromCharCode('A'.charCodeAt(0) + i);
          ws.getCell(`${col}${r}`).value = v as ExcelJS.CellValue;
          if (i === 9) ws.getCell(`${col}${r}`).numFmt = '#,##0.00';
        });
        addBorder(ws.getRow(r));
        r++;
      });
      const total = rows.reduce((s, x) => s + x.bataAmount, 0);
      ws.getCell(`A${r}`).value = 'TOTAL';
      ws.mergeCells(`A${r}:I${r}`);
      ws.getCell(`J${r}`).value = total;
      ws.getCell(`J${r}`).numFmt = '#,##0.00';
      styleTotalRow(ws.getRow(r));
      r++;
    }
    r++;
  };

  const bataRows = postedSales
    .filter((b) => Number(b.driverBata ?? 0) > 0)
    .map((b) => ({
      date: b.billDate,
      entryNo: b.billNo,
      tokenNo: b.token?.tokenNo ?? '',
      vehicleNo: b.vehicleNo,
      vehicleName: b.customer?.name ?? '',
      entryUser: '',
      entryType: invoiceBills.includes(b) ? 'Invoice' : 'Billing',
      bataAmount: Number(b.driverBata ?? 0),
    }));

  renderBataSection('Driver Bata Payment Details', bataRows);
  const purchaseBataRows = postedPurchase
    .filter((b) => Number(b.driverBata ?? 0) > 0)
    .map((b) => ({
      date: b.purchaseDateTime,
      entryNo: b.purchaseNo,
      tokenNo: '',
      vehicleNo: b.vehicleNoSnapshot,
      vehicleName: b.supplierNameSnapshot,
      entryUser: '',
      entryType: 'Purchase',
      bataAmount: Number(b.driverBata ?? 0),
    }));
  renderBataSection('Driver Bata Payment Details (Bill Sundry)', purchaseBataRows);

  // ─── Receipts & Payments by Account ──────────────────────────────────────
  interface AccountLine {
    accountId?: string;
    accountHeadNameSnapshot?: string;
    amount?: number | string;
  }
  const aggByAccount = new Map<string, { receipts: number; payments: number }>();
  const accumulate = (
    list: Array<{ lines: unknown; totalAmount: unknown; status: string }>,
    bucket: 'receipts' | 'payments',
  ) => {
    for (const v of list) {
      if (v.status === 'CANCELLED') continue;
      const lines = Array.isArray(v.lines) ? (v.lines as AccountLine[]) : [];
      if (lines.length === 0) {
        const name = '(Unspecified)';
        const cur = aggByAccount.get(name) ?? { receipts: 0, payments: 0 };
        cur[bucket] += Number(v.totalAmount ?? 0);
        aggByAccount.set(name, cur);
      } else {
        for (const l of lines) {
          const name = l.accountHeadNameSnapshot || '(Unnamed Account)';
          const cur = aggByAccount.get(name) ?? { receipts: 0, payments: 0 };
          cur[bucket] += Number(l.amount ?? 0);
          aggByAccount.set(name, cur);
        }
      }
    }
  };
  accumulate(liveReceipts, 'receipts');
  accumulate(livePayments, 'payments');

  ws.getCell(`A${r}`).value = 'Receipts & Payments by Account';
  ws.mergeCells(`A${r}:N${r}`);
  styleSectionRow(ws.getRow(r));
  ws.getRow(r).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  r++;

  ws.getCell(`A${r}`).value = 'Account Name';
  ws.mergeCells(`A${r}:H${r}`);
  ws.getCell(`I${r}`).value = 'Receipts';
  ws.mergeCells(`I${r}:K${r}`);
  ws.getCell(`L${r}`).value = 'Payments';
  ws.mergeCells(`L${r}:N${r}`);
  styleHeaderRow(ws.getRow(r));
  r++;

  const accountEntries = Array.from(aggByAccount.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  if (accountEntries.length === 0) {
    ws.getCell(`A${r}`).value = 'No records';
    ws.mergeCells(`A${r}:N${r}`);
    ws.getRow(r).alignment = { horizontal: 'center' };
    ws.getRow(r).font = { italic: true, color: { argb: 'FF94A3B8' } };
    r++;
  } else {
    for (const [name, v] of accountEntries) {
      ws.getCell(`A${r}`).value = name;
      ws.mergeCells(`A${r}:H${r}`);
      ws.getCell(`I${r}`).value = v.receipts;
      ws.mergeCells(`I${r}:K${r}`);
      ws.getCell(`I${r}`).numFmt = '#,##0.00';
      ws.getCell(`L${r}`).value = v.payments;
      ws.mergeCells(`L${r}:N${r}`);
      ws.getCell(`L${r}`).numFmt = '#,##0.00';
      addBorder(ws.getRow(r));
      r++;
    }
    ws.getCell(`A${r}`).value = 'TOTAL';
    ws.mergeCells(`A${r}:H${r}`);
    ws.getCell(`I${r}`).value = accountEntries.reduce((s, [, v]) => s + v.receipts, 0);
    ws.mergeCells(`I${r}:K${r}`);
    ws.getCell(`I${r}`).numFmt = '#,##0.00';
    ws.getCell(`L${r}`).value = accountEntries.reduce((s, [, v]) => s + v.payments, 0);
    ws.mergeCells(`L${r}:N${r}`);
    ws.getCell(`L${r}`).numFmt = '#,##0.00';
    styleTotalRow(ws.getRow(r));
    r++;
  }

  const safeShiftNo = String(shift.shiftNo).replace(/[^a-zA-Z0-9-]/g, '_');
  const dateStr = new Date(shift.shiftDate).toISOString().slice(0, 10);
  const filename = `Shift_Report_${safeShiftNo}_${dateStr}.xlsx`;
  return { workbook, filename };
}

router.get(
  '/:id/report.xlsx',
  validate('params', IdParam),
  asyncHandler(async (req, res) => {
    const built = await buildShiftWorkbook(req.params.id);
    if (!built) return res.status(404).json({ message: 'Shift not found' });
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${built.filename}"`);
    await built.workbook.xlsx.write(res);
    res.end();
  }),
);

export const shiftReportRouter = router;
