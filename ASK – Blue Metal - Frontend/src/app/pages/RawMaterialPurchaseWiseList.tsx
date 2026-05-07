import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Plus, Search, Eye, Loader2, Pencil } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';
import { rawMaterialEntryApi, type RawMaterialEntryRow } from '../services/operationsApi';
import { itemsApi, describeError } from '../services/mastersApi';

const fmtTonn = (s: string | number) => Number(s).toLocaleString('en-IN', { minimumFractionDigits: 3 });
const statusColor: Record<string, string> = {
  SAVED: 'bg-yellow-100 text-yellow-800',
  POSTED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export const RawMaterialPurchaseWiseList = () => {
  const [rows, setRows] = useState<RawMaterialEntryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemFilter, setItemFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [itemOptions, setItemOptions] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    itemsApi.list({ pageSize: 200 }).then(r =>
      setItemOptions(r.items.map(it => ({ label: it.name, value: it.id })))
    ).catch(() => {});
  }, []);

  const reload = async () => {
    setLoading(true); setError(null);
    try {
      const res = await rawMaterialEntryApi.list({
        pageSize: 200,
        source: 'PURCHASE_WISE',
        itemId: itemFilter || undefined,
        status: (statusFilter as RawMaterialEntryRow['status']) || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setRows(res.items);
    } catch (err) { setError(describeError(err, 'Failed to load raw material entries')); }
    finally { setLoading(false); }
  };

  useEffect(() => { void reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [itemFilter, statusFilter, dateFrom, dateTo]);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const q = searchTerm.toLowerCase();
    return rows.filter(r => r.entryNo.toLowerCase().includes(q) || r.itemNameSnapshot.toLowerCase().includes(q));
  }, [rows, searchTerm]);

  const totalConsumed = filtered.reduce((s, r) => s + Number(r.consumedTonn), 0);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Raw Material – Purchase Wise</h1>
          <p className="text-sm text-gray-500">Raw material consumption entries grouped by purchase.</p>
        </div>
        <Link
          to="/production/purchase-wise/create"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" /> New Entry
        </Link>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-500">Total Entries</div>
          <div className="text-2xl font-bold text-gray-900">{filtered.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-500">Total Consumed (T)</div>
          <div className="text-2xl font-bold text-blue-600">{fmtTonn(totalConsumed)}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-300 p-4 mb-6">
        <div className="grid grid-cols-4 gap-3">
          <div className="col-span-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search entry or item…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <SearchableDropdown
            options={[{ value: '', label: 'All Items' }, ...itemOptions]}
            value={itemFilter}
            onValueChange={setItemFilter}
            placeholder="All Items"
          />
          <SearchableDropdown
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'SAVED', label: 'Saved' },
              { value: 'POSTED', label: 'Posted' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
            value={statusFilter}
            onValueChange={setStatusFilter}
            placeholder="All Statuses"
          />
          <div className="flex gap-2">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-300">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entry No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date &amp; Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Opening Stock (T)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Consumed (T)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Closing (T)</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{idx + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-blue-600">{r.entryNo}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{new Date(r.entryDateTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      <div className="text-xs text-gray-500">{new Date(r.entryDateTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{r.itemNameSnapshot}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-gray-700">{fmtTonn(r.currentStockTonn)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-mono font-semibold text-red-600">{fmtTonn(r.consumedTonn)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-mono font-semibold text-green-600">{fmtTonn(r.closingStockTonn)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[r.status] ?? 'bg-gray-100 text-gray-700'}`}>{r.status}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="inline-flex items-center gap-1">
                        <Link to={`/production/purchase-wise/${r.id}`} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="View">
                          <Eye className="w-4 h-4" />
                        </Link>
                        {r.status !== 'CANCELLED' && (
                          <Link to={`/production/purchase-wise/edit/${r.id}`} className="p-1 text-amber-600 hover:bg-amber-50 rounded" title="Edit">
                            <Pencil className="w-4 h-4" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">No entries found</div>
        )}
        <div className="border-t border-gray-300 px-6 py-3 bg-gray-50 text-sm text-gray-600">
          Showing {filtered.length} of {rows.length} entries
        </div>
      </div>
    </div>
  );
};
