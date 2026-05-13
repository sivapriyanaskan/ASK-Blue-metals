import { useEffect, useMemo, useState } from 'react';
import { Search, Download, Calendar, Printer, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { SearchableDropdown, type SearchableDropdownOption } from '../components/ui/searchable-dropdown';
import { purchaseBillApi, type PurchaseBillRow } from '../services/operationsApi';
import { suppliersApi, describeError, type SupplierRow } from '../services/mastersApi';
import { downloadReportCSV, printReport, inr, fmtDateISO, isNumericHeader, type ReportColumn, currentMonthStart, currentMonthEnd } from '../utils/reportExport';

interface SupplierGroup {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  bills: PurchaseBillRow[];
  totalQty: number;
  totalAmount: number;
}

export const PurchaseSupplierWise = () => {
  const [dateFrom, setDateFrom] = useState(currentMonthStart());
  const [dateTo, setDateTo] = useState(currentMonthEnd());
  const [supplierId, setSupplierId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [bills, setBills] = useState<PurchaseBillRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => { suppliersApi.list({ pageSize: 200 }).then(r => setSuppliers(r.items)).catch(() => {}); }, []);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await purchaseBillApi.list({ dateFrom, dateTo, supplierId: supplierId || undefined, pageSize: 200 });
      setBills(res.items);
    } catch (e) { setError(describeError(e, 'Failed to load purchase data')); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [dateFrom, dateTo, supplierId]);

  const groups = useMemo((): SupplierGroup[] => {
    const map: Record<string, SupplierGroup> = {};
    for (const b of bills) {
      const s = searchTerm.toLowerCase();
      if (s && !b.supplierNameSnapshot.toLowerCase().includes(s) && !(b.supplier?.code ?? '').toLowerCase().includes(s)) continue;
      if (!map[b.supplierId]) {
        map[b.supplierId] = { supplierId: b.supplierId, supplierCode: b.supplier?.code ?? '—', supplierName: b.supplierNameSnapshot, bills: [], totalQty: 0, totalAmount: 0 };
      }
      const g = map[b.supplierId];
      g.bills.push(b);
      g.totalQty += Number(b.netWeight);
      g.totalAmount += Number(b.grossPayable);
    }
    return Object.values(map).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [bills, searchTerm]);

  const totals = useMemo(() => groups.reduce((a, g) => ({
    bills: a.bills + g.bills.length, qty: a.qty + g.totalQty, amount: a.amount + g.totalAmount,
  }), { bills: 0, qty: 0, amount: 0 }), [groups]);

  const supOpts: SearchableDropdownOption[] = [{ value: '', label: 'All Suppliers' }, ...suppliers.map(s => ({ value: s.id, label: s.name }))];

  type Row = { isHeader: boolean; g: SupplierGroup; b?: PurchaseBillRow };
  const exportRows: Row[] = useMemo(() => {
    const out: Row[] = [];
    for (const g of groups) {
      out.push({ isHeader: true, g });
      for (const b of g.bills) out.push({ isHeader: false, g, b });
    }
    return out;
  }, [groups]);
  const columns: ReportColumn<Row>[] = [
    { header: 'Supplier', value: r => r.isHeader ? `${r.g.supplierCode} — ${r.g.supplierName}` : `  ${r.b?.purchaseNo ?? ''} — ${r.b ? fmtDateISO(r.b.purchaseDateTime) : ''} — ${r.b?.itemNameSnapshot ?? ''}` },
    { header: 'Bills', value: r => r.isHeader ? r.g.bills.length : '', align: 'right' },
    { header: 'Qty (T)', value: r => r.isHeader ? r.g.totalQty.toFixed(3) : (r.b ? Number(r.b.netWeight).toFixed(3) : ''), align: 'right' },
    { header: 'Rate', value: r => r.b ? inr(r.b.rate) : '', align: 'right' },
    { header: 'Amount', value: r => r.isHeader ? inr(r.g.totalAmount) : (r.b ? inr(r.b.grossPayable) : ''), align: 'right' },
  ];
  const meta = () => ({
    title: 'Purchase Supplier Wise',
    subtitle: [
      `From ${fmtDateISO(dateFrom)} to ${fmtDateISO(dateTo)}`,
      supplierId ? `Supplier: ${suppliers.find(s => s.id === supplierId)?.name ?? ''}` : 'All Suppliers',
      searchTerm ? `Search: ${searchTerm}` : '',
    ].filter(Boolean) as string[],
    totals: [`GRAND TOTAL (${groups.length} suppliers)`, totals.bills, totals.qty.toFixed(3), '', inr(totals.amount)],
  });
  const handleDownload = () => downloadReportCSV(exportRows, columns, meta());
  const handlePrint = () => printReport(exportRows, columns, meta());

  const toggle = (id: string) => setExpanded(e => { const n = new Set(e); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className="p-6">
      <div className="mb-4 pb-3 border-b border-gray-300 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Purchase Supplier Wise</h1>
        <div className="flex gap-2">
          <button onClick={handleDownload} disabled={!groups.length} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"><Download className="w-3 h-3" />Excel</button>
          <button onClick={handlePrint} disabled={!groups.length} className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"><Printer className="w-3 h-3" />Print</button>
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
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Supplier name or code…" className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded" /></div>
          </div>
          <div className="flex items-end"><button onClick={load} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded text-sm">Apply</button></div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        {([['Suppliers', String(groups.length)], ['Bills', String(totals.bills)], ['Quantity', totals.qty.toFixed(3) + ' T'], ['Total Amount', '₹' + inr(totals.amount)]] as [string, string][]).map(([l, v]) => (
          <div key={l} className="bg-white rounded-lg border border-gray-300 p-3"><div className="text-xs text-gray-500">{l}</div><div className="text-xl font-bold text-gray-900">{v}</div></div>
        ))}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>}

      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" /><span>Loading...</span></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-300">
                <tr>
                  <th className="px-3 py-2 w-8"></th>
                  {['Code', 'Supplier', 'Bills', 'Qty (T)', 'Total Amount'].map(h => { const r = isNumericHeader(h); return <th key={h} className={`px-3 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap ${r?'text-right':'text-left'}`}>{h}</th>; })}
                </tr>
              </thead>
              <tbody>
                {groups.length === 0 ? <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-400">No records found</td></tr> : groups.flatMap(g => [
                  <tr key={g.supplierId} onClick={() => toggle(g.supplierId)} className="border-b border-gray-300 hover:bg-blue-50 cursor-pointer bg-blue-50/30">
                    <td className="px-3 py-2">{expanded.has(g.supplierId) ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}</td>
                    <td className="px-3 py-2 font-mono text-xs">{g.supplierCode}</td>
                    <td className="px-3 py-2 font-medium">{g.supplierName}</td>
                    <td className="px-3 py-2 text-right font-medium">{g.bills.length}</td>
                    <td className="px-3 py-2 text-right font-medium">{g.totalQty.toFixed(3)}</td>
                    <td className="px-3 py-2 text-right font-bold text-green-700">₹{inr(g.totalAmount)}</td>
                  </tr>,
                  ...(expanded.has(g.supplierId) ? g.bills.map(b => (
                    <tr key={b.id} className="border-b border-gray-100 bg-gray-50/50">
                      <td></td>
                      <td className="px-3 py-1.5 text-xs font-mono text-blue-600">{b.purchaseNo}</td>
                      <td className="px-3 py-1.5 text-xs text-gray-700">{fmtDateISO(b.purchaseDateTime)} | {b.itemNameSnapshot}</td>
                      <td></td>
                      <td className="px-3 py-1.5 text-xs text-right">{Number(b.netWeight).toFixed(3)}</td>
                      <td className="px-3 py-1.5 text-xs text-right">₹{inr(b.grossPayable)}</td>
                    </tr>
                  )) : []),
                ])}
              </tbody>
              {groups.length > 0 && (
                <tfoot className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-right text-xs text-gray-600">GRAND TOTAL</td>
                    <td className="px-3 py-2 text-right">{totals.bills}</td>
                    <td className="px-3 py-2 text-right">{totals.qty.toFixed(3)}</td>
                    <td className="px-3 py-2 text-right text-green-700">₹{inr(totals.amount)}</td>
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
