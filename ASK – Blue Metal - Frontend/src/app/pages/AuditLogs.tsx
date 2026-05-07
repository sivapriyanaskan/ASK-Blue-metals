import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, Search } from 'lucide-react';
import { auditApi, type AuditLogRow } from '../services/iamApi';
import { describeError } from '../services/mastersApi';

const ACTION_STYLES: Record<string, string> = {
  CREATE: 'bg-green-50 text-green-700 ring-1 ring-green-200',
  UPDATE: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  DELETE: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  LOGIN: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  LOGOUT: 'bg-gray-100 text-gray-700 ring-1 ring-gray-200',
};

const ACTION_OPTIONS = ['', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'];

const formatValue = (v: unknown): string => {
  if (v === null || v === undefined) return '∅';
  if (typeof v === 'string') return v.length > 80 ? `${v.slice(0, 80)}…` : v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    const s = JSON.stringify(v);
    return s.length > 80 ? `${s.slice(0, 80)}…` : s;
  } catch {
    return String(v);
  }
};

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const ChangesView = ({ changes }: { changes: unknown }) => {
  const [open, setOpen] = useState(false);

  if (changes === null || changes === undefined) {
    return <span className="text-xs text-gray-400">—</span>;
  }

  // Top-level diff: { from, to }
  if (isPlainObject(changes) && 'from' in changes && 'to' in changes) {
    const from = (changes as { from: unknown }).from;
    const to = (changes as { to: unknown }).to;
    return (
      <div className="space-y-1">
        <div className="flex items-start gap-2 text-xs">
          <span className="font-medium text-red-600 w-12 shrink-0">before</span>
          <code className="text-[11px] text-gray-700 break-all">{formatValue(from)}</code>
        </div>
        <div className="flex items-start gap-2 text-xs">
          <span className="font-medium text-green-600 w-12 shrink-0">after</span>
          <code className="text-[11px] text-gray-700 break-all">{formatValue(to)}</code>
        </div>
      </div>
    );
  }

  if (isPlainObject(changes)) {
    const fields = Object.entries(changes);
    const fieldDiffs = fields.filter(
      ([, v]) => isPlainObject(v) && ('from' in v || 'to' in v),
    );

    // Field-level diffs: { field: { from, to } }
    if (fieldDiffs.length > 0 && fieldDiffs.length === fields.length) {
      const visible = open ? fieldDiffs : fieldDiffs.slice(0, 2);
      return (
        <div className="space-y-1">
          {visible.map(([key, val]) => {
            const fromV = (val as Record<string, unknown>).from;
            const toV = (val as Record<string, unknown>).to;
            return (
              <div key={key} className="text-xs">
                <span className="font-medium text-gray-800">{key}</span>
                <span className="text-gray-400">: </span>
                <code className="text-[11px] text-red-600 line-through">{formatValue(fromV)}</code>
                <span className="text-gray-400 mx-1">→</span>
                <code className="text-[11px] text-green-700">{formatValue(toV)}</code>
              </div>
            );
          })}
          {fieldDiffs.length > 2 && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="text-[11px] text-blue-600 hover:underline inline-flex items-center gap-0.5"
            >
              {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              {open ? 'Show less' : `+${fieldDiffs.length - 2} more`}
            </button>
          )}
        </div>
      );
    }

    // Generic key/value object (CREATE, DELETE snapshots, summary fields)
    const entries = Object.entries(changes);
    const visible = open ? entries : entries.slice(0, 3);
    return (
      <div className="space-y-0.5">
        {visible.map(([key, val]) => (
          <div key={key} className="text-xs">
            <span className="font-medium text-gray-800">{key}</span>
            <span className="text-gray-400">: </span>
            <code className="text-[11px] text-gray-700">{formatValue(val)}</code>
          </div>
        ))}
        {entries.length > 3 && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-[11px] text-blue-600 hover:underline inline-flex items-center gap-0.5"
          >
            {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            {open ? 'Show less' : `+${entries.length - 3} more`}
          </button>
        )}
      </div>
    );
  }

  return <code className="text-[11px] text-gray-700 break-all">{formatValue(changes)}</code>;
};

export const AuditLogs = () => {
  const [items, setItems] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actor, setActor] = useState('');
  const [action, setAction] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 50;

  const query = useMemo(
    () => ({
      page,
      pageSize,
      actor: actor.trim() || undefined,
      action: action || undefined,
      from: fromDate ? new Date(fromDate).toISOString() : undefined,
      to: toDate ? new Date(`${toDate}T23:59:59`).toISOString() : undefined,
    }),
    [page, actor, action, fromDate, toDate],
  );

  useEffect(() => {
    const handle = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await auditApi.list(query);
        setItems(res.items);
        setTotal(res.total);
      } catch (err) {
        setError(describeError(err, 'Failed to load audit logs'));
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const resetFilters = () => {
    setActor('');
    setAction('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-sm text-gray-500 mt-1">Immutable record of every create/update/delete. Read-only.</p>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>}

      <div className="bg-white rounded-lg border border-gray-300 mb-4 p-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Actor</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={actor}
              onChange={(e) => { setActor(e.target.value); setPage(1); }}
              placeholder="Search by user name…"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Action</label>
          <select
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt || 'All actions'}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
          <div className="flex gap-2">
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={resetFilters}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              title="Clear filters"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-300">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-48">Date &amp; Time</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-48">Actor</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">Action</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Changes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((log) => {
              const d = new Date(log.createdAt);
              const dateStr = d.toLocaleDateString();
              const timeStr = d.toLocaleTimeString();
              const actionClass =
                ACTION_STYLES[log.action] ?? 'bg-gray-100 text-gray-700 ring-1 ring-gray-200';
              return (
                <tr key={log.id} className="hover:bg-gray-50 align-top">
                  <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{dateStr}</div>
                    <div className="text-gray-500">{timeStr}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{log.actorName ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${actionClass}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ChangesView changes={log.changes} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {loading && (
          <div className="text-center py-8 text-gray-500 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="text-center py-12 text-gray-500">No audit logs found</div>
        )}
      </div>

      {total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>Showing page {page} of {totalPages} · {total} total entries</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">Previous</button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
};
