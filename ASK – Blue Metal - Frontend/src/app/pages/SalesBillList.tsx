import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Search, Loader2, FileText, Plus } from 'lucide-react';
import { salesBillApi, type SalesBillRow, type SalesBillStatus } from '../services/operationsApi';
import { describeError } from '../services/mastersApi';
import { useAppContext } from '../context/AppContext';
import { isInvoiceBillingOnly } from '../utils/roles';

const STATUS_BADGE: Record<SalesBillStatus, string> = {
  DRAFT: 'bg-amber-50 text-amber-700 border-amber-200',
  POSTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
};

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString();
const fmtMoney = (s: string | number) =>
  Number(s).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtNum = (s: string | number) => Number(s).toLocaleString(undefined, { maximumFractionDigits: 2 });

export const SalesBillList = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<SalesBillRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | SalesBillStatus>('');
  const { user } = useAppContext();
  const invoiceOnly = isInvoiceBillingOnly(user.roleCodes);

  const reload = async () => {
    setLoading(true); setError(null);
    try {
      const res = await salesBillApi.list({ pageSize: 200, status: statusFilter || undefined });
      setRows(res.items);
    } catch (err) { setError(describeError(err, 'Failed to load sales bills')); }
    finally { setLoading(false); }
  };
  useEffect(() => { void reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [statusFilter]);

  const filtered = useMemo(() => {
    const base = invoiceOnly
      ? rows.filter((r) => {
          // The list row carries `customer.billType`; an explicit override on the
          // bill itself wins when present.
          const effective = r.billTypeOverride ?? r.customer?.billType;
          return effective === 'TAX_INVOICE';
        })
      : rows;
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter((r) =>
      r.billNo.toLowerCase().includes(q) ||
      r.vehicleNo.toLowerCase().includes(q) ||
      r.customer?.name.toLowerCase().includes(q) ||
      r.item?.name.toLowerCase().includes(q),
    );
  }, [rows, search, invoiceOnly]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales Bills</h1>
          <p className="text-sm text-muted-foreground">
            {invoiceOnly
              ? 'Tax invoices generated from tokens.'
              : 'Tax invoices and non-GST bills generated from tokens.'}
          </p>
        </div>
        <button
          onClick={() => navigate('/operations/sales-bill/create')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
        >
          <Plus className="h-4 w-4" />
          Create Sales Bill
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bill / vehicle / customer / item"
            className="pl-9 pr-3 py-2 w-full rounded-md border border-input bg-background"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as SalesBillStatus | '')}
          className="px-3 py-2 rounded-md border border-input bg-background"
        >
          <option value="">All statuses</option>
          <option value="POSTED">Posted</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {error && <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</div>}

      <div className="border rounded-md overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">Bill #</th>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Customer</th>
              <th className="px-3 py-2 font-medium">Item</th>
              <th className="px-3 py-2 font-medium">Vehicle</th>
              <th className="px-3 py-2 font-medium text-right">Net Wt</th>
              <th className="px-3 py-2 font-medium text-right">Total ₹</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" /> Loading…
              </td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">No sales bills yet.</td></tr>
            )}
            {!loading && filtered.map((r) => (
              <tr key={r.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-mono">{r.billNo}</td>
                <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.billDate)}</td>
                <td className="px-3 py-2">{r.customer?.name}</td>
                <td className="px-3 py-2">{r.item?.name}</td>
                <td className="px-3 py-2 font-mono">{r.vehicleNo}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtNum(r.netWeight)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(r.totalAmount)}</td>
                <td className="px-3 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_BADGE[r.status]}`}>{r.status}</span>
                </td>
                <td className="px-3 py-2 text-right">
                  <Link to={`/operations/sales-bill/${r.id}`} className="text-primary hover:underline inline-flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" /> View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SalesBillList;
