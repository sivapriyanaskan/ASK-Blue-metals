import { Fragment, useEffect, useMemo, useState } from 'react';
import { Search, Download, Calendar, Printer, Loader2 } from 'lucide-react';
import { SearchableDropdown, type SearchableDropdownOption } from '../components/ui/searchable-dropdown';
import { purchaseBillApi, type PurchaseBillRow } from '../services/operationsApi';
import { itemsApi, describeError, type ItemRow } from '../services/mastersApi';
import { downloadReportCSV, printReport, inr, fmtDateISO, isNumericHeader, type ReportColumn, currentMonthStart, currentMonthEnd } from '../utils/reportExport';

const fmt = (n: string | number) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const NA = '—';

const HEADERS = [
  'SL No', 'Entry No', 'Entry Date', 'Vehicle No', 'Driver Name',
  'Supplier Name', 'Rate', 'Qty', 'Taxable Amt', 'GST Total',
  'Total Amt', 'Pay. Mode', 'Created By',
] as const;
const COLSPAN = HEADERS.length;

export const PurchaseItemWise = () => {
  const [dateFrom, setDateFrom] = useState(currentMonthStart());
  const [dateTo, setDateTo] = useState(currentMonthEnd());
  const [itemId, setItemId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState<ItemRow[]>([]);
  const [bills, setBills] = useState<PurchaseBillRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { itemsApi.list({ pageSize: 200 }).then(r => setItems(r.items)).catch(() => {}); }, []);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await purchaseBillApi.list({ dateFrom, dateTo, pageSize: 200 });
      setBills(res.items);
    } catch (e) { setError(describeError(e, 'Failed to load purchase data')); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [dateFrom, dateTo]);

  const filtered = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return bills.filter(b => {
      if (itemId && b.itemId !== itemId) return false;
      if (s && !b.itemNameSnapshot.toLowerCase().includes(s)
        && !(b.item?.code ?? '').toLowerCase().includes(s)
        && !b.supplierNameSnapshot.toLowerCase().includes(s)
        && !b.vehicleNoSnapshot.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [bills, itemId, searchTerm]);

  // Group by item name and sort groups alphabetically for stable display.
  const grouped = useMemo(() => {
    const map = new Map<string, PurchaseBillRow[]>();
    for (const b of filtered) {
      const k = b.itemNameSnapshot || '—';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(b);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, rows]) => {
        const subtotal = rows.reduce((a, r) => ({
          qty: a.qty + Number(r.netWeight),
          taxable: a.taxable + Number(r.grossAmount),
          gst: a.gst + Number(r.gstAmount),
          total: a.total + Number(r.grossPayable),
        }), { qty: 0, taxable: 0, gst: 0, total: 0 });
        return { key, rows, subtotal };
      });
  }, [filtered]);

  // Flat ordered list (same order as grouped) used for export/print so they share the
  // same SL No sequence as on-screen rendering.
  const orderedRows = useMemo(() => grouped.flatMap(g => g.rows), [grouped]);

  const totals = useMemo(() => filtered.reduce((a, b) => ({
    qty: a.qty + Number(b.netWeight),
    taxable: a.taxable + Number(b.grossAmount),
    gst: a.gst + Number(b.gstAmount),
    total: a.total + Number(b.grossPayable),
  }), { qty: 0, taxable: 0, gst: 0, total: 0 }), [filtered]);

  const itemOpts: SearchableDropdownOption[] = [{ value: '', label: 'All Items' }, ...items.filter(i => i.isRawMaterial).map(i => ({ value: i.id, label: i.name }))];

  const columns = useMemo<ReportColumn<PurchaseBillRow>[]>(() => {
    // SL No restarts within each item group.
    const serialByRowId = new Map<string, number>();
    for (const g of grouped) {
      g.rows.forEach((r, i) => serialByRowId.set(r.id, i + 1));
    }
    return [
      { header: 'SL No', value: b => String(serialByRowId.get(b.id) ?? '') },
      { header: 'Entry No', value: b => b.purchaseNo },
      { header: 'Entry Date', value: b => fmtDateISO(b.purchaseDateTime) },
      { header: 'Vehicle No', value: b => b.vehicleNoSnapshot },
      { header: 'Driver Name', value: b => b.driverNameSnapshot ?? NA },
      { header: 'Supplier Name', value: b => b.supplierNameSnapshot },
      { header: 'Rate', value: b => inr(b.rate), align: 'right' },
      { header: 'Qty', value: b => Number(b.netWeight).toFixed(3), align: 'right' },
      { header: 'Taxable Amt', value: b => inr(b.grossAmount), align: 'right' },
      { header: 'GST Total', value: b => inr(b.gstAmount), align: 'right' },
      { header: 'Total Amt', value: b => inr(b.grossPayable), align: 'right' },
      { header: 'Pay. Mode', value: b => b.paymentMode },
      { header: 'Created By', value: b => b.createdByName ?? NA },
    ];
  }, [grouped]);

  const meta = () => ({
    title: 'Purchase Item Wise',
    subtitle: [
      `From ${fmtDateISO(dateFrom)} to ${fmtDateISO(dateTo)}`,
      itemId ? `Item: ${items.find(i => i.id === itemId)?.name ?? ''}` : 'All Items',
      searchTerm ? `Search: ${searchTerm}` : '',
    ].filter(Boolean) as string[],
    groupBy: (b: PurchaseBillRow) => b.itemNameSnapshot || '—',
    groupLabel: 'Item Name',
  });
  const handleDownload = () => downloadReportCSV(orderedRows, columns, meta());
  const handlePrint = () => printReport(orderedRows, columns, meta());

  const td = (children: React.ReactNode, extra = '') => (
    <td className={`px-3 py-1.5 text-xs whitespace-nowrap ${extra}`}>{children}</td>
  );
  const tdr = (children: React.ReactNode, extra = '') => td(children, `text-right ${extra}`);

  return (
    <div className="p-6">
      <div className="mb-4 pb-3 border-b border-gray-300 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Purchase Item Wise</h1>
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
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Item</label>
            <SearchableDropdown options={itemOpts} value={itemId} onValueChange={setItemId} placeholder="All Items" /></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
            <div className="relative"><Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Supplier / Vehicle / Item…" className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded" /></div>
          </div>
          <div className="flex items-end"><button onClick={load} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded text-sm">Apply</button></div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        {([['Bills', String(filtered.length)], ['Quantity', totals.qty.toFixed(3) + ' T'], ['Taxable', '₹' + fmt(totals.taxable)], ['Total Amount', '₹' + fmt(totals.total)]] as [string, string][]).map(([l, v]) => (
          <div key={l} className="bg-white rounded-lg border border-gray-300 p-3"><div className="text-xs text-gray-500">{l}</div><div className="text-xl font-bold text-gray-900">{v}</div></div>
        ))}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>}

      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" /><span>Loading...</span></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-300">
                <tr>{HEADERS.map(h => {
                  const r = isNumericHeader(h);
                  return <th key={h} className={`px-3 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap ${r ? 'text-right' : 'text-left'}`}>{h}</th>;
                })}</tr>
              </thead>
              <tbody>
                {grouped.length === 0 ? <tr><td colSpan={COLSPAN} className="px-3 py-8 text-center text-gray-400">No records found</td></tr>
                : grouped.map(g => (
                  <Fragment key={g.key}>
                    <tr className="bg-indigo-50 border-y-2 border-indigo-200">
                      <td colSpan={COLSPAN} className="px-3 py-2 text-sm font-bold text-gray-800">
                        Item Name <span className="mx-2">:</span> {g.key}
                      </td>
                    </tr>
                    {g.rows.map((b, i) => (
                      <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
                        {td(i + 1)}
                        {td(b.purchaseNo, 'font-mono text-blue-600')}
                        {td(new Date(b.purchaseDateTime).toLocaleDateString('en-IN'))}
                        {td(b.vehicleNoSnapshot)}
                        {td(b.driverNameSnapshot ?? NA)}
                        {td(b.supplierNameSnapshot, 'font-medium text-gray-800')}
                        {tdr(`₹${fmt(b.rate)}`)}
                        {tdr(Number(b.netWeight).toFixed(3))}
                        {tdr(`₹${fmt(b.grossAmount)}`)}
                        {tdr(`₹${fmt(b.gstAmount)}`)}
                        {tdr(`₹${fmt(b.grossPayable)}`, 'font-semibold')}
                        {td(b.paymentMode)}
                        {td(b.createdByName ?? NA)}
                      </tr>
                    ))}
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold">
                      <td colSpan={7} className="px-3 py-1.5 text-right text-gray-600">Subtotal</td>
                      <td className="px-3 py-1.5 text-right">{g.subtotal.qty.toFixed(3)}</td>
                      <td className="px-3 py-1.5 text-right">₹{fmt(g.subtotal.taxable)}</td>
                      <td className="px-3 py-1.5 text-right">₹{fmt(g.subtotal.gst)}</td>
                      <td className="px-3 py-1.5 text-right text-green-700">₹{fmt(g.subtotal.total)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
              {orderedRows.length > 0 && (
                <tfoot className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                  <tr>
                    <td colSpan={7} className="px-3 py-2 text-right text-xs text-gray-600">GRAND TOTAL</td>
                    <td className="px-3 py-2 text-right">{totals.qty.toFixed(3)}</td>
                    <td className="px-3 py-2 text-right">₹{fmt(totals.taxable)}</td>
                    <td className="px-3 py-2 text-right">₹{fmt(totals.gst)}</td>
                    <td className="px-3 py-2 text-right text-green-700">₹{fmt(totals.total)}</td>
                    <td colSpan={2}></td>
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
