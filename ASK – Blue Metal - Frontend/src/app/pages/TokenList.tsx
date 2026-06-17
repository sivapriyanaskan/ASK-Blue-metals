import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Plus, Search, Loader2, FileText } from 'lucide-react';
import { tokenApi, type TokenRow, type TokenStatus } from '../services/operationsApi';
import { describeError } from '../services/mastersApi';

const STATUS_BADGE: Record<TokenStatus, string> = {
  OPEN: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  BILLED: 'bg-sky-50 text-sky-700 border-sky-200',
  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
};

const fmtDate = (iso: string) => new Date(iso).toLocaleString();
const fmtNum = (s: string | number) => Number(s).toLocaleString(undefined, { maximumFractionDigits: 2 });

export const TokenList = () => {
  const [rows, setRows] = useState<TokenRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | TokenStatus>('');

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
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      r.tokenNo.toLowerCase().includes(q) ||
      r.entryNo.toLowerCase().includes(q) ||
      r.vehicleNo.toLowerCase().includes(q) ||
      r.customer?.name.toLowerCase().includes(q) ||
      r.item?.name.toLowerCase().includes(q),
    );
  }, [rows, search]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tokens</h1>
          <p className="text-sm text-muted-foreground">Customer gate entries — empty-weight capture and entry-pass numbering.</p>
        </div>
        <Link to="/operations/token/create" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90">
          <Plus className="h-4 w-4" /> New Token
        </Link>
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
      </div>

      {error && <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</div>}

      <div className="border rounded-md overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">Token #</th>
              <th className="px-3 py-2 font-medium">Entry #</th>
              <th className="px-3 py-2 font-medium">Date / Time</th>
              <th className="px-3 py-2 font-medium">Customer</th>
              <th className="px-3 py-2 font-medium">Item</th>
              <th className="px-3 py-2 font-medium">Vehicle</th>
              <th className="px-3 py-2 font-medium text-right">Empty Wt</th>
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
              <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">No tokens yet.</td></tr>
            )}
            {!loading && filtered.map((r) => (
              <tr key={r.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-mono">{r.tokenNo}</td>
                <td className="px-3 py-2 font-mono">{r.entryNo}</td>
                <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.tokenDateTime)}</td>
                <td className="px-3 py-2">{r.customer?.name}</td>
                <td className="px-3 py-2">{r.item?.name}</td>
                <td className="px-3 py-2 font-mono">{r.vehicleNo}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtNum(r.emptyWeight)}</td>
                <td className="px-3 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_BADGE[r.status]}`}>{r.status}</span>
                </td>
                <td className="px-3 py-2 text-right">
                  <Link to={`/operations/token/${r.id}`} className="text-primary hover:underline inline-flex items-center gap-1">
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

export default TokenList;
