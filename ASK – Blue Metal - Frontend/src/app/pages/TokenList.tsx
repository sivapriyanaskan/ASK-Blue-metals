import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Plus, Search, Loader2, FileText, Scale, X } from 'lucide-react';
import { tokenApi, type TokenRow, type TokenStatus } from '../services/operationsApi';
import { describeError } from '../services/mastersApi';

const STATUS_BADGE: Record<TokenStatus, string> = {
  OPEN: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  BILLED: 'bg-sky-50 text-sky-700 border-sky-200',
  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
};

const fmtDate = (iso: string) => new Date(iso).toLocaleString();
// #8 — weights display with 3 decimals everywhere.
const fmtWeight = (s: string | number) =>
  Number(s).toLocaleString(undefined, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

export const TokenList = () => {
  const [rows, setRows] = useState<TokenRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  // #29 — default to OPEN tokens; operator can switch via dropdown.
  const [statusFilter, setStatusFilter] = useState<'' | TokenStatus>('OPEN');
  // #17 — sortable columns; default to date desc.
  const [sortBy, setSortBy] = useState<'date' | 'customer'>('date');

  const reload = async () => {
    setLoading(true); setError(null);
    try {
      const res = await tokenApi.list({ pageSize: 200, status: statusFilter || undefined });
      setRows(res.items);
    } catch (err) { setError(describeError(err, 'Failed to load tokens')); }
    finally { setLoading(false); }
  };
  useEffect(() => { void reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [statusFilter]);

  const filtered = useMemo(() => {
    const base = !search.trim()
      ? rows
      : rows.filter((r) => {
          const q = search.toLowerCase();
          return (
            r.tokenNo.toLowerCase().includes(q) ||
            r.entryNo.toLowerCase().includes(q) ||
            r.vehicleNo.toLowerCase().includes(q) ||
            r.customer?.name.toLowerCase().includes(q) ||
            r.item?.name.toLowerCase().includes(q)
          );
        });
    if (sortBy === 'customer') {
      return [...base].sort((a, b) =>
        (a.customer?.name ?? '').localeCompare(b.customer?.name ?? ''),
      );
    }
    return base;
  }, [rows, search, sortBy]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tokens</h1>
          <p className="text-sm text-muted-foreground">Customer gate entries — empty-weight capture and entry-pass numbering.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/operations/weight-slip/create" className="inline-flex items-center gap-2 px-3 py-2 border border-orange-300 bg-orange-50 text-orange-800 rounded-md hover:bg-orange-100 text-sm font-medium">
            <Scale className="h-4 w-4" /> Create Weight Slip
          </Link>
          <Link to="/operations/token/create" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90">
            <Plus className="h-4 w-4" /> New Token
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search token / entry / vehicle / customer / item"
            className="pl-9 pr-3 py-2 w-full rounded-md border border-input bg-background"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TokenStatus | '')}
          className="px-3 py-2 rounded-md border border-input bg-background"
        >
          <option value="">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="BILLED">Billed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'date' | 'customer')}
          className="px-3 py-2 rounded-md border border-input bg-background"
          aria-label="Sort by"
        >
          <option value="date">Sort: Date (newest)</option>
          <option value="customer">Sort: Customer name</option>
        </select>
      </div>

      {error && <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</div>}

      <div className="border rounded-md overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            {/* #22 — columns: Token / Customer / Vehicle / Date & Time / Item / Empty Wt / Status */}
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">Token #</th>
              <th className="px-3 py-2 font-medium">
                <button
                  type="button"
                  onClick={() => setSortBy(sortBy === 'customer' ? 'date' : 'customer')}
                  className="font-medium hover:underline"
                >
                  Customer Name {sortBy === 'customer' ? '↑' : ''}
                </button>
              </th>
              <th className="px-3 py-2 font-medium">Vehicle No</th>
              <th className="px-3 py-2 font-medium">Date & Time</th>
              <th className="px-3 py-2 font-medium">Item</th>
              <th className="px-3 py-2 font-medium text-right">Empty Weight (T)</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" /> Loading…
              </td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">No tokens yet.</td></tr>
            )}
            {!loading && filtered.map((r) => (
              <tr key={r.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-mono">{r.tokenNo}</td>
                <td className="px-3 py-2">{r.customer?.name}</td>
                <td className="px-3 py-2 font-mono">{r.vehicleNo}</td>
                <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.tokenDateTime)}</td>
                <td className="px-3 py-2">{r.item?.name}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtWeight(r.emptyWeight)}</td>
                <td className="px-3 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_BADGE[r.status]}`}>{r.status}</span>
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="inline-flex items-center gap-3 justify-end">
                    <Link to={`/operations/token/${r.id}`} className="text-primary hover:underline inline-flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" /> View
                    </Link>
                    {r.status === 'OPEN' && (
                      <Link
                        to={`/operations/token/${r.id}?cancel=1`}
                        className="text-rose-600 hover:underline inline-flex items-center gap-1"
                        title="Cancel this token"
                      >
                        <X className="h-3.5 w-3.5" /> Cancel
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TokenList;
