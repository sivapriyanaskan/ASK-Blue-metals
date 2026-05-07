import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Plus, Search, Loader2, FileText, Eye, XCircle, FileDown } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';
import { purchaseBillApi, type PurchaseBillRow, type PurchaseBillStatus } from '../services/operationsApi';
import { suppliersApi, workCentresApi, describeError } from '../services/mastersApi';

const STATUS_BADGE: Record<PurchaseBillStatus, string> = {
  DRAFT: 'bg-yellow-100 text-yellow-800',
  POSTED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const fmtDate = (iso: string) => new Date(iso).toLocaleString();
const fmtNum = (s: string | number) => Number(s).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const fmtMoney = (s: string | number) => Number(s).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const PurchaseBillList = () => {
  const [rows, setRows] = useState<PurchaseBillRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [workCentreFilter, setWorkCentreFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | PurchaseBillStatus>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [suppliers, setSuppliers] = useState<{ label: string; value: string }[]>([]);
  const [workCentres, setWorkCentres] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    suppliersApi.list({ pageSize: 200 }).then((r) =>
      setSuppliers(r.items.map((s) => ({ label: s.name, value: s.id })))
    ).catch(() => {});
    workCentresApi.list({ pageSize: 100 }).then((r) =>
      setWorkCentres(r.items.map((w) => ({ label: w.name, value: w.id })))
    ).catch(() => {});
  }, []);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await purchaseBillApi.list({
        pageSize: 200,
        status: statusFilter || undefined,
        supplierId: supplierFilter || undefined,
        workCentreId: workCentreFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setRows(res.items);
    } catch (err) {
      setError(describeError(err, 'Failed to load purchase bills'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, supplierFilter, workCentreFilter, dateFrom, dateTo]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      r.purchaseNo.toLowerCase().includes(q) ||
      r.vehicleNoSnapshot.toLowerCase().includes(q) ||
      r.supplierNameSnapshot.toLowerCase().includes(q) ||
      (r.passNoSnapshot ?? '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Bills</h1>
          <p className="text-sm text-muted-foreground">Purchase billing records from entry passes.</p>
        </div>
        <Link
          to="/operations/purchase-bill/create"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Purchase Bill
        </Link>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="bg-white rounded-lg border border-gray-300 p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by purchase no, vehicle, supplier"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <SearchableDropdown
            options={[{ label: 'All Suppliers', value: '' }, ...suppliers]}
            value={supplierFilter}
            onValueChange={setSupplierFilter}
            placeholder="All Suppliers"
          />
          <SearchableDropdown
            options={[{ label: 'All Work Centres', value: '' }, ...workCentres]}
            value={workCentreFilter}
            onValueChange={setWorkCentreFilter}
            placeholder="All Work Centres"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SearchableDropdown
            options={[
              { label: 'All Status', value: '' },
              { label: 'DRAFT', value: 'DRAFT' },
              { label: 'POSTED', value: 'POSTED' },
              { label: 'CANCELLED', value: 'CANCELLED' },
            ]}
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as '' | PurchaseBillStatus)}
            placeholder="All Status"
          />
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

      <div className="bg-white rounded-lg border border-gray-300">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date/Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pass No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Weight</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((bill) => (
                  <tr key={bill.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-bold text-blue-900">{bill.purchaseNo}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{fmtDate(bill.purchaseDateTime)}</td>
                    <td className="px-4 py-3">
                      {bill.entryPassId ? (
                        <Link to={`/operations/purchase-entry-pass/${bill.entryPassId}`} className="font-mono text-blue-600 hover:text-blue-800">
                          {bill.passNoSnapshot}
                        </Link>
                      ) : <span className="text-gray-400 text-xs">-</span>}
                    </td>
                    <td className="px-4 py-3 font-mono font-medium text-gray-900">{bill.vehicleNoSnapshot}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{bill.supplierNameSnapshot}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">{fmtNum(bill.netWeight)} TON</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">{fmtMoney(bill.grossPayable)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${STATUS_BADGE[bill.status]}`}>
                        {bill.status === 'CANCELLED' && <XCircle className="w-3 h-3" />}
                        {bill.status !== 'CANCELLED' && <FileText className="w-3 h-3" />}
                        {bill.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Link to={`/operations/purchase-bill/${bill.id}`} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="View">
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button className="p-1.5 text-gray-600 hover:bg-gray-50 rounded" title="Download">
                          <FileDown className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No purchase bills found</p>
          </div>
        )}
        <div className="border-t border-gray-300 px-4 py-3 bg-gray-50 text-sm text-gray-600">
          Showing {filtered.length} of {rows.length} bills
        </div>
      </div>
    </div>
  );
};
