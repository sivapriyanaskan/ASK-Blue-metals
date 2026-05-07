import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { Save, ArrowLeft, Loader2 } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';
import { workCentresApi, describeError, type WorkCentreInput } from '../services/mastersApi';

interface Props {
  mode: 'create' | 'edit';
}

const WorkCentreForm = ({ mode }: Props) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [form, setForm] = useState<WorkCentreInput>({
    code: '',
    name: '',
    address: '',
    isActive: true,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'edit' || !id) return;
    setLoading(true);
    workCentresApi
      .get(id)
      .then((wc) => {
        setForm({
          code: wc.code,
          name: wc.name,
          address: wc.address ?? '',
          isActive: wc.isActive,
        });
      })
      .catch((err) => setError(describeError(err, 'Failed to load work centre')))
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
      const payload: WorkCentreInput = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        address: form.address?.trim() || undefined,
        isActive: form.isActive,
      };
      if (mode === 'create') {
        await workCentresApi.create(payload);
      } else if (id) {
        await workCentresApi.update(id, payload);
      }
      navigate('/masters/work-centre');
    } catch (err) {
      setError(describeError(err, 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <Link to="/masters/work-centre" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Work Centre List
      </Link>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">{mode === 'create' ? 'Create Work Centre' : 'Edit Work Centre'}</h1>
      </div>

      {error && <div className="max-w-4xl mx-auto mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>}
      {loading && <div className="max-w-4xl mx-auto mb-4 p-3 bg-gray-50 border border-gray-300 text-gray-700 rounded flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>}

      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <h3 className="font-semibold mb-4 pb-2 border-b border-gray-300">Work Centre Details</h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="WC001"
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
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea
                value={form.address ?? ''}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter address"
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
              {mode === 'create' ? 'Save Work Centre' : 'Update Work Centre'}
            </button>
            <Link to="/masters/work-centre" className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium">
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export const WorkCentreMasterCreate = () => <WorkCentreForm mode="create" />;
export const WorkCentreMasterEdit = () => <WorkCentreForm mode="edit" />;
