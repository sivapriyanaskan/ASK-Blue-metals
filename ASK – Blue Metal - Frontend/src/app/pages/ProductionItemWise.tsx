import { useEffect, useMemo, useState } from 'react';
import { Search, Download, Calendar, Printer, Loader2 } from 'lucide-react';
import { SearchableDropdown, type SearchableDropdownOption } from '../components/ui/searchable-dropdown';
import { rawMaterialEntryApi, type RawMaterialEntryRow } from '../services/operationsApi';
import { itemsApi, describeError, type ItemRow } from '../services/mastersApi';
import { usersApi, type UserRow } from '../services/iamApi';
import { downloadReportCSV, printReport, fmtDateISO, isNumericHeader, type ReportColumn, currentMonthStart, currentMonthEnd } from '../utils/reportExport';

const NA = '—';

const fmtTime = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const HEADERS = [
  'Sl No', 'Entry Date', 'Time', 'Entry No', 'Item Name',
  'OP. Stock (Tonn)', 'Consumed Stock (Tonn)', 'Closing Stock (Tonn)', 'Created By',
] as const;
const COLSPAN = HEADERS.length;

interface Row {
  e: RawMaterialEntryRow;
  createdByName: string;
}

export const ProductionItemWise = () => {
  const [dateFrom, setDateFrom] = useState(currentMonthStart());
  const [dateTo, setDateTo] = useState(currentMonthEnd());
  const [itemId, setItemId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState<ItemRow[]>([]);
  const [entries, setEntries] = useState<RawMaterialEntryRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { itemsApi.list({ pageSize: 200 }).then(r => setItems(r.items)).catch(() => {}); }, []);
  useEffect(() => { usersApi.list({ pageSize: 200 }).then(r => setUsers(r.items)).catch(() => {}); }, []);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await rawMaterialEntryApi.list({ dateFrom, dateTo, itemId: itemId || undefined, pageSize: 200 });
      setEntries(res.items);
    } catch (e) { setError(describeError(e, 'Failed to load production data')); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [dateFrom, dateTo, itemId]);

  const rows = useMemo((): Row[] => {
    const userById = new Map(users.map(u => [u.id, [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.username]));
    const s = searchTerm.toLowerCase();
    return [...entries]
      .sort((a, b) => a.entryDateTime.localeCompare(b.entryDateTime))
      .filter(e => !s || e.itemNameSnapshot.toLowerCase().includes(s) || e.entryNo.toLowerCase().includes(s))
      .map(e => ({ e, createdByName: userById.get(e.createdById) ?? NA }));
  }, [entries, users, searchTerm]);

  const totals = useMemo(() => rows.reduce((a, r) => ({
    op: a.op + Number(r.e.currentStockTonn),
    consumed: a.consumed + Number(r.e.consumedTonn),
    closing: a.closing + Number(r.e.closingStockTonn),
  }), { op: 0, consumed: 0, closing: 0 }), [rows]);

  const itemOpts: SearchableDropdownOption[] = [{ value: '', label: 'All Items' }, ...items.filter(i => i.isRawMaterial).map(i => ({ value: i.id, label: i.name }))];

  const columns: ReportColumn<Row>[] = useMemo(() => {
    let serial = 0;
    return [
      { header: 'Sl No', value: () => String(++serial), align: 'right' },
      { header: 'Entry Date', value: r => fmtDateISO(r.e.entryDateTime) },
      { header: 'Time', value: r => fmtTime(r.e.entryDateTime) },
      { header: 'Entry No', value: r => r.e.entryNo },
      { header: 'Item Name', value: r => r.e.itemNameSnapshot },
      { header: 'OP. Stock (Tonn)', value: r => Number(r.e.currentStockTonn).toFixed(3), align: 'right' },
      { header: 'Consumed Stock (Tonn)', value: r => Number(r.e.consumedTonn).toFixed(3), align: 'right' },
      { header: 'Closing Stock (Tonn)', value: r => Number(r.e.closingStockTonn).toFixed(3), align: 'right' },
      { header: 'Created By', value: r => r.createdByName },
    ];
  }, [rows]);

  const meta = () => ({
    title: 'Production Item Wise',
    subtitle: [
      `From ${fmtDateISO(dateFrom)} to ${fmtDateISO(dateTo)}`,
      itemId ? `Item: ${items.find(i => i.id === itemId)?.name ?? ''}` : 'All Items',
      searchTerm ? `Search: ${searchTerm}` : '',
    ].filter(Boolean) as string[],
  });
  const handleDownload = () => downloadReportCSV(rows, columns, meta());
  const handlePrint = () => printReport(rows, columns, meta());

  return (
    <div className="p-6">
      <div className="mb-4 pb-3 border-b border-gray-300 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Production Item Wise</h1>
        <div className="flex gap-2">
          <button onClick={handleDownload} disabled={!rows.length} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"><Download className="w-3 h-3" />Excel</button>
          <button onClick={handlePrint} disabled={!rows.length} className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"><Printer className="w-3 h-3" />Print</button>
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
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Item / Entry No…" className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded" /></div>
          </div>
          <div className="flex items-end"><button onClick={load} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded text-sm">Apply</button></div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        {([['Entries', String(rows.length)], ['OP. Stock', totals.op.toFixed(3) + ' T'], ['Consumed', totals.consumed.toFixed(3) + ' T'], ['Closing Stock', totals.closing.toFixed(3) + ' T']] as [string, string][]).map(([l, v]) => (
          <div key={l} className="bg-white rounded-lg border border-gray-300 p-3"><div className="text-xs text-gray-500">{l}</div><div className="text-xl font-bold text-gray-900">{v}</div></div>
        ))}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>}

      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" /><span>Loading...</span></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-300">
                <tr>{HEADERS.map(h => { const r = isNumericHeader(h); return <th key={h} className={`px-3 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap ${r?'text-right':'text-left'}`}>{h}</th>; })}</tr>
              </thead>
              <tbody>
                {rows.length === 0 ? <tr><td colSpan={COLSPAN} className="px-3 py-8 text-center text-gray-400">No records found</td></tr> : rows.map((r, i) => (
                  <tr key={r.e.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs text-right">{i + 1}</td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap">{fmtDateISO(r.e.entryDateTime)}</td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap">{fmtTime(r.e.entryDateTime)}</td>
                    <td className="px-3 py-2 text-xs font-mono text-blue-600">{r.e.entryNo}</td>
                    <td className="px-3 py-2 text-xs font-medium">{r.e.itemNameSnapshot}</td>
                    <td className="px-3 py-2 text-xs text-right">{Number(r.e.currentStockTonn).toFixed(3)}</td>
                    <td className="px-3 py-2 text-xs text-right text-orange-600">{Number(r.e.consumedTonn).toFixed(3)}</td>
                    <td className="px-3 py-2 text-xs text-right font-semibold text-green-700">{Number(r.e.closingStockTonn).toFixed(3)}</td>
                    <td className="px-3 py-2 text-xs">{r.createdByName}</td>
                  </tr>
                ))}
              </tbody>
              {rows.length > 0 && (
                <tfoot className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                  <tr>
                    <td colSpan={5} className="px-3 py-2 text-right text-xs text-gray-600">GRAND TOTAL</td>
                    <td className="px-3 py-2 text-right text-xs">{totals.op.toFixed(3)}</td>
                    <td className="px-3 py-2 text-right text-xs text-orange-700">{totals.consumed.toFixed(3)}</td>
                    <td className="px-3 py-2 text-right text-xs text-green-700">{totals.closing.toFixed(3)}</td>
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

