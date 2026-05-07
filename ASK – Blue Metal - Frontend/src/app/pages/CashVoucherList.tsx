import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Plus, Search, Loader2, Eye, Edit, Receipt } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';
import { cashVoucherApi, type CashVoucherRow, type VoucherType, type VoucherStatus } from '../services/operationsApi';
import { describeError } from '../services/mastersApi';

const fmtMoney = (s: string | number) => Number(s).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export const CashVoucherList = () => {
  const [rows, setRows] = useState<CashVoucherRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [voucherType, setVoucherType] = useState<'' | VoucherType>('');
  const [status, setStatus] = useState<'' | VoucherStatus>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await cashVoucherApi.list({
        pageSize: 200,
        voucherType: voucherType || undefined,
        status: status || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setRows(res.items);
    } catch (err) {
      setError(describeError(err, 'Failed to load cash vouchers'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voucherType, status, dateFrom, dateTo]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      r.voucherNo.toLowerCase().includes(q) ||
      r.preparedBySnapshot.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const totalAmount = filtered.reduce((sum, item) => sum + Number(item.totalAmount), 0);
  const paymentAmount = filtered.filter((r) => r.voucherType === 'PAYMENT').reduce((sum, item) => sum + Number(item.totalAmount), 0);
  const receiptAmount = filtered.filter((r) => r.voucherType === 'RECEIPT').reduce((sum, item) => sum + Number(item.totalAmount), 0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cash Vouchers</h1>
          <p className="text-sm text-muted-foreground">Payment and receipt vouchers from finance module.</p>
        </div>
        <Link to="/finance/cash-voucher/create" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> New Voucher
        </Link>
      </div>

      {error && <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-300 rounded-lg p-4"><div className="text-xs text-gray-500">Total Vouchers</div><div className="text-2xl font-bold">{filtered.length}</div></div>
        <div className="bg-white border border-gray-300 rounded-lg p-4"><div className="text-xs text-gray-500">Total Amount</div><div className="text-2xl font-bold">{fmtMoney(totalAmount)}</div></div>
        <div className="bg-white border border-gray-300 rounded-lg p-4"><div className="text-xs text-gray-500">Payments</div><div className="text-2xl font-bold text-red-600">{fmtMoney(paymentAmount)}</div></div>
        <div className="bg-white border border-gray-300 rounded-lg p-4"><div className="text-xs text-gray-500">Receipts</div><div className="text-2xl font-bold text-green-600">{fmtMoney(receiptAmount)}</div></div>
      </div>

      <div className="bg-white rounded-lg border border-gray-300 p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search voucher or prepared by" className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg" />
          </div>
          <SearchableDropdown
            options={[{ label: 'All Types', value: '' }, { label: 'PAYMENT', value: 'PAYMENT' }, { label: 'RECEIPT', value: 'RECEIPT' }]}
            value={voucherType}
            onValueChange={(v) => setVoucherType(v as '' | VoucherType)}
            placeholder="All Types"
          />
          <SearchableDropdown
            options={[{ label: 'All Status', value: '' }, { label: 'DRAFT', value: 'DRAFT' }, { label: 'POSTED', value: 'POSTED' }, { label: 'CANCELLED', value: 'CANCELLED' }]}
            value={status}
            onValueChange={(v) => setStatus(v as '' | VoucherStatus)}
            placeholder="All Status"
          />
          <div className="flex gap-2">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-500"><Loader2 className="w-5 h-5 animate-spin" /> Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Voucher No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prepared By</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-bold text-blue-900">{r.voucherNo}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{fmtDate(r.docDate)}</td>
                    <td className="px-4 py-3 text-sm">{r.voucherType}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">{fmtMoney(r.totalAmount)}</td>
                    <td className="px-4 py-3 text-sm">{r.preparedBySnapshot}</td>
                    <td className="px-4 py-3 text-center"><span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">{r.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Link to={`/finance/cash-voucher/${r.id}`} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="View"><Eye className="w-4 h-4" /></Link>
                        <Link to={`/finance/cash-voucher/edit/${r.id}`} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded" title="Edit"><Edit className="w-4 h-4" /></Link>
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
            <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No cash vouchers found</p>
          </div>
        )}

        <div className="border-t border-gray-300 px-4 py-3 bg-gray-50 text-sm text-gray-600">
          Showing {filtered.length} of {rows.length} vouchers
        </div>
      </div>
    </div>
  );
};
