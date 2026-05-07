import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Plus, Search, Eye, Edit, Trash2, Loader2 } from 'lucide-react';
import { SearchableDropdown, type SearchableDropdownOption } from '../components/ui/searchable-dropdown';
import { vehiclesApi, workCentresApi, describeError, type VehicleRow, type WorkCentreRow } from '../services/mastersApi';

const statusOptions: SearchableDropdownOption[] = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'true' },
  { label: 'Inactive', value: 'false' },
];

export const VehicleMasterList = () => {
  const [items, setItems] = useState<VehicleRow[]>([]);
  const [workCentres, setWorkCentres] = useState<WorkCentreRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    workCentresApi
      .list({ pageSize: 200, isActive: true })
      .then((r) => setWorkCentres(r.items))
      .catch(() => undefined);
  }, []);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await vehiclesApi.list({
        pageSize: 200,
        search: searchTerm || undefined,
        isActive: isActiveFilter === '' ? undefined : isActiveFilter === 'true',
      });
      setItems(res.items);
    } catch (err) {
      setError(describeError(err, 'Failed to load vehicles'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handle = setTimeout(() => void reload(), 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, isActiveFilter]);

  const wcLookup = (id?: string | null) => workCentres.find((w) => w.id === id)?.name ?? '-';

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this vehicle?')) return;
    try {
      await vehiclesApi.deactivate(id);
      await reload();
    } catch (err) {
      setError(describeError(err, 'Deactivate failed'));
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Vehicle Master</h1>
        <Link to="/masters/vehicle/create" className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
          <Plus className="w-4 h-4" /> Add Vehicle
        </Link>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>}

      <div className="bg-white rounded-lg border border-gray-300 mb-6 p-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by registration number or name…"
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reg. No.</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Work Centre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tank (L)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empty (kg)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((v) => (
              <tr key={v.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-mono font-medium text-gray-900">{v.registrationNumber}</td>
                <td className="px-6 py-4 text-gray-900">{v.name}</td>
                <td className="px-6 py-4 text-gray-600">{wcLookup(v.workCentreId)}</td>
                <td className="px-6 py-4 text-gray-600">{v.tankCapacityLitres ?? '-'}</td>
                <td className="px-6 py-4 text-gray-600">{v.emptyWeightKg ?? '-'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${v.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {v.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <Link to={`/masters/vehicle/${v.id}`} className="text-blue-600 hover:text-blue-900" title="View"><Eye className="w-4 h-4" /></Link>
                    <Link to={`/masters/vehicle/${v.id}/edit`} className="text-green-600 hover:text-green-900" title="Edit"><Edit className="w-4 h-4" /></Link>
                    {v.isActive && (
                      <button onClick={() => handleDelete(v.id)} className="text-red-600 hover:text-red-900" title="Deactivate"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <div className="text-center py-8 text-gray-500 flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>}
        {!loading && items.length === 0 && <div className="text-center py-12 text-gray-500">No vehicles found</div>}
      </div>
    </div>
  );
};
