import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { Save, ArrowLeft, Loader2 } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';
import { driversApi, describeError, type DriverInput } from '../services/mastersApi';

interface Props {
  mode: 'create' | 'edit';
}

const DriverForm = ({ mode }: Props) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [form, setForm] = useState<DriverInput>({
    code: '',
    name: '',
    isDriver: true,
    phone: '',
    designation: '',
    isActive: true,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'edit' || !id) return;
    setLoading(true);
    driversApi
      .get(id)
      .then((d) => {
        setForm({
          code: d.code,
          name: d.name,
          isDriver: d.isDriver,
          phone: d.phone ?? '',
          designation: d.designation ?? '',
          isActive: d.isActive,
        });
      })
      .catch((err) => setError(describeError(err, 'Failed to load driver')))
      .finally(() => setLoading(false));
  }, [mode, id]);

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      setError('Code and name are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: DriverInput = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        isDriver: form.isDriver,
        phone: form.phone?.trim() || undefined,
        designation: form.designation?.trim() || undefined,
        isActive: form.isActive,
      };
      if (mode === 'create') {
        await driversApi.create(payload);
      } else if (id) {
        await driversApi.update(id, payload);
      }
      navigate('/masters/driver');
    } catch (err) {
      setError(describeError(err, 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <Link to="/masters/driver" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Driver List
      </Link>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">{mode === 'create' ? 'Create Driver / Labour' : 'Edit Driver / Labour'}</h1>
      </div>

      {error && (
        <div className="max-w-4xl mx-auto mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>
      )}
      {loading && (
        <div className="max-w-4xl mx-auto mb-4 p-3 bg-gray-50 border border-gray-300 text-gray-700 rounded text-sm flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <h3 className="font-semibold mb-4 pb-2 border-b border-gray-300">Driver Identity</h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="DRV001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="text"
                value={form.phone ?? ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder="+91 9876543210"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
              <input
                type="text"
                value={form.designation ?? ''}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Driver / Labour / Operator"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <SearchableDropdown
                options={[
                  { label: 'Driver', value: 'true' },
                  { label: 'Labour', value: 'false' },
                ]}
                value={form.isDriver ? 'true' : 'false'}
                onValueChange={(v) => setForm({ ...form, isDriver: v === 'true' })}
                placeholder="Select type"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
              <SearchableDropdown
                options={[
                  { label: 'Active', value: 'true' },
                  { label: 'Inactive', value: 'false' },
                ]}
                value={form.isActive ? 'true' : 'false'}
                onValueChange={(v) => setForm({ ...form, isActive: v === 'true' })}
                placeholder="Select status"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {mode === 'create' ? 'Save Driver' : 'Update Driver'}
            </button>
            <Link to="/masters/driver" className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium">
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export const DriverLabourMasterCreate = () => <DriverForm mode="create" />;
export const DriverLabourMasterEdit = () => <DriverForm mode="edit" />;
