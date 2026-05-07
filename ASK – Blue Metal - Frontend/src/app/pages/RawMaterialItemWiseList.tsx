import { useEffect, useMemo, useState } from 'react';
import { Search, Loader2, Package } from 'lucide-react';
import { rawMaterialEntryApi, type RawMaterialEntryRow } from '../services/operationsApi';
import { describeError } from '../services/mastersApi';

const fmtTonn = (n: number) =>
  Number.isFinite(n) ? n.toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : '0.000';

interface ItemAggregate {
  itemId: string;
  itemName: string;
  totalPurchased: number;
  totalConsumed: number;
  balance: number;
  entryCount: number;
  lastEntryDate: string;
}

export const RawMaterialItemWiseList = () => {
  const [rows, setRows] = useState<RawMaterialEntryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      // Item-wise view aggregates Purchase-wise entries per item.
      const res = await rawMaterialEntryApi.list({
        pageSize: 200,
        source: 'PURCHASE_WISE',
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      // Exclude cancelled rows from aggregation.
      setRows(res.items.filter((r) => r.status !== 'CANCELLED'));
    } catch (err) {
      setError(describeError(err, 'Failed to load raw material entries'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  const aggregates = useMemo<ItemAggregate[]>(() => {
    const map = new Map<string, ItemAggregate>();
    for (const r of rows) {
      const purchased = Number(r.currentStockTonn) || 0;
      const consumed = Number(r.consumedTonn) || 0;
      const balance = Number(r.closingStockTonn) || 0;
      const existing = map.get(r.itemId);
      if (existing) {
        existing.totalPurchased += purchased;
        existing.totalConsumed += consumed;
        existing.balance += balance;
        existing.entryCount += 1;
        if (r.entryDateTime > existing.lastEntryDate) existing.lastEntryDate = r.entryDateTime;
      } else {
        map.set(r.itemId, {
          itemId: r.itemId,
          itemName: r.itemNameSnapshot,
          totalPurchased: purchased,
          totalConsumed: consumed,
          balance,
          entryCount: 1,
          lastEntryDate: r.entryDateTime,
        });
      }
    }
    return [...map.values()].sort((a, b) => a.itemName.localeCompare(b.itemName));
  }, [rows]);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return aggregates;
    const q = searchTerm.toLowerCase();
    return aggregates.filter((a) => a.itemName.toLowerCase().includes(q));
  }, [aggregates, searchTerm]);

  const totalItems = filtered.length;
  const totalPurchased = filtered.reduce((s, a) => s + a.totalPurchased, 0);
  const totalConsumed = filtered.reduce((s, a) => s + a.totalConsumed, 0);
  const totalBalance = filtered.reduce((s, a) => s + a.balance, 0);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Raw Material – Item Wise</h1>
        <p className="text-sm text-gray-500">
          Auto-aggregated per item from Purchase-wise entries. Updates automatically when a new Purchase-wise entry is created.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-500">Total Items</div>
          <div className="text-2xl font-bold text-gray-900">{totalItems}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-500">Total Purchased (T)</div>
          <div className="text-2xl font-bold text-gray-900">{fmtTonn(totalPurchased)}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-500">Total Consumed (T)</div>
          <div className="text-2xl font-bold text-blue-600">{fmtTonn(totalConsumed)}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-500">Balance Stock (T)</div>
          <div className="text-2xl font-bold text-green-600">{fmtTonn(totalBalance)}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-300 p-4 mb-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by Item…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="From"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="To"
          />
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Entries</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Purchased (T)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Consumed (T)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance Stock (T)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Entry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((a) => (
                  <tr key={a.itemId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-400" />
                        {a.itemName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-gray-700">{a.entryCount}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-gray-900">{fmtTonn(a.totalPurchased)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-mono font-semibold text-blue-600">{fmtTonn(a.totalConsumed)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-mono font-semibold text-green-600">{fmtTonn(a.balance)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {new Date(a.lastEntryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
              {filtered.length > 0 && (
                <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                  <tr className="font-bold">
                    <td className="px-6 py-3 text-right text-gray-900">TOTALS:</td>
                    <td className="px-6 py-3 text-right text-gray-900 font-mono">
                      {filtered.reduce((s, a) => s + a.entryCount, 0)}
                    </td>
                    <td className="px-6 py-3 text-right text-gray-900 font-mono">{fmtTonn(totalPurchased)}</td>
                    <td className="px-6 py-3 text-right text-blue-600 font-mono">{fmtTonn(totalConsumed)}</td>
                    <td className="px-6 py-3 text-right text-green-600 font-mono">{fmtTonn(totalBalance)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No data yet. Create a Purchase-wise entry to populate this view.
          </div>
        )}
        <div className="border-t border-gray-300 px-6 py-3 bg-gray-50 text-sm text-gray-600">
          Showing {filtered.length} item{filtered.length === 1 ? '' : 's'} · {rows.length} purchase-wise entries
        </div>
      </div>
    </div>
  );
};
