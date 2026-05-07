import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Plus, Search, Eye, Edit, Loader2 } from 'lucide-react';
import { currencyExchangeApi, type CurrencyExchangeRow } from '../services/operationsApi';
import { describeError } from '../services/mastersApi';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString();
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const fmtMoney = (s: string | number) =>
  Number(s).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const CurrencyExchangeList = () => {
  const [rows, setRows] = useState<CurrencyExchangeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');

  const reload = async () => {
    setLoading(true); setError(null);
    try {
      const res = await currencyExchangeApi.list({ pageSize: 200, dateFrom: dateFromFilter || undefined, dateTo: dateToFilter || undefined });
      setRows(res.items);
    } catch (err) { setError(describeError(err, 'Failed to load currency exchanges')); }
    finally { setLoading(false); }
  };

  useEffect(() => { void reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [dateFromFilter, dateToFilter]);

  const filteredExchanges = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const q = searchTerm.toLowerCase();
    return rows.filter(r => r.entryNo.toLowerCase().includes(q));
  }, [rows, searchTerm]);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
          {error && <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Currency Exchange</h1>
        </div>
        <Link
          to="/currency-exchange/create"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Currency Exchange
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-300 p-4 mb-6">
        <div className="grid grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Entry No
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date From
            </label>
            <input
              type="date"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date To
            </label>
            <input
              type="date"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-300">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entry No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount Paid</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount Received</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-16 text-center text-gray-500"><Loader2 className="w-5 h-5 animate-spin inline-block mr-2" />Loading…</td></tr>
              ) : filteredExchanges.map(exchange => (
                <tr key={exchange.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{exchange.entryNo}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{fmtDate(exchange.billDateTime)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{fmtTime(exchange.billDateTime)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">₹{fmtMoney(exchange.totalAmountPaid)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">₹{fmtMoney(exchange.totalAmountReceived)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${exchange.status === 'OPEN' ? 'bg-green-100 text-green-800' : exchange.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                      {exchange.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Link to={`/currency-exchange/view/${exchange.id}`} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="View">
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link to={`/currency-exchange/edit/${exchange.id}`} className="p-1 text-amber-600 hover:bg-amber-50 rounded" title="Edit">
                        <Edit className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && filteredExchanges.length === 0 && (
          <div className="text-center py-12 text-gray-500">No currency exchange records found</div>
        )}
        <div className="border-t border-gray-300 px-6 py-3 bg-gray-50 text-sm text-gray-600">
          Showing {filteredExchanges.length} of {rows.length} records
        </div>
      </div>
    </div>
  );
};
