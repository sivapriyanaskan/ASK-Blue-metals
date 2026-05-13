import { useEffect, useMemo, useState } from 'react';
import { Calendar, Download, Printer, Loader2 } from 'lucide-react';
import { salesBillApi, type SalesBillRow } from '../services/operationsApi';
import { customersApi, itemsApi, describeError, type CustomerRow, type ItemRow } from '../services/mastersApi';
import { SearchableDropdown, type SearchableDropdownOption } from '../components/ui/searchable-dropdown';
import { downloadReportCSV, printReport, fmtDateISO, currentMonthStart, currentMonthEnd, isNumericHeader } from '../utils/reportExport';
import {
  SALES_REPORT_36_HEADERS,
  SALES_REPORT_36_COLSPAN,
  buildSalesReport36Columns,
  renderSalesReport36Row,
  type SalesReport36Display,
} from '../utils/salesReport36';

const fmt = (n: string | number) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// For NON_GST customer bills the DB GST is 0; the printed invoice adds a
// display-only 5% GST (CGST 2.5% + SGST 2.5%, rounded) on top of the stored
// (halved) taxable amount. This report mirrors that in the Total column.
const displayFor = (b: SalesBillRow): SalesReport36Display => {
  const effectiveBillType = b.billTypeOverride ?? b.customer?.billType;
  const taxable = Number(b.taxableAmount);
  let total = Number(b.totalAmount);
  if (effectiveBillType === 'NON_GST') {
    const half = Math.round((taxable * 5) / 2 / 100);
    total = +(total + half * 2).toFixed(2);
  }
  const paid = Number(b.cashAmount) + Number(b.onlineAmount);
  const credit = Number(b.creditAmount);
  const remaining = Math.max(0, +(total - paid - credit).toFixed(2));
  return { netWeight: Number(b.netWeight), taxable, total, paid, remaining };
};

export const SalesGSTCombined = () => {
  const [dateFrom, setDateFrom] = useState(currentMonthStart());
  const [dateTo, setDateTo] = useState(currentMonthEnd());
  const [customerId, setCustomerId] = useState('');
  const [itemId, setItemId] = useState('');
  const [allBills, setAllBills] = useState<SalesBillRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      customersApi.list({ pageSize: 200 }),
      itemsApi.list({ pageSize: 200 }),
    ]).then(([cr, ir]) => { setCustomers(cr.items); setItems(ir.items); }).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await salesBillApi.list({ dateFrom, dateTo, customerId: customerId||undefined, itemId: itemId||undefined, pageSize: 200, status: 'POSTED' });
      setAllBills(res.items);
    } catch (e) { setError(describeError(e, 'Failed to load')); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [dateFrom, dateTo, customerId, itemId]);

  const bills = useMemo(() => allBills.filter((_b) => true), [allBills]);

  const totals = useMemo(() => bills.reduce((a, b) => {
    const d = displayFor(b);
    return {
      netWeight: a.netWeight + d.netWeight,
      taxable: a.taxable + d.taxable,
      total: a.total + d.total,
      paid: a.paid + d.paid,
      remaining: a.remaining + d.remaining,
    };
  }, { netWeight: 0, taxable: 0, total: 0, paid: 0, remaining: 0 }), [bills]);

  const custOpts: SearchableDropdownOption[] = [{ value: '', label: 'All Customers' }, ...customers.map(c => ({ value: c.id, label: c.name }))];
  const itemOpts: SearchableDropdownOption[] = [{ value: '', label: 'All Items' }, ...items.filter(i => i.isSaleMaterial).map(i => ({ value: i.id, label: i.name }))];

  const columns = useMemo(() => buildSalesReport36Columns(displayFor), [bills]);
  const meta = () => ({
    title: 'Sales GST Combined Report',
    subtitle: [
      `From ${fmtDateISO(dateFrom)} to ${fmtDateISO(dateTo)}`,
      customerId ? `Customer: ${customers.find(c => c.id === customerId)?.name ?? ''}` : 'All Customers',
      itemId ? `Item: ${items.find(i => i.id === itemId)?.name ?? ''}` : 'All Items',
    ],
  });
  const handleDownload = () => downloadReportCSV(bills, columns, meta());
  const handlePrint = () => printReport(bills, columns, meta());

  return (
    <div className="p-6">
      <div className="mb-4 pb-3 border-b border-gray-300 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Sales GST Combined Report</h1>
          <p className="text-sm text-gray-500">All sales bills with GST type from DB</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDownload} disabled={!bills.length} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"><Download className="w-3 h-3" />Excel</button>
          <button onClick={handlePrint} disabled={!bills.length} className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"><Printer className="w-3 h-3" />Print</button>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-gray-300 p-4 mb-4">
        <div className="grid grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
            <div className="relative"><Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded" /></div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
            <div className="relative"><Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded" /></div>
          </div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Customer</label>
            <SearchableDropdown options={custOpts} value={customerId} onValueChange={setCustomerId} placeholder="All Customers" /></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Item</label>
            <SearchableDropdown options={itemOpts} value={itemId} onValueChange={setItemId} placeholder="All Items" /></div>
          <div className="flex items-end"><button onClick={load} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded text-sm">Apply</button></div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-4">
        {([['Total Bills', String(bills.length)], ['Net Weight', totals.netWeight.toFixed(2)+' T'], ['Taxable Amt', '₹'+fmt(totals.taxable)], ['Total Amt', '₹'+fmt(totals.total)]] as [string,string][]).map(([l,v])=>(
          <div key={l} className="bg-white rounded-lg border border-gray-300 p-3"><div className="text-xs text-gray-500">{l}</div><div className="text-xl font-bold text-gray-900">{v}</div></div>
        ))}
      </div>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>}
      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" /><span>Loading...</span></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-300">
                <tr>{SALES_REPORT_36_HEADERS.map(h=>{const r=isNumericHeader(h);return <th key={h} className={`px-2 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap ${r?'text-right':'text-left'}`}>{h}</th>;})}</tr>
              </thead>
              <tbody>
                {bills.length === 0 ? <tr><td colSpan={SALES_REPORT_36_COLSPAN} className="px-3 py-8 text-center text-gray-400">No records found</td></tr>
                : bills.map((b, i) => (
                  <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
                    {renderSalesReport36Row(b, i + 1, displayFor)}
                  </tr>
                ))}
              </tbody>
              {bills.length > 0 && (
                <tfoot className="bg-gray-50 border-t-2 border-gray-300 font-semibold text-xs">
                  <tr>
                    <td colSpan={12} className="px-2 py-2 text-right text-gray-600">TOTALS</td>
                    <td className="px-2 py-2 text-right">{totals.netWeight.toFixed(2)}</td>
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
