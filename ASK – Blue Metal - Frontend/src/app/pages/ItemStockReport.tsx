import { useEffect, useMemo, useState } from 'react';
import { Search, Loader2, Download, Printer } from 'lucide-react';
import { salesBillApi, purchaseBillApi, rawMaterialEntryApi } from '../services/operationsApi';
import { itemsApi, describeError, type ItemRow } from '../services/mastersApi';
import { downloadReportCSV, printReport, isNumericHeader, currentMonthStart, currentMonthEnd, type ReportColumn } from '../utils/reportExport';

const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const ItemStockReport = () => {
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState(currentMonthStart());
  const [toDate, setToDate] = useState(currentMonthEnd());
  const [items, setItems] = useState<ItemRow[]>([]);
  const [soldMap, setSoldMap] = useState<Record<string, number>>({});
  const [purchasedMap, setPurchasedMap] = useState<Record<string, number>>({});
  const [consumedMap, setConsumedMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const dateRange = { dateFrom: fromDate || undefined, dateTo: toDate || undefined };
      const [itemsRes, salesRes, purchaseRes, rmRes] = await Promise.all([
        itemsApi.list({ pageSize: 200 }),
        salesBillApi.list({ pageSize: 200, status: 'POSTED', ...dateRange }),
        purchaseBillApi.list({ pageSize: 200, status: 'POSTED', ...dateRange } as any),
        rawMaterialEntryApi.list({ pageSize: 200, ...dateRange }),
      ]);
      setItems(itemsRes.items);
      const sold: Record<string, number> = {};
      for (const b of salesRes.items) sold[b.itemId] = (sold[b.itemId] ?? 0) + Number(b.netWeight);
      setSoldMap(sold);
      const purchased: Record<string, number> = {};
      for (const b of purchaseRes.items) purchased[b.itemId] = (purchased[b.itemId] ?? 0) + Number(b.netWeight);
      setPurchasedMap(purchased);
      const consumed: Record<string, number> = {};
      for (const r of rmRes.items) consumed[r.itemId] = (consumed[r.itemId] ?? 0) + Number(r.consumedTonn);
      setConsumedMap(consumed);
    } catch (e) { setError(describeError(e, 'Failed to load stock report')); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const rows = useMemo(() => items
    .filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.code.toLowerCase().includes(search.toLowerCase()))
    .map(i => ({
      ...i,
      purchased: purchasedMap[i.id] ?? 0,
      sold: soldMap[i.id] ?? 0,
      consumed: consumedMap[i.id] ?? 0,
      closing: (purchasedMap[i.id] ?? 0) - (soldMap[i.id] ?? 0) - (consumedMap[i.id] ?? 0),
    })), [items, soldMap, purchasedMap, consumedMap, search]);

  type StockRow = typeof rows[number];
  const columns: ReportColumn<StockRow>[] = [
    { header: 'Code', value: r => r.code },
    { header: 'Item Name', value: r => r.name },
    { header: 'Type', value: r => [r.isRawMaterial ? 'Raw' : '', r.isSaleMaterial ? 'Sale' : ''].filter(Boolean).join('/') },
    { header: 'Purchased (T)', value: r => r.purchased.toFixed(2), align: 'right' },
    { header: 'Sold (T)', value: r => r.sold.toFixed(2), align: 'right' },
    { header: 'Consumed (T)', value: r => r.consumed.toFixed(2), align: 'right' },
    { header: 'Closing Stock (T)', value: r => r.closing.toFixed(2), align: 'right' },
    { header: 'Selling Price', value: r => Number(r.sellingPrice).toFixed(2), align: 'right' },
  ];
  const meta = () => ({
    title: 'Item Stock Report',
    subtitle: [
      `Period: ${fromDate || '—'} to ${toDate || '—'}`,
      search ? `Search: ${search}` : 'All Items',
      `Generated ${new Date().toLocaleString('en-IN')}`,
    ],
  });
  const handleDownload = () => downloadReportCSV(rows, columns, meta());
  const handlePrint = () => printReport(rows, columns, meta());

  return (
    <div className="p-6">
      <div className="mb-4 pb-3 border-b border-gray-300 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Item Stock Report</h1>
          <p className="text-sm text-gray-500">Stock computed from DB sales, purchases and consumption</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDownload} disabled={!rows.length} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"><Download className="w-3 h-3" />Excel</button>
          <button onClick={handlePrint} disabled={!rows.length} className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"><Printer className="w-3 h-3" />Print</button>
          <button onClick={load} className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded text-sm">Refresh</button>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-gray-300 p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items…" className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded" />
            </div>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={load}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm"
          >
            Apply
          </button>
        </div>
      </div>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>}
      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" /><span>Loading...</span></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-300">
                <tr>{['Code','Item Name','Type','Purchased (T)','Sold (T)','Consumed (T)','Closing Stock (T)','Selling Price'].map(h=>{ const r = isNumericHeader(h); return <th key={h} className={`px-3 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap ${r?'text-right':'text-left'}`}>{h}</th>; })}</tr>
              </thead>
              <tbody>
                {rows.length === 0 ? <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-400">No items found</td></tr>
                : rows.map(r=>(
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs">{r.code}</td>
                    <td className="px-3 py-2 font-medium">{r.name}</td>
                    <td className="px-3 py-2">
                      {r.isRawMaterial && <span className="px-1.5 py-0.5 rounded text-xs bg-orange-100 text-orange-700 mr-1">Raw</span>}
                      {r.isSaleMaterial && <span className="px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700">Sale</span>}
                    </td>
                    <td className="px-3 py-2 text-right">{fmt(r.purchased)}</td>
                    <td className="px-3 py-2 text-right text-orange-600">{fmt(r.sold)}</td>
                    <td className="px-3 py-2 text-right text-red-600">{fmt(r.consumed)}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${r.closing < 0 ? 'text-red-600' : 'text-green-700'}`}>{fmt(r.closing)}</td>
                    <td className="px-3 py-2 text-right">₹{Number(r.sellingPrice).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
