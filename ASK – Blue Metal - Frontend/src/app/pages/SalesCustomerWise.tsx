import { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronDown, ChevronRight, Loader2, Download, Printer } from 'lucide-react';
import { salesBillApi, type SalesBillRow } from '../services/operationsApi';
import { describeError } from '../services/mastersApi';
import { useAppContext } from '../context/AppContext';
import { isInvoiceBillingOnly } from '../utils/roles';
import { downloadReportCSV, printReport, inr, fmtDateISO, isNumericHeader, type ReportColumn, currentMonthStart, currentMonthEnd } from '../utils/reportExport';

const fmt = (n: string | number) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN');

// Actual (full-qty) display values per bill. NON_GST stores HALF qty / taxable
// / total; this report wants the real amount collected, so we double those and
// also derive a 5% GST (CGST 2.5% + SGST 2.5%) on the doubled taxable when no
// GST is stored — matching what the customer actually paid.
const displayFor = (b: SalesBillRow) => {
  const isNonGst = (b.billTypeOverride ?? b.customer?.billType) === 'NON_GST';
  const mult = isNonGst ? 2 : 1;
  const netWeight = Number(b.netWeight) * mult;
  const taxable = Number(b.taxableAmount) * mult;
  let cgst = Number(b.cgstAmount) * mult;
  let sgst = Number(b.sgstAmount) * mult;
  let igst = Number(b.igstAmount) * mult;
  let total = Number(b.totalAmount) * mult;
  if (isNonGst && cgst === 0 && sgst === 0 && igst === 0) {
    const cPct = Number(b.cgstPercent) || 2.5;
    const sPct = Number(b.sgstPercent) || 2.5;
    cgst = +(taxable * cPct / 100).toFixed(2);
    sgst = +(taxable * sPct / 100).toFixed(2);
    total = +(taxable + cgst + sgst + Number(b.tcsAmount ?? 0) * mult + Number(b.roundOff ?? 0) * mult).toFixed(2);
  }
  return { netWeight, taxable, gst: cgst + sgst + igst, total };
};

const paymentInfo = (b: SalesBillRow) => {
  const d = displayFor(b);
  const paid = Number(b.cashAmount) + Number(b.onlineAmount);
  const credit = Number(b.creditAmount);
  const remaining = Math.max(0, +(d.total - paid - credit).toFixed(2));
  return { paid, remaining };
};

interface CustomerGroup {
  customerId: string;
  customerName: string;
  customerCode: string;
  billType: string;
  bills: SalesBillRow[];
  totalWeight: number;
  totalTaxable: number;
  totalGst: number;
  totalAmount: number;
  totalPaid: number;
  totalRemaining: number;
}

export const SalesCustomerWise = () => {
  const { user } = useAppContext();
  const invoiceOnly = isInvoiceBillingOnly(user.roleCodes);
  const [dateFrom, setDateFrom] = useState(currentMonthStart());
  const [dateTo, setDateTo] = useState(currentMonthEnd());
  const [bills, setBills] = useState<SalesBillRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await salesBillApi.list({ dateFrom, dateTo, pageSize: 200, status: 'POSTED' });
      setBills(res.items);
    } catch (e) { setError(describeError(e, 'Failed to load')); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [dateFrom, dateTo]);

  const groups = useMemo((): CustomerGroup[] => {
    const map: Record<string, CustomerGroup> = {};
    for (const b of bills) {
      if (!map[b.customerId]) {
        map[b.customerId] = {
          customerId: b.customerId,
          customerName: b.customer.name,
          customerCode: b.customer.code,
          billType: b.customer.billType,
          bills: [],
          totalWeight: 0, totalTaxable: 0, totalGst: 0, totalAmount: 0,
          totalPaid: 0, totalRemaining: 0,
        };
      }
      const g = map[b.customerId];
      const d = displayFor(b);
      const p = paymentInfo(b);
      g.bills.push(b);
      g.totalWeight += d.netWeight;
      g.totalTaxable += d.taxable;
      g.totalGst += d.gst;
      g.totalAmount += d.total;
      g.totalPaid += p.paid;
      g.totalRemaining += p.remaining;
    }
    return Object.values(map).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [bills]);

  const grandTotal = useMemo(() => groups.reduce((a, g) => ({
    bills: a.bills + g.bills.length,
    weight: a.weight + g.totalWeight,
    taxable: a.taxable + g.totalTaxable,
    gst: a.gst + g.totalGst,
    total: a.total + g.totalAmount,
    paid: a.paid + g.totalPaid,
    remaining: a.remaining + g.totalRemaining,
  }), { bills: 0, weight: 0, taxable: 0, gst: 0, total: 0, paid: 0, remaining: 0 }), [groups]);

  const toggle = (id: string) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  type Row = { isHeader: boolean; g: CustomerGroup; b?: SalesBillRow };
  const exportRows: Row[] = useMemo(() => {
    const out: Row[] = [];
    for (const g of groups) {
      out.push({ isHeader: true, g });
      for (const b of g.bills) out.push({ isHeader: false, g, b });
    }
    return out;
  }, [groups]);

  const columns: ReportColumn<Row>[] = invoiceOnly ? [
    { header: 'Customer', value: r => r.isHeader ? `${r.g.customerName} (${r.g.customerCode})` : `  ${r.b?.billNo ?? ''} — ${r.b ? fmtDateISO(r.b.billDate) : ''} — ${r.b?.item.name ?? ''}` },
    { header: 'Bills', value: r => r.isHeader ? r.g.bills.length : '', align: 'right' },
    { header: 'Net Wt (T)', value: r => r.isHeader ? r.g.totalWeight.toFixed(2) : (r.b ? displayFor(r.b).netWeight.toFixed(2) : ''), align: 'right' },
    { header: 'Taxable Amt', value: r => r.isHeader ? inr(r.g.totalTaxable) : (r.b ? inr(displayFor(r.b).taxable) : ''), align: 'right' },
    { header: 'GST', value: r => r.isHeader ? inr(r.g.totalGst) : (r.b ? inr(displayFor(r.b).gst) : ''), align: 'right' },
    { header: 'Total Amount', value: r => r.isHeader ? inr(r.g.totalAmount) : (r.b ? inr(displayFor(r.b).total) : ''), align: 'right' },
    { header: 'Paid', value: r => r.isHeader ? inr(r.g.totalPaid) : (r.b ? inr(paymentInfo(r.b).paid) : ''), align: 'right' },
    { header: 'Remaining', value: r => r.isHeader ? inr(r.g.totalRemaining) : (r.b ? inr(paymentInfo(r.b).remaining) : ''), align: 'right' },
  ] : [
    { header: 'Customer', value: r => r.isHeader ? `${r.g.customerName} (${r.g.customerCode})` : `  ${r.b?.billNo ?? ''} — ${r.b ? fmtDateISO(r.b.billDate) : ''} — ${r.b?.item.name ?? ''}` },
    { header: 'Type', value: r => r.isHeader ? (r.g.billType === 'TAX_INVOICE' ? 'With GST' : 'Non-GST') : '' },
    { header: 'Bills', value: r => r.isHeader ? r.g.bills.length : '', align: 'right' },
    { header: 'Net Wt (T)', value: r => r.isHeader ? r.g.totalWeight.toFixed(2) : (r.b ? displayFor(r.b).netWeight.toFixed(2) : ''), align: 'right' },
    { header: 'Taxable Amt', value: r => r.isHeader ? inr(r.g.totalTaxable) : (r.b ? inr(displayFor(r.b).taxable) : ''), align: 'right' },
    { header: 'GST', value: r => r.isHeader ? inr(r.g.totalGst) : (r.b ? inr(displayFor(r.b).gst) : ''), align: 'right' },
    { header: 'Total Amount', value: r => r.isHeader ? inr(r.g.totalAmount) : (r.b ? inr(displayFor(r.b).total) : ''), align: 'right' },
    { header: 'Paid', value: r => r.isHeader ? inr(r.g.totalPaid) : (r.b ? inr(paymentInfo(r.b).paid) : ''), align: 'right' },
    { header: 'Remaining', value: r => r.isHeader ? inr(r.g.totalRemaining) : (r.b ? inr(paymentInfo(r.b).remaining) : ''), align: 'right' },
  ];
  const meta = () => ({
    title: 'Sales Customer-Wise Report',
    subtitle: [`From ${fmtDateISO(dateFrom)} to ${fmtDateISO(dateTo)}`, `${groups.length} customers, ${grandTotal.bills} bills`],
    totals: invoiceOnly
      ? [`GRAND TOTAL (${groups.length} customers)`, grandTotal.bills, grandTotal.weight.toFixed(2), inr(grandTotal.taxable), inr(grandTotal.gst), inr(grandTotal.total), inr(grandTotal.paid), inr(grandTotal.remaining)]
      : [`GRAND TOTAL (${groups.length} customers)`, '', grandTotal.bills, grandTotal.weight.toFixed(2), inr(grandTotal.taxable), inr(grandTotal.gst), inr(grandTotal.total), inr(grandTotal.paid), inr(grandTotal.remaining)],
  });
  const handleDownload = () => downloadReportCSV(exportRows, columns, meta());
  const handlePrint = () => printReport(exportRows, columns, meta());

  return (
    <div className="p-6">
      <div className="mb-4 pb-3 border-b border-gray-300 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Sales Customer-Wise Report</h1>
          <p className="text-sm text-gray-500">Sales bills grouped by customer from DB</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDownload} disabled={!groups.length} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"><Download className="w-3 h-3" />Excel</button>
          <button onClick={handlePrint} disabled={!groups.length} className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"><Printer className="w-3 h-3" />Print</button>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-gray-300 p-4 mb-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded" />
          </div>
          <div className="flex items-end"><button onClick={load} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded text-sm">Apply</button></div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-4">
        {([['Customers', String(groups.length)], ['Total Bills', String(grandTotal.bills)], ['Net Weight', grandTotal.weight.toFixed(2)+' T'], ['Grand Total', '₹'+fmt(grandTotal.total)]] as [string,string][]).map(([l,v])=>(
          <div key={l} className="bg-white rounded-lg border border-gray-300 p-3"><div className="text-xs text-gray-500">{l}</div><div className="text-xl font-bold text-gray-900">{v}</div></div>
        ))}
      </div>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>}
      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" /><span>Loading...</span></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-300">
                <tr>{(invoiceOnly
                  ? ['Customer','Bills','Net Wt (T)','Taxable Amt','GST','Total Amount','Paid','Remaining']
                  : ['Customer','Type','Bills','Net Wt (T)','Taxable Amt','GST','Total Amount','Paid','Remaining']
                ).map(h=>{ const r = isNumericHeader(h); return <th key={h} className={`px-3 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap ${r?'text-right':'text-left'}`}>{h}</th>; })}</tr>
              </thead>
              <tbody>
                {groups.length === 0 ? <tr><td colSpan={invoiceOnly ? 8 : 9} className="px-3 py-8 text-center text-gray-400">No records found</td></tr>
                : groups.map(g=>(
                  <>
                    <tr key={g.customerId} onClick={() => toggle(g.customerId)} className="border-b border-gray-300 hover:bg-blue-50 cursor-pointer bg-blue-50/30">
                      <td className="px-3 py-2 font-semibold flex items-center gap-1">
                        {expanded[g.customerId] ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                        {g.customerName} <span className="text-xs text-gray-400 font-normal">({g.customerCode})</span>
                      </td>
                      {!invoiceOnly && (
                        <td className="px-3 py-2"><span className={g.billType==='TAX_INVOICE'?'px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700':'px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600'}>{g.billType==='TAX_INVOICE'?'With GST':'Non-GST'}</span></td>
                      )}
                      <td className="px-3 py-2 text-right font-medium">{g.bills.length}</td>
                      <td className="px-3 py-2 text-right font-medium">{g.totalWeight.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-medium">₹{fmt(g.totalTaxable)}</td>
                      <td className="px-3 py-2 text-right font-medium">₹{fmt(g.totalGst)}</td>
                      <td className="px-3 py-2 text-right font-bold text-blue-700">₹{fmt(g.totalAmount)}</td>
                      <td className="px-3 py-2 text-right font-medium text-green-700">₹{fmt(g.totalPaid)}</td>
                      <td className={`px-3 py-2 text-right font-medium ${g.totalRemaining > 0 ? 'text-red-600' : 'text-gray-400'}`}>{g.totalRemaining > 0 ? '₹'+fmt(g.totalRemaining) : '—'}</td>
                    </tr>
                    {expanded[g.customerId] && g.bills.map(b=>{
                      const d = displayFor(b);
                      const pay = paymentInfo(b);
                      return (
                      <tr key={b.id} className="border-b border-gray-100 bg-gray-50/50 hover:bg-gray-100">
                        <td className="px-3 py-1.5 pl-8 text-blue-600 text-xs font-medium">{b.billNo} <span className="text-gray-400 font-normal">— {b.item.name}</span></td>
                        {!invoiceOnly && <td className="px-3 py-1.5 text-xs"></td>}
                        <td className="px-3 py-1.5 text-xs">{fmtDate(b.billDate)}</td>
                        <td className="px-3 py-1.5 text-right text-xs">{d.netWeight.toFixed(2)}</td>
                        <td className="px-3 py-1.5 text-right text-xs">₹{fmt(d.taxable)}</td>
                        <td className="px-3 py-1.5 text-right text-xs">₹{fmt(d.gst)}</td>
                        <td className="px-3 py-1.5 text-right text-xs font-semibold">₹{fmt(d.total)}</td>
                        <td className="px-3 py-1.5 text-right text-xs text-green-700">₹{fmt(pay.paid)}</td>
                        <td className={`px-3 py-1.5 text-right text-xs ${pay.remaining > 0 ? 'text-red-600' : 'text-gray-400'}`}>{pay.remaining > 0 ? '₹'+fmt(pay.remaining) : '—'}</td>
                      </tr>
                      );
                    })}
                  </>
                ))}
              </tbody>
              {groups.length > 0 && (
                <tfoot className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                  <tr>
                    <td colSpan={invoiceOnly ? 1 : 2} className="px-3 py-2 text-xs text-gray-600">GRAND TOTAL ({groups.length} customers)</td>
                    <td className="px-3 py-2 text-right">{grandTotal.bills}</td>
                    <td className="px-3 py-2 text-right">{grandTotal.weight.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">₹{fmt(grandTotal.taxable)}</td>
                    <td className="px-3 py-2 text-right">₹{fmt(grandTotal.gst)}</td>
                    <td className="px-3 py-2 text-right text-blue-700">₹{fmt(grandTotal.total)}</td>
                    <td className="px-3 py-2 text-right text-green-700">₹{fmt(grandTotal.paid)}</td>
                    <td className="px-3 py-2 text-right text-red-600">₹{fmt(grandTotal.remaining)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
