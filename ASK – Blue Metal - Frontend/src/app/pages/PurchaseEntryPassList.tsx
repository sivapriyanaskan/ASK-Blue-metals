import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Eye, Edit, Loader2 } from 'lucide-react';
import { Link } from 'react-router';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';
import { purchaseEntryPassApi, type PurchaseEntryPassRow, type PurchaseEntryStatus } from '../services/operationsApi';
import { suppliersApi, itemsApi, describeError } from '../services/mastersApi';

const STATUS_BADGE: Record<PurchaseEntryStatus, string> = {
  OPEN: 'bg-blue-100 text-blue-800',
  BILLED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const fmtDate = (iso: string) => new Date(iso).toLocaleString();
const fmtNum = (s: string | number) => Number(s).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export const PurchaseEntryPassList = () => {
  const [rows, setRows] = useState<PurchaseEntryPassRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [itemFilter, setItemFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | PurchaseEntryStatus>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [suppliers, setSuppliers] = useState<{ label: string; value: string }[]>([]);
  const [items, setItems] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    suppliersApi.list({ pageSize: 200 }).then((r) =>
      setSuppliers(r.items.map((s) => ({ label: s.name, value: s.id })))
    ).catch(() => {});
    itemsApi.list({ pageSize: 200, isActive: true }).then((r) =>
      setItems(r.items.filter((i) => i.isRawMaterial).map((i) => ({ label: i.name, value: i.id })))
    ).catch(() => {});
  }, []);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await purchaseEntryPassApi.list({
        pageSize: 200,
        status: statusFilter || undefined,
        supplierId: supplierFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setRows(res.items);
    } catch (err) {
      setError(describeError(err, 'Failed to load entry passes'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, supplierFilter, dateFrom, dateTo]);

  const filtered = useMemo(() => {
    if (!search.trim() && !itemFilter) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      (!search.trim() ||
        r.passNo.toLowerCase().includes(q) ||
        r.vehicleNoSnapshot.toLowerCase().includes(q) ||
        r.supplierNameSnapshot.toLowerCase().includes(q) ||
        r.driverNameSnapshot.toLowerCase().includes(q)) &&
      (!itemFilter || r.itemId === itemFilter)
    );
  }, [rows, search, itemFilter]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Entry Pass</h1>
          <p className="text-sm text-muted-foreground">Inbound material entry passes from suppliers.</p>
        </div>
        <Link
          to="/operations/purchase-entry-pass/create"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Entry Pass
        </Link>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="bg-white rounded-lg border border-gray-300 p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pass no / vehicle / supplier / driver"
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
          </div>
          <SearchableDropdown
            options={[{ label: 'All Suppliers', value: '' }, ...suppliers]}
            value={supplierFilter}
            onValueChange={setSupplierFilter}
            placeholder="All Suppliers"
          />
          <SearchableDropdown
            options={[{ label: 'All Items', value: '' }, ...items]}
            value={itemFilter}
            onValueChange={setItemFilter}
            placeholder="All Items"
          />
          <SearchableDropdown
            options={[
              { label: 'All Status', value: '' },
              { label: 'OPEN', value: 'OPEN' },
              { label: 'BILLED', value: 'BILLED' },
              { label: 'CANCELLED', value: 'CANCELLED' },
            ]}
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as '' | PurchaseEntryStatus)}
            placeholder="All Status"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Date From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Date To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pass No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date/Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Load Weight</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((pass) => (
                  <tr key={pass.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-bold text-sm">{pass.passNo}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{fmtDate(pass.passDateTime)}</td>
                    <td className="px-4 py-3 text-sm">{pass.supplierNameSnapshot}</td>
                    <td className="px-4 py-3 font-mono font-medium text-sm">{pass.vehicleNoSnapshot}</td>
                    <td className="px-4 py-3 text-sm">{pass.driverNameSnapshot}</td>
                    <td className="px-4 py-3 text-sm">{pass.itemNameSnapshot}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-sm">{fmtNum(pass.loadWeight)} TON</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_BADGE[pass.status]}`}>{pass.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          to={`/operations/purchase-entry-pass/${pass.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                        >
                          <Eye className="w-4 h-4" /> View
                        </Link>
                        {pass.status === 'OPEN' && (
                          <Link
                            to={`/operations/purchase-entry-pass/edit/${pass.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                          >
                            <Edit className="w-4 h-4" /> Edit
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
          <div className="text-center py-12 text-gray-500">No entry passes found</div>
        )}
        <div className="border-t border-gray-300 px-4 py-3 bg-gray-50 text-sm text-gray-600">
          Showing {filtered.length} of {rows.length} entry passes
        </div>
      </div>
    </div>
  );
};
