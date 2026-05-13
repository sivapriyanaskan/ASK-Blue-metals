import { useEffect, useMemo, useState } from 'react';
import { Calendar, Download, Printer, Loader2 } from 'lucide-react';
import { rawMaterialEntryApi, type RawMaterialEntryRow } from '../services/operationsApi';
import { itemsApi, describeError, type ItemRow } from '../services/mastersApi';
import { SearchableDropdown, type SearchableDropdownOption } from '../components/ui/searchable-dropdown';
import { downloadReportCSV, printReport, fmtDateISO, isNumericHeader, type ReportColumn, currentMonthStart, currentMonthEnd } from '../utils/reportExport';

const fmt2 = (n: string | number) => Number(n).toFixed(2);
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN');

export const ProductionRegister = () => {
  const [dateFrom, setDateFrom] = useState(currentMonthStart());
  const [dateTo, setDateTo] = useState(currentMonthEnd());
  const [itemId, setItemId] = useState('');
  const [records, setRecords] = useState<RawMaterialEntryRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    itemsApi.list({ pageSize: 200 }).then(r => setItems(r.items)).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await rawMaterialEntryApi.list({ dateFrom, dateTo, itemId: itemId || undefined, pageSize: 200 });
      setRecords(res.items);
    } catch (e) { setError(describeError(e, 'Failed to load production register')); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [dateFrom, dateTo, itemId]);

  const totals = useMemo(() => records.reduce((a, r) => ({
    consumed: a.consumed + Number(r.consumedTonn),
    closing: a.closing + Number(r.closingStockTonn),
  }), { consumed: 0, closing: 0 }), [records]);

  const itemOpts: SearchableDropdownOption[] = [
    { value: '', label: 'All Items' },
    ...items.filter(i => i.isRawMaterial).map(i => ({ value: i.id, label: i.name })),
  ];

  const columns: ReportColumn<RawMaterialEntryRow>[] = [
    { header: 'Entry No', value: r => r.entryNo },
    { header: 'Date', value: r => fmtDateISO(r.entryDateTime) },
    { header: 'Raw Material', value: r => r.itemNameSnapshot },
    { header: 'Current Stock (T)', value: r => Number(r.currentStockTonn).toFixed(2), align: 'right' },
    { header: 'Consumed (T)', value: r => Number(r.consumedTonn).toFixed(2), align: 'right' },
    { header: 'Closing Stock (T)', value: r => Number(r.closingStockTonn).toFixed(2), align: 'right' },
    { header: 'Status', value: r => r.status },
  ];
  const meta = () => ({
    title: 'Production Register',
    subtitle: [
      `From ${fmtDateISO(dateFrom)} to ${fmtDateISO(dateTo)}`,
      itemId ? `Raw Material: ${items.find(i => i.id === itemId)?.name ?? ''}` : 'All Items',
    ],
    totals: ['TOTALS', '', '', '', totals.consumed.toFixed(2), totals.closing.toFixed(2), ''],
  });
  const handleDownload = () => downloadReportCSV(records, columns, meta());
  const handlePrint = () => printReport(records, columns, meta());

  return (
    <div className="p-6">
      <div className="mb-4 pb-3 border-b border-gray-300 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Production Register</h1>
          <p className="text-sm text-gray-500">Raw material consumption entries from DB</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDownload} disabled={!records.length} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"><Download className="w-3 h-3" />Excel</button>
          <button onClick={handlePrint} disabled={!records.length} className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"><Printer className="w-3 h-3" />Print</button>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-gray-300 p-4 mb-4">
        <div className="grid grid-cols-4 gap-3">
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
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Raw Material</label>
            <SearchableDropdown options={itemOpts} value={itemId} onValueChange={setItemId} placeholder="All Items" /></div>
          <div className="flex items-end"><button onClick={load} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded text-sm">Apply</button></div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-4">
        {([['Total Entries', String(records.length)], ['Total Consumed', totals.consumed.toFixed(2)+' T'], ['Closing Stock', totals.closing.toFixed(2)+' T']] as [string,string][]).map(([l,v]) => (
          <div key={l} className="bg-white rounded-lg border border-gray-300 p-3"><div className="text-xs text-gray-500">{l}</div><div className="text-xl font-bold text-gray-900">{v}</div></div>
        ))}
      </div>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>}
      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" /><span>Loading...</span></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-300">
                <tr>{['Entry No','Date','Raw Material','Current Stock (T)','Consumed (T)','Closing Stock (T)','Status'].map(h=>{ const r = isNumericHeader(h); return <th key={h} className={`px-3 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap ${r?'text-right':'text-left'}`}>{h}</th>; })}</tr>
              </thead>
              <tbody>
                {records.length === 0 ? <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400">No records found</td></tr>
                : records.map(r=>(
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-blue-600">{r.entryNo}</td>
                    <td className="px-3 py-2">{fmtDate(r.entryDateTime)}</td>
                    <td className="px-3 py-2">{r.itemNameSnapshot}</td>
                    <td className="px-3 py-2 text-right">{fmt2(r.currentStockTonn)}</td>
                    <td className="px-3 py-2 text-right text-orange-600">{fmt2(r.consumedTonn)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{fmt2(r.closingStockTonn)}</td>
                    <td className="px-3 py-2"><span className={r.status==='POSTED'?'px-2 py-0.5 rounded text-xs bg-green-100 text-green-700':'px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700'}>{r.status}</span></td>
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
