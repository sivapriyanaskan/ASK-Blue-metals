import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { Save, ArrowLeft, Loader2 } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';
import { vehiclesApi, workCentresApi, describeError, type VehicleInput, type WorkCentreRow } from '../services/mastersApi';

interface Props {
  mode: 'create' | 'edit';
}

interface FormState {
  registrationNumber: string;
  name: string;
  workCentreId: string;
  tankCapacityLitres: string;
  emptyWeightKg: string;
  meterOpening: string;
  meterMax: string;
  hourOpening: string;
  hourMax: string;
  isActive: boolean;
}

const VehicleForm = ({ mode }: Props) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [form, setForm] = useState<FormState>({
    registrationNumber: '',
    name: '',
    workCentreId: '',
    tankCapacityLitres: '',
    emptyWeightKg: '',
    meterOpening: '',
    meterMax: '',
    hourOpening: '',
    hourMax: '',
    isActive: true,
  });
  const [workCentres, setWorkCentres] = useState<WorkCentreRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    workCentresApi
      .list({ pageSize: 200, isActive: true })
      .then((r) => setWorkCentres(r.items))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (mode !== 'edit' || !id) return;
    setLoading(true);
    vehiclesApi
      .get(id)
      .then((v) => {
        setForm({
          registrationNumber: v.registrationNumber,
          name: v.name,
          workCentreId: v.workCentreId ?? '',
          tankCapacityLitres: v.tankCapacityLitres ?? '',
          emptyWeightKg: v.emptyWeightKg ?? '',
          meterOpening: v.meterOpening ?? '',
          meterMax: v.meterMax ?? '',
          hourOpening: v.hourOpening ?? '',
          hourMax: v.hourMax ?? '',
          isActive: v.isActive,
        });
      })
      .catch((err) => setError(describeError(err, 'Failed to load vehicle')))
      .finally(() => setLoading(false));
  }, [mode, id]);

  const numOrUndef = (s: string) => (s.trim() === '' ? undefined : Number(s));

  const handleSave = async () => {
    if (!form.registrationNumber.trim() || !form.name.trim()) {
      setError('Registration number and name are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: VehicleInput = {
        registrationNumber: form.registrationNumber.trim().toUpperCase(),
        name: form.name.trim(),
        workCentreId: form.workCentreId || null,
        tankCapacityLitres: numOrUndef(form.tankCapacityLitres),
        emptyWeightKg: numOrUndef(form.emptyWeightKg),
        meterOpening: numOrUndef(form.meterOpening),
        meterMax: numOrUndef(form.meterMax),
        hourOpening: numOrUndef(form.hourOpening),
        hourMax: numOrUndef(form.hourMax),
        isActive: form.isActive,
      };
      if (mode === 'create') {
        await vehiclesApi.create(payload);
      } else if (id) {
        await vehiclesApi.update(id, payload);
      }
      navigate('/masters/vehicle');
    } catch (err) {
      setError(describeError(err, 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  const wcOptions = workCentres.map((wc) => ({ label: `${wc.code} - ${wc.name}`, value: wc.id }));

  return (
    <div className="p-6">
      <Link to="/masters/vehicle" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Vehicle List
      </Link>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">{mode === 'create' ? 'Create Vehicle' : 'Edit Vehicle'}</h1>
      </div>

      {error && <div className="max-w-4xl mx-auto mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>}
      {loading && <div className="max-w-4xl mx-auto mb-4 p-3 bg-gray-50 border border-gray-300 text-gray-700 rounded flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>}

      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <h3 className="font-semibold mb-4 pb-2 border-b border-gray-300">Vehicle Identity</h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number *</label>
              <input
                type="text"
                value={form.registrationNumber}
                onChange={(e) => setForm({ ...form, registrationNumber: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder="MH12AB1234"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Tata 407 Truck"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Work Centre</label>
              <SearchableDropdown
                options={[{ label: '— None —', value: '' }, ...wcOptions]}
                value={form.workCentreId}
                onValueChange={(v) => setForm({ ...form, workCentreId: v })}
                placeholder="Select work centre"
              />
            </div>
          </div>

          <h3 className="font-semibold mb-4 pb-2 border-b border-gray-300">Capacity &amp; Meters</h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tank Capacity (L)</label>
              <input type="number" step="0.01" value={form.tankCapacityLitres} onChange={(e) => setForm({ ...form, tankCapacityLitres: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Empty Weight (kg)</label>
              <input type="number" step="0.01" value={form.emptyWeightKg} onChange={(e) => setForm({ ...form, emptyWeightKg: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meter Opening</label>
              <input type="number" step="0.01" value={form.meterOpening} onChange={(e) => setForm({ ...form, meterOpening: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meter Max</label>
              <input type="number" step="0.01" value={form.meterMax} onChange={(e) => setForm({ ...form, meterMax: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hour Opening</label>
              <input type="number" step="0.01" value={form.hourOpening} onChange={(e) => setForm({ ...form, hourOpening: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hour Max</label>
              <input type="number" step="0.01" value={form.hourMax} onChange={(e) => setForm({ ...form, hourMax: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
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
            <button onClick={handleSave} disabled={saving || loading} className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2 font-medium">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {mode === 'create' ? 'Save Vehicle' : 'Update Vehicle'}
            </button>
            <Link to="/masters/vehicle" className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium">Cancel</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export const VehicleMasterCreate = () => <VehicleForm mode="create" />;
export const VehicleMasterEdit = () => <VehicleForm mode="edit" />;
