import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Plus, Search, Eye, Edit, Printer, Loader2 } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';
import { printersApi, type PrinterRow, describeError } from '../services/mastersApi';

export const CommonPrinterSettingsList = () => {
  const [rows, setRows] = useState<PrinterRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('');

  const reload = async () => {
    setLoading(true); setError(null);
    try {
      const res = await printersApi.list({ pageSize: 200 });
      setRows(res.items);
    } catch (err) { setError(describeError(err, 'Failed to load printers')); }
    finally { setLoading(false); }
  };

  useEffect(() => { void reload(); }, []);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (typeFilter && r.type !== typeFilter) return false;
      if (isActiveFilter !== '' && r.isActive.toString() !== isActiveFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q) || r.connection.toLowerCase().includes(q);
      }
      return true;
    });
  }, [rows, typeFilter, isActiveFilter, searchTerm]);

  const typeColor: Record<string, string> = {
    THERMAL: 'bg-purple-100 text-purple-800',
    A4: 'bg-blue-100 text-blue-800',
    A5: 'bg-cyan-100 text-cyan-800',
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Printer Settings</h1>
          <p className="text-sm text-gray-500">Manage printers configured in the system.</p>
        </div>
        <Link
          to="/settings/common-printer/create"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" /> New Printer
        </Link>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="bg-white rounded-lg border border-gray-300 p-4 mb-6">
        <div className="grid grid-cols-4 gap-3">
          <div className="col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name, code or connection…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <SearchableDropdown
            options={[
              { value: '', label: 'All Types' },
              { value: 'THERMAL', label: 'Thermal' },
              { value: 'A4', label: 'A4' },
              { value: 'A5', label: 'A5' },
            ]}
            value={typeFilter}
            onValueChange={setTypeFilter}
            placeholder="All Types"
          />
          <SearchableDropdown
            options={[
              { value: '', label: 'All Status' },
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Inactive' },
            ]}
            value={isActiveFilter}
            onValueChange={setIsActiveFilter}
            placeholder="All Status"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-300">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Connection</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-700">{p.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Printer className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${typeColor[p.type] ?? 'bg-gray-100 text-gray-700'}`}>{p.type}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-600">{p.connection}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate">{p.description ?? '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {p.isActive
                        ? <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">Active</span>
                        : <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">Inactive</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link to={`/settings/common-printer/${p.id}`} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="View">
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link to={`/settings/common-printer/${p.id}/edit`} className="p-1 text-amber-600 hover:bg-amber-50 rounded" title="Edit">
                          <Edit className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">No printers found</div>
        )}
        <div className="border-t border-gray-300 px-6 py-3 bg-gray-50 text-sm text-gray-600">
          Showing {filtered.length} of {rows.length} printers
        </div>
      </div>
    </div>
  );
};
