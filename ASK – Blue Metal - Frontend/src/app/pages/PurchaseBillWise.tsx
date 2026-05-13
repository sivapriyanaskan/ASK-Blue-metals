import { useEffect, useMemo, useState } from 'react';
import { Search, Download, Calendar, Printer, Loader2 } from 'lucide-react';
import { SearchableDropdown, type SearchableDropdownOption } from '../components/ui/searchable-dropdown';
import { purchaseBillApi, type PurchaseBillRow } from '../services/operationsApi';
import { suppliersApi, describeError, type SupplierRow } from '../services/mastersApi';
import { downloadReportCSV, printReport, inr, fmtDateISO, isNumericHeader, type ReportColumn, currentMonthStart, currentMonthEnd } from '../utils/reportExport';

export const PurchaseBillWise = () => {
  const [dateFrom, setDateFrom] = useState(currentMonthStart());
  const [dateTo, setDateTo] = useState(currentMonthEnd());
  const [supplierId, setSupplierId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [bills, setBills] = useState<PurchaseBillRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { suppliersApi.list({ pageSize: 200 }).then(r => setSuppliers(r.items)).catch(() => {}); }, []);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await purchaseBillApi.list({ dateFrom, dateTo, supplierId: supplierId || undefined, pageSize: 200 });
      setBills(res.items);
    } catch (e) { setError(describeError(e, 'Failed to load')); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [dateFrom, dateTo, supplierId]);

  const filtered = useMemo(() => bills.filter(b => {
    const s = searchTerm.toLowerCase();
    return !s || b.purchaseNo.toLowerCase().includes(s) || b.supplierNameSnapshot.toLowerCase().includes(s) || b.itemNameSnapshot.toLowerCase().includes(s) || b.vehicleNoSnapshot.toLowerCase().includes(s);
  }), [bills, searchTerm]);

  const totals = useMemo(() => filtered.reduce((a, b) => ({
    qty: a.qty + Number(b.netWeight),
    base: a.base + Number(b.grossAmount),
    gst: a.gst + Number(b.gstAmount),
    total: a.total + Number(b.grossPayable),
  }), { qty: 0, base: 0, gst: 0, total: 0 }), [filtered]);

  const supOpts: SearchableDropdownOption[] = [{ value: '', label: 'All Suppliers' }, ...suppliers.map(s => ({ value: s.id, label: s.name }))];

  const columns: ReportColumn<PurchaseBillRow>[] = [
    { header: 'Bill No', value: b => b.purchaseNo },
    { header: 'Date', value: b => fmtDateISO(b.purchaseDateTime) },
    { header: 'Supplier', value: b => b.supplierNameSnapshot },
    { header: 'Item', value: b => b.itemNameSnapshot },
    { header: 'Vehicle', value: b => b.vehicleNoSnapshot },
    { header: 'Qty (T)', value: b => Number(b.netWeight).toFixed(3), align: 'right' },
    { header: 'Rate', value: b => inr(b.rate), align: 'right' },
    { header: 'Base Amt', value: b => inr(b.grossAmount), align: 'right' },
    { header: 'GST', value: b => inr(b.gstAmount), align: 'right' },
    { header: 'Total', value: b => inr(b.grossPayable), align: 'right' },
    { header: 'Mode', value: b => b.paymentMode },
  ];
  const meta = () => ({
    title: 'Purchase Bill Wise',
    subtitle: [
      `From ${fmtDateISO(dateFrom)} to ${fmtDateISO(dateTo)}`,
      supplierId ? `Supplier: ${suppliers.find(s => s.id === supplierId)?.name ?? ''}` : 'All Suppliers',
      searchTerm ? `Search: ${searchTerm}` : '',
    ].filter(Boolean) as string[],
    totals: ['', '', '', '', 'TOTALS', totals.qty.toFixed(3), '', inr(totals.base), inr(totals.gst), inr(totals.total), ''],
  });
  const handleDownload = () => downloadReportCSV(filtered, columns, meta());
  const handlePrint = () => printReport(filtered, columns, meta());

  return (
    <div className="p-6">
      <div className="mb-4 pb-3 border-b border-gray-300 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Purchase Bill Wise</h1>
        <div className="flex gap-2">
          <button onClick={handleDownload} disabled={!filtered.length} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"><Download className="w-3 h-3" />Excel</button>
          <button onClick={handlePrint} disabled={!filtered.length} className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"><Printer className="w-3 h-3" />Print</button>
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
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Supplier</label>
            <SearchableDropdown options={supOpts} value={supplierId} onValueChange={setSupplierId} placeholder="All Suppliers" /></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
            <div className="relative"><Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Bill No, Supplier, Item…" className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded" /></div>
          </div>
          <div className="flex items-end"><button onClick={load} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded text-sm">Apply</button></div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        {([['Total Bills', String(filtered.length)], ['Quantity', totals.qty.toFixed(3) + ' T'], ['Base Amount', '₹' + inr(totals.base)], ['Total Payable', '₹' + inr(totals.total)]] as [string, string][]).map(([l, v]) => (
          <div key={l} className="bg-white rounded-lg border border-gray-300 p-3"><div className="text-xs text-gray-500">{l}</div><div className="text-xl font-bold text-gray-900">{v}</div></div>
        ))}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>}

      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" /><span>Loading...</span></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-300">
                <tr>{['Bill No', 'Date', 'Supplier', 'Item', 'Vehicle', 'Qty (T)', 'Rate', 'Base Amt', 'GST', 'Total', 'Mode'].map(h => { const r = isNumericHeader(h); return <th key={h} className={`px-3 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap ${r?'text-right':'text-left'}`}>{h}</th>; })}</tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? <tr><td colSpan={11} className="px-3 py-8 text-center text-gray-400">No records found</td></tr> : filtered.map(b => (
                  <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-blue-600">{b.purchaseNo}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDateISO(b.purchaseDateTime)}</td>
                    <td className="px-3 py-2 max-w-32 truncate">{b.supplierNameSnapshot}</td>
                    <td className="px-3 py-2 max-w-28 truncate">{b.itemNameSnapshot}</td>
                    <td className="px-3 py-2">{b.vehicleNoSnapshot}</td>
                    <td className="px-3 py-2 text-right">{Number(b.netWeight).toFixed(3)}</td>
                    <td className="px-3 py-2 text-right">₹{inr(b.rate)}</td>
                    <td className="px-3 py-2 text-right">₹{inr(b.grossAmount)}</td>
                    <td className="px-3 py-2 text-right">₹{inr(b.gstAmount)}</td>
                    <td className="px-3 py-2 text-right font-semibold">₹{inr(b.grossPayable)}</td>
                    <td className="px-3 py-2">{b.paymentMode}</td>
                  </tr>
                ))}
              </tbody>
              {filtered.length > 0 && (
                <tfoot className="bg-gray-50 border-t-2 border-gray-300 font-semibold">
                  <tr>
                    <td colSpan={5} className="px-3 py-2 text-right text-xs text-gray-600">TOTALS</td>
                    <td className="px-3 py-2 text-right">{totals.qty.toFixed(3)}</td>
                    <td></td>
                    <td className="px-3 py-2 text-right">₹{inr(totals.base)}</td>
                    <td className="px-3 py-2 text-right">₹{inr(totals.gst)}</td>
                    <td className="px-3 py-2 text-right">₹{inr(totals.total)}</td>
                    <td></td>
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
