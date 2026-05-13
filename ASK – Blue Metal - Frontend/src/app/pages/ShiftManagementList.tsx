import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Plus, Search, Eye, Edit, Loader2, Download } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';
import { shiftApi, type ShiftRow, type ShiftStatus } from '../services/operationsApi';
import { describeError } from '../services/mastersApi';

const fmtDate = (iso: string) => new Date(iso).toLocaleString();
const fmtMoney = (s: string | number) =>
  Number(s).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const ShiftManagementList = () => {
  const [rows, setRows] = useState<ShiftRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | ShiftStatus>('');

  const reload = async () => {
    setLoading(true); setError(null);
    try {
      const res = await shiftApi.list({ pageSize: 200, status: statusFilter || undefined });
      setRows(res.items);
    } catch (err) { setError(describeError(err, 'Failed to load shifts')); }
    finally { setLoading(false); }
  };

  useEffect(() => { void reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [statusFilter]);

  const handleDownloadReport = async (id: string) => {
    try {
      await shiftApi.downloadReport(id);
    } catch (err) {
      alert(describeError(err, 'Failed to download shift report'));
    }
  };

  const filteredShifts = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const q = searchTerm.toLowerCase();
    return rows.filter(s => s.shiftNo.toLowerCase().includes(q) || s.openedBySnapshot.toLowerCase().includes(q));
  }, [rows, searchTerm]);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shift Management</h1>
        </div>
        <Link
          to="/shift-management/create"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Start New Shift
        </Link>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="bg-white rounded-lg border border-gray-300 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search shift number or operator…"
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
          </div>
          <SearchableDropdown
            options={[{ label: 'All Status', value: '' }, { label: 'OPEN', value: 'OPEN' }, { label: 'CLOSED', value: 'CLOSED' }]}
            value={statusFilter}
            onValueChange={v => setStatusFilter(v as '' | ShiftStatus)}
            placeholder="Filter by status…"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading…
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-300">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shift No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shift Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Opened At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Opened By</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cash Received</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Amount</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cash in Hand</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredShifts.map(shift => (
                <tr key={shift.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{shift.shiftNo}</td>
                  <td className="px-6 py-4 text-gray-700">{new Date(shift.shiftDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-gray-700 text-sm">{fmtDate(shift.openedAt)}</td>
                  <td className="px-6 py-4 text-gray-700">{shift.openedBySnapshot}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${shift.status === 'OPEN' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {shift.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-900 font-medium">₹{fmtMoney(shift.totalCashReceived)}</td>
                  <td className="px-6 py-4 text-right text-gray-900 font-medium">₹{fmtMoney(shift.netAmount)}</td>
                  <td className="px-6 py-4 text-right text-gray-900 font-medium">₹{fmtMoney(shift.cashInHand)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/shift/${shift.id}`} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="View">
                        <Eye className="w-4 h-4" />
                      </Link>
                      {shift.status === 'OPEN' && (
                        <Link to={`/shift/edit/${shift.id}`} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg" title="Edit">
                          <Edit className="w-4 h-4" />
                        </Link>
                      )}
                      {shift.status === 'CLOSED' && (
                        <button
                          type="button"
                          onClick={() => handleDownloadReport(shift.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          title="Download shift closing report"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && filteredShifts.length === 0 && (
          <div className="text-center py-12 text-gray-500">No shifts found</div>
        )}
        <div className="border-t border-gray-300 px-6 py-3 bg-gray-50 text-sm text-gray-600">
          Showing {filteredShifts.length} of {rows.length} shifts
        </div>
      </div>
    </div>
  );
};