// Shared 36-column "Sales Report" layout — mirrors the legacy printed register.
// Used by SalesRegister, SalesGSTCombined, SalesWithGSTFullQty,
// SalesWithoutGSTFullQty and SalesWithoutGSTHalfQty so every sales report
// shows the exact same column set (legacy parity).
import type { ReactNode } from 'react';
import type { SalesBillRow } from '../services/operationsApi';
import { inr, fmtDateISO, type ReportColumn } from './reportExport';

const fmtNum = (n: string | number) =>
  Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

/** Per-bill display amounts that may differ between reports (e.g. NON_GST halving). */
export interface SalesReport36Display {
  /** Quantity / net weight to display (Tonnes, 3 decimals possible). */
  netWeight: number;
  /** Taxable amount to display (₹). */
  taxable: number;
  /** Grand total to display (₹). */
  total: number;
  /** Cash collected (₹). */
  paid: number;
  /** Remaining / due balance after credit + paid (₹). */
  remaining: number;
}

/** 36 column headers in fixed legacy order. */
export const SALES_REPORT_36_HEADERS = [
  'SL. No',
  'Entry No',
  'Entry Date',
  'Time',
  'Customer Name',
  'Vehicle No',
  'Driver Name',
  'Mob No',
  'Token No',
  'Driver Bata',
  'Item Name',
  'Rate',
  'Qty',
  'Taxable Amt',
  'Total Amt',
  'Pay. Mode',
  'Bank',
  'Trans. No',
  'Credit Reference',
  'Token Customer',
  'Created By',
  'GST No.',
  'CGST Total',
  'SGST Total',
  'IGST Total',
  'TCS Total',
  'Cash Paid',
  'Digit Paid',
  'Match / MisMatch',
  'Load Weight',
  'Empty Weight',
  'Net Weight',
  'Additive Amount',
  'Deductive Amount',
  'RoundOff Amount',
  'Remarks',
] as const;

const NA = '—';

/** Compute display values from a bill, with NON_GST half-doubling by default. */
export const defaultDisplay = (b: SalesBillRow): SalesReport36Display => {
  const isNonGst = (b.billTypeOverride ?? b.customer?.billType) === 'NON_GST';
  const mult = isNonGst ? 2 : 1;
  const netWeight = Number(b.netWeight) * mult;
  const taxable = Number(b.taxableAmount) * mult;
  const total = Number(b.totalAmount) * mult;
  const paid = Number(b.cashAmount) + Number(b.onlineAmount);
  const credit = Number(b.creditAmount);
  const remaining = Math.max(0, +(total - paid - credit).toFixed(2));
  return { netWeight, taxable, total, paid, remaining };
};

/** Returns 36 ReportColumn definitions for Excel/Print export. */
export const buildSalesReport36Columns = (
  getDisplay: (b: SalesBillRow) => SalesReport36Display = defaultDisplay,
): ReportColumn<SalesBillRow>[] => {
  let serial = 0;
  return [
    { header: 'SL. No', value: () => String(++serial) },
    { header: 'Entry No', value: b => b.token?.entryNo ?? NA },
    { header: 'Entry Date', value: b => fmtDateISO(b.billDate) },
    { header: 'Time', value: b => fmtTime(b.billDate) },
    { header: 'Customer Name', value: b => b.customer.name },
    { header: 'Vehicle No', value: b => b.vehicleNo },
    { header: 'Driver Name', value: b => b.driverName ?? NA },
    { header: 'Mob No', value: b => b.driverMobile ?? NA },
    { header: 'Token No', value: b => b.token?.tokenNo ?? NA },
    { header: 'Driver Bata', value: b => inr(b.driverBata ?? 0), align: 'right' },
    { header: 'Item Name', value: b => b.item.name },
    { header: 'Rate', value: b => inr(b.rate), align: 'right' },
    { header: 'Qty', value: b => getDisplay(b).netWeight.toFixed(2), align: 'right' },
    { header: 'Taxable Amt', value: b => inr(getDisplay(b).taxable), align: 'right' },
    { header: 'Total Amt', value: b => inr(getDisplay(b).total), align: 'right' },
    { header: 'Pay. Mode', value: b => b.paymentMode },
    { header: 'Bank', value: () => NA },
    { header: 'Trans. No', value: () => NA },
    { header: 'Credit Reference', value: () => NA },
    { header: 'Token Customer', value: b => b.token?.customer?.name ?? NA },
    { header: 'Created By', value: b => b.createdByName ?? NA },
    { header: 'GST No.', value: b => b.customer.gstNumber ?? NA },
    { header: 'CGST Total', value: b => inr(b.cgstAmount), align: 'right' },
    { header: 'SGST Total', value: b => inr(b.sgstAmount), align: 'right' },
    { header: 'IGST Total', value: b => inr(b.igstAmount), align: 'right' },
    { header: 'TCS Total', value: b => inr(b.tcsAmount ?? 0), align: 'right' },
    { header: 'Cash Paid', value: b => inr(b.cashAmount), align: 'right' },
    { header: 'Digit Paid', value: b => inr(b.onlineAmount), align: 'right' },
    { header: 'Match / MisMatch', value: () => 'Match' },
    { header: 'Load Weight', value: b => Number(b.grossWeight).toFixed(3), align: 'right' },
    { header: 'Empty Weight', value: b => Number(b.emptyWeight).toFixed(3), align: 'right' },
    { header: 'Net Weight', value: b => getDisplay(b).netWeight.toFixed(3), align: 'right' },
    { header: 'Additive Amount', value: () => NA },
    { header: 'Deductive Amount', value: () => NA },
    { header: 'RoundOff Amount', value: b => inr(b.roundOff ?? 0), align: 'right' },
    { header: 'Remarks', value: b => b.remarks ?? '' },
  ];
};

/** Renders 36 `<td>` cells for the on-screen tbody row. Pass the 1-based serial. */
export const renderSalesReport36Row = (
  b: SalesBillRow,
  serial: number,
  getDisplay: (b: SalesBillRow) => SalesReport36Display = defaultDisplay,
): ReactNode => {
  const d = getDisplay(b);
  const td = (children: ReactNode, extra = '') => (
    <td className={`px-2 py-1.5 text-xs whitespace-nowrap ${extra}`}>{children}</td>
  );
  const tdr = (children: ReactNode, extra = '') =>
    td(children, `text-right ${extra}`);
  return (
    <>
      {td(serial)}
      {td(b.token?.entryNo ?? NA)}
      {td(new Date(b.billDate).toLocaleDateString('en-IN'))}
      {td(fmtTime(b.billDate))}
      {td(b.customer.name, 'font-medium text-gray-800')}
      {td(b.vehicleNo)}
      {td(b.driverName ?? NA)}
      {td(b.driverMobile ?? NA)}
      {td(b.token?.tokenNo ?? NA)}
      {tdr(`₹${fmtNum(b.driverBata ?? 0)}`)}
      {td(b.item.name)}
      {tdr(`₹${fmtNum(b.rate)}`)}
      {tdr(d.netWeight.toFixed(2))}
      {tdr(`₹${fmtNum(d.taxable)}`)}
      {tdr(`₹${fmtNum(d.total)}`, 'font-semibold')}
      {td(b.paymentMode)}
      {td(NA)}
      {td(NA)}
      {td(NA)}
      {td(b.token?.customer?.name ?? NA)}
      {td(b.createdByName ?? NA)}
      {td(b.customer.gstNumber ?? NA)}
      {tdr(`₹${fmtNum(b.cgstAmount)}`)}
      {tdr(`₹${fmtNum(b.sgstAmount)}`)}
      {tdr(`₹${fmtNum(b.igstAmount)}`)}
      {tdr(`₹${fmtNum(b.tcsAmount ?? 0)}`)}
      {tdr(`₹${fmtNum(b.cashAmount)}`, 'text-green-700')}
      {tdr(`₹${fmtNum(b.onlineAmount)}`, 'text-green-700')}
      {td(<span className="text-green-700 font-medium">Match</span>)}
      {tdr(Number(b.grossWeight).toFixed(3))}
      {tdr(Number(b.emptyWeight).toFixed(3))}
      {tdr(d.netWeight.toFixed(3), 'font-semibold')}
      {td(NA)}
      {td(NA)}
      {tdr(`₹${fmtNum(b.roundOff ?? 0)}`)}
      {td(b.remarks ?? '', 'max-w-40 truncate')}
    </>
  );
};

/** Number of columns (used for empty-state colSpan). */
export const SALES_REPORT_36_COLSPAN = SALES_REPORT_36_HEADERS.length;
