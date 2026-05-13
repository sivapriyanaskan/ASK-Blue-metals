import { useEffect, useMemo, useState } from 'react';
import { Calendar, Download, Printer, Loader2 } from 'lucide-react';
import { salesBillApi, type SalesBillRow } from '../services/operationsApi';
import { customersApi, itemsApi, describeError, type CustomerRow, type ItemRow } from '../services/mastersApi';
import { SearchableDropdown, type SearchableDropdownOption } from '../components/ui/searchable-dropdown';
import { downloadReportCSV, printReport, fmtDateISO, currentMonthStart, currentMonthEnd, inr, isNumericHeader, type ReportColumn } from '../utils/reportExport';

const fmt = (n: string | number) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
const NA = '—';

// 31-column layout — exact list confirmed by user.
const HEADERS = [
  'SL. No', 'Entry No', 'Entry Date', 'Time', 'Customer Name', 'GST No',
  'Vehicle No', 'Driver Name', 'Mob No', 'Driver Bata', 'Token No', 'Item Name',
  'Rate', 'Qty', 'Taxable Amt', 'Tax Amt', 'TCS Total', 'Total Amt',
  'Pay. Mode', 'Bank', 'Cheque No', 'Cash Paid', 'Digit Paid', 'Credit Reference',
  'Token Customer', 'Match / Mismatch', 'Created By', 'Addictive Amount',
  'RoundOff Amount', 'Deductive Amount', 'Remarks',
] as const;
const COLSPAN = HEADERS.length;

interface Display { netWeight: number; taxable: number; tax: number; total: number; paid: number; }

// fullRows below pre-doubles NON_GST stored half-values, so we read fields as-is.
const displayFor = (b: SalesBillRow): Display => {
  const netWeight = Number(b.netWeight);
  const taxable = Number(b.taxableAmount);
  const tax = Number(b.cgstAmount) + Number(b.sgstAmount) + Number(b.igstAmount);
  const total = Number(b.totalAmount);
  const paid = Number(b.cashAmount) + Number(b.onlineAmount);
  return { netWeight, taxable, tax, total, paid };
};

export const SalesWithoutGSTFullQty = () => {
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

  // NON_GST bills with zero stored GST.
  const bills = useMemo(
    () => allBills.filter((b) =>
      b.customer.billType === 'NON_GST'
      && Number(b.cgstAmount) === 0
      && Number(b.sgstAmount) === 0
      && Number(b.igstAmount) === 0,
    ),
    [allBills],
  );

  // Pre-double half-stored values to show full qty.
  const fullRows = useMemo(() => bills.map(b => ({
    ...b,
    netWeight: (Number(b.netWeight) * 2).toFixed(3),
    taxableAmount: (Number(b.taxableAmount) * 2).toFixed(2),
    totalAmount: (Number(b.totalAmount) * 2).toFixed(2),
  })), [bills]);

  const totals = useMemo(() => fullRows.reduce((a, b) => {
    const d = displayFor(b);
    return {
      netWeight: a.netWeight + d.netWeight,
      taxable: a.taxable + d.taxable,
      tax: a.tax + d.tax,
      total: a.total + d.total,
      paid: a.paid + d.paid,
    };
  }, { netWeight: 0, taxable: 0, tax: 0, total: 0, paid: 0 }), [fullRows]);

  const custOpts: SearchableDropdownOption[] = [{ value: '', label: 'All Customers' }, ...customers.map(c => ({ value: c.id, label: c.name }))];
  const itemOpts: SearchableDropdownOption[] = [{ value: '', label: 'All Items' }, ...items.filter(i => i.isSaleMaterial).map(i => ({ value: i.id, label: i.name }))];

  const columns = useMemo<ReportColumn<SalesBillRow>[]>(() => {
    let serial = 0;
    return [
      { header: 'SL. No', value: () => String(++serial) },
      { header: 'Entry No', value: b => b.token?.entryNo ?? NA },
      { header: 'Entry Date', value: b => fmtDateISO(b.billDate) },
      { header: 'Time', value: b => fmtTime(b.billDate) },
      { header: 'Customer Name', value: b => b.customer.name },
      { header: 'GST No', value: b => b.customer.gstNumber ?? NA },
      { header: 'Vehicle No', value: b => b.vehicleNo },
      { header: 'Driver Name', value: b => b.driverName ?? NA },
      { header: 'Mob No', value: b => b.driverMobile ?? NA },
      { header: 'Driver Bata', value: b => inr(b.driverBata ?? 0), align: 'right' },
      { header: 'Token No', value: b => b.token?.tokenNo ?? NA },
      { header: 'Item Name', value: b => b.item.name },
      { header: 'Rate', value: b => inr(b.rate), align: 'right' },
      { header: 'Qty', value: b => displayFor(b).netWeight.toFixed(2), align: 'right' },
      { header: 'Taxable Amt', value: b => inr(displayFor(b).taxable), align: 'right' },
      { header: 'Tax Amt', value: b => inr(displayFor(b).tax), align: 'right' },
      { header: 'TCS Total', value: b => inr(b.tcsAmount ?? 0), align: 'right' },
      { header: 'Total Amt', value: b => inr(displayFor(b).total), align: 'right' },
      { header: 'Pay. Mode', value: b => b.paymentMode },
      { header: 'Bank', value: () => NA },
      { header: 'Cheque No', value: () => NA },
      { header: 'Cash Paid', value: b => inr(b.cashAmount), align: 'right' },
      { header: 'Digit Paid', value: b => inr(b.onlineAmount), align: 'right' },
      { header: 'Credit Reference', value: () => NA },
      { header: 'Token Customer', value: b => b.token?.customer?.name ?? NA },
      { header: 'Match / Mismatch', value: () => 'Match' },
      { header: 'Created By', value: b => b.createdByName ?? NA },
      { header: 'Addictive Amount', value: () => NA },
      { header: 'RoundOff Amount', value: b => inr(b.roundOff ?? 0), align: 'right' },
      { header: 'Deductive Amount', value: () => NA },
      { header: 'Remarks', value: b => b.remarks ?? '' },
    ];
  }, [fullRows]);

  const meta = () => ({
    title: 'Sale Invoice Full Qty',
    subtitle: [
      `From ${fmtDateISO(dateFrom)} to ${fmtDateISO(dateTo)}`,
      customerId ? `Customer: ${customers.find(c => c.id === customerId)?.name ?? ''}` : 'All Customers',
      itemId ? `Item: ${items.find(i => i.id === itemId)?.name ?? ''}` : 'All Items',
    ],
  });
  const handleDownload = () => downloadReportCSV(fullRows, columns, meta());
  const handlePrint = () => printReport(fullRows, columns, meta());

  const td = (children: React.ReactNode, extra = '') => (
    <td className={`px-2 py-1.5 text-xs whitespace-nowrap ${extra}`}>{children}</td>
  );
  const tdr = (children: React.ReactNode, extra = '') => td(children, `text-right ${extra}`);

  return (
    <div className="p-6">
      <div className="mb-4 pb-3 border-b border-gray-300 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Sale Invoice Full Qty</h1>
          <p className="text-sm text-gray-500">NON_GST sales bills — actual (un-halved) quantity & amount</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDownload} disabled={!fullRows.length} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"><Download className="w-3 h-3" />Excel</button>
          <button onClick={handlePrint} disabled={!fullRows.length} className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"><Printer className="w-3 h-3" />Print</button>
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
        {([['Total Bills', String(fullRows.length)], ['Net Weight', totals.netWeight.toFixed(2)+' T'], ['Taxable Amt', '₹'+fmt(totals.taxable)], ['Total Amt', '₹'+fmt(totals.total)]] as [string,string][]).map(([l,v])=>(
          <div key={l} className="bg-white rounded-lg border border-gray-300 p-3"><div className="text-xs text-gray-500">{l}</div><div className="text-xl font-bold text-gray-900">{v}</div></div>
        ))}
      </div>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>}
      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" /><span>Loading...</span></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-300">
                <tr>{HEADERS.map(h=>{const r=isNumericHeader(h);return <th key={h} className={`px-2 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap ${r?'text-right':'text-left'}`}>{h}</th>;})}</tr>
              </thead>
              <tbody>
                {fullRows.length === 0 ? <tr><td colSpan={COLSPAN} className="px-3 py-8 text-center text-gray-400">No records found</td></tr>
                : fullRows.map((b, i) => {
                  const d = displayFor(b);
                  return (
                    <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
                      {td(i + 1)}
                      {td(b.token?.entryNo ?? NA)}
                      {td(new Date(b.billDate).toLocaleDateString('en-IN'))}
                      {td(fmtTime(b.billDate))}
                      {td(b.customer.name, 'font-medium text-gray-800')}
                      {td(b.customer.gstNumber ?? NA)}
                      {td(b.vehicleNo)}
                      {td(b.driverName ?? NA)}
                      {td(b.driverMobile ?? NA)}
                      {tdr(`₹${fmt(b.driverBata ?? 0)}`)}
                      {td(b.token?.tokenNo ?? NA)}
                      {td(b.item.name)}
                      {tdr(`₹${fmt(b.rate)}`)}
                      {tdr(d.netWeight.toFixed(2))}
                      {tdr(`₹${fmt(d.taxable)}`)}
                      {tdr(`₹${fmt(d.tax)}`)}
                      {tdr(`₹${fmt(b.tcsAmount ?? 0)}`)}
                      {tdr(`₹${fmt(d.total)}`, 'font-semibold')}
                      {td(b.paymentMode)}
                      {td(NA)}
                      {td(NA)}
                      {tdr(`₹${fmt(b.cashAmount)}`, 'text-green-700')}
                      {tdr(`₹${fmt(b.onlineAmount)}`, 'text-green-700')}
                      {td(NA)}
                      {td(b.token?.customer?.name ?? NA)}
                      {td(<span className="text-green-700 font-medium">Match</span>)}
                      {td(b.createdByName ?? NA)}
                      {td(NA)}
                      {tdr(`₹${fmt(b.roundOff ?? 0)}`)}
                      {td(NA)}
                      {td(b.remarks ?? '', 'max-w-40 truncate')}
                    </tr>
                  );
                })}
              </tbody>
              {fullRows.length > 0 && (
                <tfoot className="bg-gray-50 border-t-2 border-gray-300 font-semibold text-xs">
                  <tr>
                    <td colSpan={13} className="px-2 py-2 text-right text-gray-600">TOTALS</td>
                    <td className="px-2 py-2 text-right">{totals.netWeight.toFixed(2)}</td>
                    <td className="px-2 py-2 text-right">₹{fmt(totals.taxable)}</td>
                    <td className="px-2 py-2 text-right">₹{fmt(totals.tax)}</td>
                    <td></td>
                    <td className="px-2 py-2 text-right">₹{fmt(totals.total)}</td>
                    <td colSpan={3}></td>
                    <td className="px-2 py-2 text-right text-green-700">₹{fmt(totals.paid)}</td>
                    <td colSpan={9}></td>
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
