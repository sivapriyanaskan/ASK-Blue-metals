import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Plus, Search, Eye, Edit, Filter } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';
import { shiftApi, type ShiftTransferDenomRow } from '../services/operationsApi';
import { describeError } from '../services/mastersApi';

type ShiftTransferDenomination = ShiftTransferDenomRow & { statusLabel: string };

export const ShiftTransferDenominationsList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterShiftId, setFilterShiftId] = useState('');
  const [filterDenomination, setFilterDenomination] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [data, setData] = useState<ShiftTransferDenomination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await shiftApi.listTransferDenominations();
        if (cancelled) return;
        setData(
          res.items.map((r) => ({
            ...r,
            statusLabel: r.status === 'CLOSED' ? 'Transferred' : 'Pending',
          })),
        );
      } catch (err) {
        if (!cancelled) setError(describeError(err, 'Failed to load transfer denominations'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const denominations = [500, 200, 100, 50, 20, 10, 5, 2, 1];
  const shifts = useMemo(
    () => Array.from(new Set(data.map((d) => d.shiftNo))).sort(),
    [data],
  );

  // Transform options for SearchableDropdown
  const shiftFilterOptions = [
    { label: 'All Shifts', value: '' },
    ...shifts.map(shift => ({ label: shift, value: shift }))
  ];

  const denominationFilterOptions = [
    { label: 'All Denominations', value: '' },
    ...denominations.map(denom => ({ label: `₹${denom}`, value: denom.toString() }))
  ];

  const statusFilterOptions = [
    { label: 'All Status', value: '' },
    { label: 'Transferred', value: 'Transferred' },
    { label: 'Pending', value: 'Pending' },
  ];

  const filteredData = data.filter((item) => {
    const matchesSearch = item.shiftNo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesShiftId = !filterShiftId || item.shiftNo === filterShiftId;
    const matchesDenomination = !filterDenomination || item.denomination === parseInt(filterDenomination);
    const matchesStatus = !filterStatus || item.statusLabel === filterStatus;
    return matchesSearch && matchesShiftId && matchesDenomination && matchesStatus;
  });

  const totalAmount = filteredData.reduce((sum, item) => sum + item.amount, 0);
  const totalNotes = filteredData.reduce((sum, item) => sum + item.nos, 0);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Shift Transfer Denominations</h1>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {loading && (
        <div className="mb-4 rounded-md bg-blue-50 border border-blue-200 px-4 py-2 text-sm text-blue-700">
          Loading…
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-300 mb-6">
        <div className="p-4 border-b border-gray-300 flex flex-wrap gap-3 items-center justify-between">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by shift number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Filter className="w-5 h-5" />
              Filters
            </button>
            <Link
              to="/shift-management/transfer/edit/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Denomination Transfer
            </Link>
          </div>
        </div>

        {showFilters && (
          <div className="p-4 bg-gray-50 border-b border-gray-300">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
                <SearchableDropdown
                  options={shiftFilterOptions}
                  value={filterShiftId}
                  onValueChange={(value) => setFilterShiftId(value)}
                  placeholder="All Shifts"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Denomination</label>
                <SearchableDropdown
                  options={denominationFilterOptions}
                  value={filterDenomination}
                  onValueChange={(value) => setFilterDenomination(value)}
                  placeholder="All Denominations"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <SearchableDropdown
                  options={statusFilterOptions}
                  value={filterStatus}
                  onValueChange={(value) => setFilterStatus(value)}
                  placeholder="All Status"
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-300">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Shift No</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Denomination</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Nos</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Amount</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((item) => (
                <tr key={item.shiftTransferDenomId} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link
                      to={`/shift-closing/${item.shiftId}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {item.shiftNo}
                    </Link>
                  </td>
                  <td className="px-6 py-4 font-medium">₹{item.denomination}</td>
                  <td className="px-6 py-4">{item.nos}</td>
                  <td className="px-6 py-4 font-semibold">₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      {item.statusLabel}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <Link
                        to={`/shift-management/transfer/${item.shiftTransferDenomId}`}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link
                        to={`/shift-management/transfer/edit/${item.shiftTransferDenomId}`}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredData.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No shift transfer denominations found
          </div>
        )}
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Total Notes: {totalNotes}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Total Amount: ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>
    </div>
  );
};