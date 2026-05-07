import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Plus, Search, Eye, Edit, Trash2, Loader2 } from 'lucide-react';
import { SearchableDropdown, type SearchableDropdownOption } from '../components/ui/searchable-dropdown';
import { driversApi, describeError, type DriverRow } from '../services/mastersApi';

const statusOptions: SearchableDropdownOption[] = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'true' },
  { label: 'Inactive', value: 'false' },
];

export const DriverLabourMasterList = () => {
  const [items, setItems] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await driversApi.list({
        pageSize: 200,
        search: searchTerm || undefined,
        isActive: isActiveFilter === '' ? undefined : isActiveFilter === 'true',
      });
      setItems(res.items);
    } catch (err) {
      setError(describeError(err, 'Failed to load drivers'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handle = setTimeout(() => void reload(), 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, isActiveFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this driver?')) return;
    try {
      await driversApi.deactivate(id);
      await reload();
    } catch (err) {
      setError(describeError(err, 'Deactivate failed'));
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Driver / Labour Master</h1>
        <Link to="/masters/driver/create" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Add Driver
        </Link>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>}

      <div className="bg-white rounded-lg border border-gray-300 p-4 mb-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by code, name, phone…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <SearchableDropdown options={statusOptions} value={isActiveFilter} onValueChange={setIsActiveFilter} placeholder="Status" />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-300">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Designation</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{d.code}</td>
                <td className="px-6 py-4 text-gray-900">{d.name}</td>
                <td className="px-6 py-4 text-gray-600 font-mono text-sm">{d.phone ?? '-'}</td>
                <td className="px-6 py-4 text-gray-600">{d.designation ?? '-'}</td>
                <td className="px-6 py-4 text-gray-600">{d.isDriver ? 'Driver' : 'Labour'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${d.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {d.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <Link to={`/masters/driver/${d.id}`} className="text-blue-600 hover:text-blue-900" title="View"><Eye className="w-4 h-4" /></Link>
                    <Link to={`/masters/driver/${d.id}/edit`} className="text-green-600 hover:text-green-900" title="Edit"><Edit className="w-4 h-4" /></Link>
                    {d.isActive && (
                      <button onClick={() => handleDelete(d.id)} className="text-red-600 hover:text-red-900" title="Deactivate"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <div className="text-center py-8 text-gray-500 flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>}
        {!loading && items.length === 0 && <div className="text-center py-12 text-gray-500">No drivers found</div>}
      </div>
    </div>
  );
};
