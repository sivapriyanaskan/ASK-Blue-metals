import { useEffect, useMemo, useState } from 'react';
import { Search, Calendar, Download, Printer, Loader2 } from 'lucide-react';
import { salesBillApi, type SalesBillRow } from '../services/operationsApi';
import { customersApi, itemsApi, describeError, type CustomerRow, type ItemRow } from '../services/mastersApi';
import { SearchableDropdown, type SearchableDropdownOption } from '../components/ui/searchable-dropdown';
import { downloadReportCSV, printReport, fmtDateISO, currentMonthStart, currentMonthEnd, isNumericHeader } from '../utils/reportExport';
import {
  SALES_REPORT_36_HEADERS,
  SALES_REPORT_36_COLSPAN,
  buildSalesReport36Columns,
  renderSalesReport36Row,
  defaultDisplay,
} from '../utils/salesReport36';

const fmt = (n: string | number) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN');

/**
 * Compute the GST and net total as shown on the printed bill. For NON_GST
 * bills the saved GST is 0; the invoice prints a display-only 5% GST split
 * equally as CGST 2.5% + SGST 2.5% (rounded to whole rupees) and adds it
 * on top of the stored (halved) totalAmount. This report mirrors that.
 */
type GstType = 'CGST_SGST' | 'IGST' | 'NON_GST' | 'NO_TAX';
// Returns the FULL internal (un-halved) figures. NON_GST bills store half
// values in DB; we expose the actual weight, taxable and total. We do NOT
// add any 5% display GST here because that GST is not actually collected
// from the customer — it is only an invoice-side adjustment.
const billDisplayAmounts = (b: SalesBillRow): { netWeight: number; taxable: number; gst: number; total: number; gstType: GstType } => {
  const effectiveBillType = b.billTypeOverride ?? b.customer?.billType;
  const isNonGstDisplay = effectiveBillType === 'NON_GST';
  if (isNonGstDisplay) {
    const netWeight = Number(b.netWeight) * 2;
    const taxable = Number(b.taxableAmount) * 2;
    const total = Number(b.totalAmount) * 2;
    return { netWeight, taxable, gst: 0, total, gstType: 'NON_GST' };
  }
  const netWeight = Number(b.netWeight);
  const taxable = Number(b.taxableAmount);
  const igst = Number(b.igstAmount);
  if (igst > 0) {
    return { netWeight, taxable, gst: igst, total: Number(b.totalAmount), gstType: 'IGST' };
  }
  const cgst = Number(b.cgstAmount);
  const sgst = Number(b.sgstAmount);
  const gst = cgst + sgst;
  return { netWeight, taxable, gst, total: Number(b.totalAmount), gstType: gst > 0 ? 'CGST_SGST' : 'NO_TAX' };
};

const GST_TYPE_LABEL: Record<GstType, string> = {
  CGST_SGST: 'CGST+SGST',
  IGST: 'IGST',
  NON_GST: 'NON-GST',
  NO_TAX: 'No Tax',
};
const GST_TYPE_BADGE: Record<GstType, string> = {
  CGST_SGST: 'bg-emerald-100 text-emerald-700',
  IGST: 'bg-purple-100 text-purple-700',
  NON_GST: 'bg-amber-100 text-amber-700',
  NO_TAX: 'bg-gray-100 text-gray-600',
};

// Paid = cash + online (immediate collection). Remaining = real total - paid -
// credit (still owed by customer). NON_GST stored totals are doubled to real.
const paymentInfo = (b: SalesBillRow) => {
  const isNonGst = (b.billTypeOverride ?? b.customer?.billType) === 'NON_GST';
  const realTotal = isNonGst ? Number(b.totalAmount) * 2 : Number(b.totalAmount);
  const paid = Number(b.cashAmount) + Number(b.onlineAmount);
  const credit = Number(b.creditAmount);
  const remaining = Math.max(0, +(realTotal - paid - credit).toFixed(2));
  return { paid, remaining };
};

export const SalesRegister = () => {
  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = today.slice(0, 7) + '-01';
  const [dateFrom, setDateFrom] = useState(currentMonthStart());
  const [dateTo, setDateTo] = useState(currentMonthEnd());
  const [customerId, setCustomerId] = useState('');
  const [itemId, setItemId] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [gstType, setGstType] = useState<'' | GstType>('');
  const [search, setSearch] = useState('');
  const [bills, setBills] = useState<SalesBillRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    customersApi.list({ pageSize: 200 }).then(r => setCustomers(r.items)).catch(() => {});
    itemsApi.list({ pageSize: 200 }).then(r => setItems(r.items)).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await salesBillApi.list({ dateFrom, dateTo, customerId: customerId || undefined, itemId: itemId || undefined, pageSize: 200 });
      setBills(res.items);
    } catch (e) { setError(describeError(e, 'Failed to load sales register')); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [dateFrom, dateTo, customerId, itemId]);

  const filtered = useMemo(() => bills.filter(b => {
    const s = search.toLowerCase();
    const mSearch = !s || b.billNo.toLowerCase().includes(s) || b.customer.name.toLowerCase().includes(s) || b.vehicleNo.toLowerCase().includes(s) || (b.token?.tokenNo ?? '').includes(s);
    const mMode = !paymentMode || b.paymentMode === paymentMode;
    const mGst = !gstType || billDisplayAmounts(b).gstType === gstType;
    return mSearch && mMode && mGst;
  }), [bills, search, paymentMode, gstType]);

  const totals = useMemo(() => filtered.reduce((a, b) => {
    const { netWeight, taxable, gst, total } = billDisplayAmounts(b);
    const p = paymentInfo(b);
    return {
      net: a.net + netWeight,
      taxable: a.taxable + taxable,
      gst: a.gst + gst,
      total: a.total + total,
      paid: a.paid + p.paid,
      remaining: a.remaining + p.remaining,
    };
  }, { net: 0, taxable: 0, gst: 0, total: 0, paid: 0, remaining: 0 }), [filtered]);

  const custOpts: SearchableDropdownOption[] = [{ value: '', label: 'All Customers' }, ...customers.map(c => ({ value: c.id, label: c.name }))];
  const itemOpts: SearchableDropdownOption[] = [{ value: '', label: 'All Items' }, ...items.filter(i => i.isSaleMaterial).map(i => ({ value: i.id, label: i.name }))];
  const modeOpts: SearchableDropdownOption[] = [{ value: '', label: 'All Modes' }, ...['CASH', 'ONLINE', 'CREDIT', 'MIXED'].map(m => ({ value: m, label: m }))];
  const gstTypeOpts: SearchableDropdownOption[] = [
    { value: '', label: 'All GST Types' },
    { value: 'CGST_SGST', label: 'CGST + SGST' },
    { value: 'IGST', label: 'IGST' },
    { value: 'NON_GST', label: 'NON-GST' },
    { value: 'NO_TAX', label: 'No Tax' },
  ];

  const columns = useMemo(() => buildSalesReport36Columns(defaultDisplay), [filtered]);
  const meta = () => ({
    title: 'Sales Register',
    subtitle: [
      `From ${fmtDateISO(dateFrom)} to ${fmtDateISO(dateTo)}`,
      customerId ? `Customer: ${customers.find(c => c.id === customerId)?.name ?? ''}` : 'All Customers',
      itemId ? `Item: ${items.find(i => i.id === itemId)?.name ?? ''}` : 'All Items',
      paymentMode ? `Mode: ${paymentMode}` : 'All Modes',
      gstType ? `GST Type: ${GST_TYPE_LABEL[gstType]}` : 'All GST Types',
    ],
  });
  const handleDownload = () => downloadReportCSV(filtered, columns, meta());
  const handlePrint = () => printReport(filtered, columns, meta());

  return (
    <div className="p-6">
      <div className="mb-4 pb-3 border-b border-gray-300 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Sales Register</h1>
        <div className="flex gap-2">
          <button onClick={handleDownload} disabled={!filtered.length} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"><Download className="w-3 h-3" />Excel</button>
          <button onClick={handlePrint} disabled={!filtered.length} className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"><Printer className="w-3 h-3" />Print</button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-300 p-4 mb-4">
        <div className="grid grid-cols-7 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
            <div className="relative"><Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500" /></div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
            <div className="relative"><Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500" /></div>
          </div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Customer</label>
            <SearchableDropdown options={custOpts} value={customerId} onValueChange={setCustomerId} placeholder="All Customers" /></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Item</label>
            <SearchableDropdown options={itemOpts} value={itemId} onValueChange={setItemId} placeholder="All Items" /></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Payment Mode</label>
            <SearchableDropdown options={modeOpts} value={paymentMode} onValueChange={setPaymentMode} placeholder="All Modes" /></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">GST Type</label>
            <SearchableDropdown options={gstTypeOpts} value={gstType} onValueChange={(v) => setGstType(v as '' | GstType)} placeholder="All GST Types" /></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
            <div className="relative"><Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Bill No, Customer…" className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500" /></div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        {[['Total Bills', filtered.length.toString()], ['Net Weight', `${totals.net.toFixed(2)} T`], ['Base Amount', `₹${fmt(totals.taxable)}`], ['Net Amount', `₹${fmt(totals.total)}`]].map(([label, val]) => (
          <div key={label} className="bg-white rounded-lg border border-gray-300 p-3">
            <div className="text-xs text-gray-500">{label}</div>
            <div className="text-xl font-bold text-gray-900">{val}</div>
          </div>
        ))}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>}

      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" /><span className="text-gray-500">Loading...</span></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-300">
                <tr>
                  {SALES_REPORT_36_HEADERS.map(h => {
                    const r = isNumericHeader(h);
                    return <th key={h} className={`px-2 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap ${r?'text-right':'text-left'}`}>{h}</th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={SALES_REPORT_36_COLSPAN} className="px-3 py-8 text-center text-gray-400">No records found</td></tr>
                ) : filtered.map((b, i) => (
                  <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
                    {renderSalesReport36Row(b, i + 1, defaultDisplay)}
                  </tr>
                ))}
              </tbody>
              {filtered.length > 0 && (
                <tfoot className="bg-gray-50 border-t-2 border-gray-300 font-semibold text-xs">
                  <tr>
                    <td colSpan={12} className="px-2 py-2 text-right text-gray-600">TOTALS</td>
                    <td className="px-2 py-2 text-right">{totals.net.toFixed(2)}</td>
                    <td className="px-2 py-2 text-right">₹{fmt(totals.taxable)}</td>
                    <td className="px-2 py-2 text-right">₹{fmt(totals.total)}</td>
                    <td colSpan={11}></td>
                    <td className="px-2 py-2 text-right text-green-700">₹{fmt(totals.paid)}</td>
                    <td colSpan={10}></td>
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
