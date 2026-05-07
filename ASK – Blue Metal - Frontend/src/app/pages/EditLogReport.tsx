import { useEffect, useState } from 'react';
import { Calendar, Search, Loader2 } from 'lucide-react';
import { auditApi, type AuditLogRow } from '../services/iamApi';
import { describeError } from '../services/mastersApi';

const fmtDate = (iso: string) => new Date(iso).toLocaleString('en-IN');

export const EditLogReport = () => {
  const [dateFrom, setDateFrom] = useState('2026-03-01');
  const [dateTo, setDateTo] = useState('2026-03-31');
  const [resource, setResource] = useState('');
  const [action, setAction] = useState('');
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 50;

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await auditApi.list({
        page, pageSize,
        resource: resource || undefined,
        action: action || undefined,
        from: dateFrom ? dateFrom + 'T00:00:00' : undefined,
        to: dateTo ? dateTo + 'T23:59:59' : undefined,
      });
      setLogs(res.items);
      setTotal(res.total);
    } catch (e) { setError(describeError(e, 'Failed to load audit logs')); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [page, resource, action, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const actionColor = (a: string) => {
    if (a.includes('create')) return 'bg-green-100 text-green-700';
    if (a.includes('delete') || a.includes('cancel')) return 'bg-red-100 text-red-700';
    if (a.includes('update') || a.includes('edit')) return 'bg-orange-100 text-orange-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="p-6">
      <div className="mb-4 pb-3 border-b border-gray-300">
        <h1 className="text-xl font-bold text-gray-900">Edit Log Report</h1>
        <p className="text-sm text-gray-500">Immutable audit trail of all create / update / delete actions from DB</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-300 p-4 mb-4">
        <div className="grid grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
            <div className="relative"><Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded" /></div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
            <div className="relative"><Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded" /></div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Resource</label>
            <div className="relative"><Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={resource} onChange={e => { setResource(e.target.value); setPage(1); }} placeholder="e.g. masters.customer" className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded" /></div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Action</label>
            <div className="relative"><Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={action} onChange={e => { setAction(e.target.value); setPage(1); }} placeholder="create / update / delete" className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded" /></div>
          </div>
          <div className="flex items-end"><button onClick={() => { setPage(1); void load(); }} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded text-sm">Apply</button></div>
        </div>
      </div>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>}
      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        <div className="px-4 py-2 border-b border-gray-300 text-xs text-gray-500">Total: {total} records</div>
        {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" /><span>Loading...</span></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-300">
                <tr>{['Date/Time','Resource','Resource ID','Action','Actor','Changes'].map(h=><th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody>
                {logs.length === 0 ? <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-400">No audit logs found</td></tr>
                : logs.map(l=>(
                  <tr key={l.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-xs">{fmtDate(l.createdAt)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{l.resource}</td>
                    <td className="px-3 py-2 font-mono text-xs max-w-24 truncate">{l.resourceId ?? '—'}</td>
                    <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${actionColor(l.action)}`}>{l.action}</span></td>
                    <td className="px-3 py-2">{l.actorName ?? l.actorId ?? '—'}</td>
                    <td className="px-3 py-2 max-w-64 truncate text-xs text-gray-500">{l.changes ? JSON.stringify(l.changes).slice(0,80) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-300 flex items-center justify-between text-sm">
            <span className="text-gray-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p-1)} className="px-3 py-1 border border-gray-300 rounded disabled:opacity-40">Prev</button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p+1)} className="px-3 py-1 border border-gray-300 rounded disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
