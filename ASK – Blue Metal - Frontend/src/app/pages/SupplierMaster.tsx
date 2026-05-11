import { useEffect, useState } from 'react';
import { Plus, Search, Eye, Edit, Trash2, Save, ArrowLeft, Loader2, X, Wand2 } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';
import {
  suppliersApi,
  supplierGstLookup,
  accountsApi,
  describeError,
  type SupplierRow,
  type SupplierInput,
  type SupplierVehicleInput,
  type AccountRow,
} from '../services/mastersApi';

type Mode = 'list' | 'create' | 'edit' | 'view';

interface FormState {
  name: string;
  address: string;
  state: string;
  supplierType: 'TON_BASED' | 'REPAIR_MAINTENANCE';
  controlAccountId: string;
  gstNumber: string;
  contactPerson: string;
  phone: string;
  email: string;
  isActive: boolean;
  vehicles: SupplierVehicleInput[];
}

const empty: FormState = {
  name: '',
  address: '',
  state: '',
  supplierType: 'TON_BASED',
  controlAccountId: '',
  gstNumber: '',
  contactPerson: '',
  phone: '',
  email: '',
  isActive: true,
  vehicles: [],
};

export const SupplierMaster = () => {
  const [mode, setMode] = useState<Mode>('list');
  const [items, setItems] = useState<SupplierRow[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [viewing, setViewing] = useState<SupplierRow | null>(null);
  const [gstLoading, setGstLoading] = useState(false);

  useEffect(() => {
    accountsApi.list({ pageSize: 200, isActive: true }).then((r) => setAccounts(r.items)).catch(() => undefined);
  }, []);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await suppliersApi.list({ pageSize: 200, search: searchTerm || undefined });
      setItems(res.items);
    } catch (err) {
      setError(describeError(err, 'Failed to load suppliers'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode !== 'list') return;
    const handle = setTimeout(() => void reload(), 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, mode]);

  const openCreate = () => {
    setForm(empty);
    setEditingId(null);
    setError(null);
    setMode('create');
  };

  const openEdit = async (id: string) => {
    setError(null);
    setLoading(true);
    try {
      const s = await suppliersApi.get(id);
      setForm({
        name: s.name,
        address: s.address ?? '',
        state: s.state ?? '',
        supplierType: s.supplierType,
        controlAccountId: s.controlAccountId ?? '',
        gstNumber: s.gstNumber ?? '',
        contactPerson: s.contactPerson ?? '',
        phone: s.phone ?? '',
        email: s.email ?? '',
        isActive: s.isActive,
        vehicles: (s.vehicles ?? []).map((v) => ({
          vehicleNumber: v.vehicleNumber,
          driverName: v.driverName ?? undefined,
          driverPhone: v.driverPhone ?? undefined,
        })),
      });
      setEditingId(id);
      setMode('edit');
    } catch (err) {
      setError(describeError(err, 'Failed to load supplier'));
    } finally {
      setLoading(false);
    }
  };

  const openView = async (id: string) => {
    setError(null);
    setLoading(true);
    try {
      const s = await suppliersApi.get(id);
      setViewing(s);
      setMode('view');
    } catch (err) {
      setError(describeError(err, 'Failed to load supplier'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const normalizedVehicles = form.vehicles
        .map((v) => ({
          vehicleNumber: v.vehicleNumber.trim().toUpperCase(),
          driverName: v.driverName?.trim() || undefined,
          driverPhone: v.driverPhone?.trim() || undefined,
        }))
        .filter((v) => v.vehicleNumber);

      const payload: SupplierInput = {
        name: form.name.trim(),
        address: form.address.trim() || undefined,
        state: form.state.trim() || undefined,
        supplierType: form.supplierType,
        controlAccountId: form.controlAccountId || undefined,
        gstNumber: form.gstNumber.trim() || undefined,
        contactPerson: form.contactPerson.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        vehicles: normalizedVehicles,
        isActive: form.isActive,
      };
      if (editingId) {
        await suppliersApi.update(editingId, payload);
      } else {
        await suppliersApi.create(payload);
      }
      setMode('list');
      await reload();
    } catch (err) {
      setError(describeError(err, 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this supplier?')) return;
    try {
      await suppliersApi.deactivate(id);
      await reload();
    } catch (err) {
      setError(describeError(err, 'Deactivate failed'));
    }
  };

  const addVehicle = () => setForm({ ...form, vehicles: [...form.vehicles, { vehicleNumber: '' }] });
  const removeVehicle = (i: number) => setForm({ ...form, vehicles: form.vehicles.filter((_, idx) => idx !== i) });
  const setVehicle = (i: number, patch: Partial<SupplierVehicleInput>) =>
    setForm({ ...form, vehicles: form.vehicles.map((v, idx) => (idx === i ? { ...v, ...patch } : v)) });

  const fetchFromGst = async () => {
    const gstin = form.gstNumber.trim().toUpperCase();
    if (!gstin) {
      setError('Enter a GSTIN before fetching.');
      return;
    }
    setError(null);
    setGstLoading(true);
    try {
      const r = await supplierGstLookup(gstin);
      setForm((f) => ({
        ...f,
        name: r.legalName || r.tradeName || f.name,
        address: r.address || [r.area, r.city, r.state].filter(Boolean).join(', ') || f.address,
        state: r.state || f.state,
        gstNumber: gstin,
      }));
    } catch (err) {
      setError(describeError(err, 'GST lookup failed'));
    } finally {
      setGstLoading(false);
    }
  };

  const accountOptions = [{ label: '— None —', value: '' }, ...accounts.map((a) => ({ label: `${a.code} - ${a.name}`, value: a.id }))];
  const accountName = (id?: string | null) => accounts.find((a) => a.id === id)?.name ?? '-';

  if (mode === 'list') {
    return (
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Supplier Master</h1>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
            <Plus className="w-4 h-4" /> Add Supplier
          </button>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>}
        <div className="bg-white rounded-lg border border-gray-300 mb-4 p-4 relative">
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by code, name, GSTIN…"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-300">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{s.code}</td>
                  <td className="px-6 py-4 text-gray-900">{s.name}</td>
                  <td className="px-6 py-4 text-gray-600">{s.supplierType === 'TON_BASED' ? 'Ton Based' : 'Repair / Maintenance'}</td>
                  <td className="px-6 py-4 text-gray-600">{s.phone ?? '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${s.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openView(s.id)} className="text-blue-600 hover:text-blue-900" title="View"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => openEdit(s.id)} className="text-green-600 hover:text-green-900" title="Edit"><Edit className="w-4 h-4" /></button>
                      {s.isActive && <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:text-red-900" title="Deactivate"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div className="text-center py-8 text-gray-500 flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>}
          {!loading && items.length === 0 && <div className="text-center py-12 text-gray-500">No suppliers found</div>}
        </div>
      </div>
    );
  }

  if (mode === 'view' && viewing) {
    return (
      <div className="p-6">
        <button onClick={() => setMode('list')} className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Supplier List
        </button>
        <div className="max-w-4xl mx-auto bg-white rounded-lg border border-gray-300 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Supplier Details</h1>
          <div className="grid grid-cols-2 gap-4">
            <Disp label="Code" value={viewing.code} />
            <Disp label="Name" value={viewing.name} />
            <Disp label="Type" value={viewing.supplierType} />
            <Disp label="Control Account" value={accountName(viewing.controlAccountId)} />
            <Disp label="State" value={viewing.state ?? '-'} />
            <Disp label="GSTIN" value={viewing.gstNumber ?? '-'} />
            <Disp label="Contact Person" value={viewing.contactPerson ?? '-'} />
            <Disp label="Phone" value={viewing.phone ?? '-'} />
            <Disp label="Email" value={viewing.email ?? '-'} />
            <Disp label="Status" value={viewing.isActive ? 'Active' : 'Inactive'} />
            <div className="col-span-2"><Disp label="Address" value={viewing.address ?? '-'} /></div>
          </div>
          {viewing.vehicles && viewing.vehicles.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Vehicles</h3>
              <div className="border border-gray-300 rounded">
                {viewing.vehicles.map((v) => (
                  <div key={v.id} className="p-3 border-b border-gray-100 last:border-b-0 flex justify-between text-sm">
                    <span className="font-mono">{v.vehicleNumber}</span>
                    <span className="text-gray-600">{v.driverName ?? ''} {v.driverPhone ? `· ${v.driverPhone}` : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-6 flex gap-3">
            <button onClick={() => openEdit(viewing.id)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"><Edit className="w-4 h-4" /> Edit</button>
            <button onClick={() => setMode('list')} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <button onClick={() => setMode('list')} className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Supplier List
      </button>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">{mode === 'create' ? 'Create Supplier' : 'Edit Supplier'}</h1>
      </div>
      {error && <div className="max-w-4xl mx-auto mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>}
      {loading && <div className="max-w-4xl mx-auto mb-4 p-3 bg-gray-50 border border-gray-300 text-gray-700 rounded flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>}

      <div className="max-w-4xl mx-auto bg-white rounded-lg border border-gray-300 p-6">
        <h3 className="font-semibold mb-4 pb-2 border-b border-gray-300">Identity</h3>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Inp label="Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.gstNumber}
                onChange={(e) => setForm({ ...form, gstNumber: e.target.value.toUpperCase() })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <button
                type="button"
                onClick={fetchFromGst}
                disabled={gstLoading || !form.gstNumber.trim()}
                className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 flex items-center gap-1 text-sm"
                title="Fetch supplier details from GST portal"
              >
                {gstLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                Fetch
              </button>
            </div>
          </div>
          <div className="col-span-2"><Txt label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} /></div>
          <div><Inp label="State" value={form.state} onChange={() => undefined} disabled /></div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Type *</label>
            <SearchableDropdown
              options={[{ label: 'Ton Based', value: 'TON_BASED' }, { label: 'Repair / Maintenance', value: 'REPAIR_MAINTENANCE' }]}
              value={form.supplierType}
              onValueChange={(v) => setForm({ ...form, supplierType: v as 'TON_BASED' | 'REPAIR_MAINTENANCE' })}
              placeholder="Select"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Control Account</label>
            <SearchableDropdown options={accountOptions} value={form.controlAccountId} onValueChange={(v) => setForm({ ...form, controlAccountId: v })} placeholder="Select account" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
            <SearchableDropdown
              options={[{ label: 'Active', value: 'true' }, { label: 'Inactive', value: 'false' }]}
              value={form.isActive ? 'true' : 'false'}
              onValueChange={(v) => setForm({ ...form, isActive: v === 'true' })}
              placeholder="Select"
            />
          </div>
        </div>

        <h3 className="font-semibold mb-4 pb-2 border-b border-gray-300">Contact</h3>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Inp label="Contact Person" value={form.contactPerson} onChange={(v) => setForm({ ...form, contactPerson: v })} />
          <Inp label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Inp label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        </div>

        <h3 className="font-semibold mb-4 pb-2 border-b border-gray-300 flex items-center justify-between">
          Vehicles
          <button onClick={addVehicle} className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>
        </h3>
        <div className="space-y-2 mb-6">
          {form.vehicles.map((v, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4"><Inp label="Vehicle No." value={v.vehicleNumber} onChange={(s) => setVehicle(i, { vehicleNumber: s.toUpperCase() })} mono /></div>
              <div className="col-span-4"><Inp label="Driver Name" value={v.driverName ?? ''} onChange={(s) => setVehicle(i, { driverName: s })} /></div>
              <div className="col-span-3"><Inp label="Driver Phone" value={v.driverPhone ?? ''} onChange={(s) => setVehicle(i, { driverPhone: s })} /></div>
              <div className="col-span-1">
                <button onClick={() => removeVehicle(i)} className="p-2 text-red-600 hover:bg-red-50 rounded"><X className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          {form.vehicles.length === 0 && <p className="text-sm text-gray-500">No vehicles added.</p>}
        </div>

        <div className="flex gap-4">
          <button onClick={handleSave} disabled={saving || loading} className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2 font-medium">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {mode === 'create' ? 'Save Supplier' : 'Update Supplier'}
          </button>
          <button onClick={() => setMode('list')} className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
        </div>
      </div>
    </div>
  );
};

const Disp = ({ label, value }: { label: string; value: string | number }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input type="text" value={String(value)} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" />
  </div>
);

const Inp = ({ label, value, onChange, type = 'text', mono, disabled }: { label: string; value: string; onChange: (v: string) => void; type?: string; mono?: boolean; disabled?: boolean }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input type={type} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${mono ? 'font-mono' : ''} ${disabled ? 'bg-gray-50' : ''}`} />
  </div>
);

const Txt = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
  </div>
);
