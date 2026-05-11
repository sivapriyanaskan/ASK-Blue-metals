import { useEffect, useState } from 'react';
import { Plus, Search, Eye, Edit, Trash2, Save, ArrowLeft, Loader2, X, Wand2 } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';
import {
  customersApi,
  customerGstLookup,
  describeError,
  type CustomerRow,
  type CustomerInput,
  type CustomerVehicleInput,
} from '../services/mastersApi';

type Mode = 'list' | 'create' | 'edit' | 'view';
type BillTypeVal = 'TAX_INVOICE' | 'NON_GST';

interface FormState {
  name: string;
  address: string;
  state: string;
  billType: BillTypeVal;
  gstNumber: string;
  tcsApplicable: boolean;
  creditLimit: string;
  termsOfDelivery: string;
  paymentDueDays: string;
  contactPerson: string;
  phone: string;
  email: string;
  isActive: boolean;
  vehicles: CustomerVehicleInput[];
}

const empty: FormState = {
  name: '',
  address: '',
  state: '',
  billType: 'TAX_INVOICE',
  gstNumber: '',
  tcsApplicable: false,
  creditLimit: '0',
  termsOfDelivery: '',
  paymentDueDays: '0',
  contactPerson: '',
  phone: '',
  email: '',
  isActive: true,
  vehicles: [],
};

export const CustomerMaster = () => {
  const [mode, setMode] = useState<Mode>('list');
  const [items, setItems] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [viewing, setViewing] = useState<CustomerRow | null>(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await customersApi.list({ pageSize: 200, search: searchTerm || undefined });
      setItems(res.items);
    } catch (err) {
      setError(describeError(err, 'Failed to load customers'));
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
      const c = await customersApi.get(id);
      setForm({
        name: c.name,
        address: c.address ?? '',
        state: c.state ?? '',
        billType: c.billType === 'TAX_INVOICE' ? 'TAX_INVOICE' : 'NON_GST',
        gstNumber: c.gstNumber ?? '',
        tcsApplicable: c.tcsApplicable,
        creditLimit: c.creditLimit ?? '0',
        termsOfDelivery: c.termsOfDelivery ?? '',
        paymentDueDays: c.paymentDueDays != null ? String(c.paymentDueDays) : '0',
        contactPerson: c.contactPerson ?? '',
        phone: c.phone ?? '',
        email: c.email ?? '',
        isActive: c.isActive,
        vehicles: (c.vehicles ?? []).map((v) => ({
          vehicleNumber: v.vehicleNumber,
          driverName: v.driverName ?? undefined,
          driverPhone: v.driverPhone ?? undefined,
        })),
      });
      setEditingId(id);
      setMode('edit');
    } catch (err) {
      setError(describeError(err, 'Failed to load customer'));
    } finally {
      setLoading(false);
    }
  };

  const openView = async (id: string) => {
    setError(null);
    setLoading(true);
    try {
      const c = await customersApi.get(id);
      setViewing(c);
      setMode('view');
    } catch (err) {
      setError(describeError(err, 'Failed to load customer'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    if (form.billType === 'TAX_INVOICE' && !form.gstNumber.trim()) {
      setError('GST Number is required when Bill Type is TAX_INVOICE.');
      return;
    }
    // Vehicle Number is mandatory (#3). At least one valid row required.
    if (form.vehicles.length === 0) {
      setError('At least one vehicle is required for the customer.');
      return;
    }
    if (form.vehicles.some((v) => !v.vehicleNumber.trim())) {
      setError('Vehicle Number is mandatory for every vehicle row.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: CustomerInput = {
        name: form.name.trim(),
        address: form.address.trim() || undefined,
        state: form.state.trim() || undefined,
        billType: form.billType,
        gstNumber: form.billType === 'TAX_INVOICE' ? (form.gstNumber.trim() || undefined) : undefined,
        tcsApplicable: form.tcsApplicable,
        creditLimit: Number(form.creditLimit) || 0,
        termsOfDelivery: form.termsOfDelivery.trim() || undefined,
        paymentDueDays: Number(form.paymentDueDays) || 0,
        contactPerson: form.contactPerson.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        vehicles: form.vehicles.length ? form.vehicles : undefined,
        isActive: form.isActive,
      };
      if (editingId) {
        await customersApi.update(editingId, payload);
      } else {
        await customersApi.create(payload);
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
    if (!confirm('Deactivate this customer?')) return;
    try {
      await customersApi.deactivate(id);
      await reload();
    } catch (err) {
      setError(describeError(err, 'Deactivate failed'));
    }
  };

  const addVehicle = () => setForm({ ...form, vehicles: [...form.vehicles, { vehicleNumber: '' }] });
  const removeVehicle = (i: number) => setForm({ ...form, vehicles: form.vehicles.filter((_, idx) => idx !== i) });
  const setVehicle = (i: number, patch: Partial<CustomerVehicleInput>) =>
    setForm({ ...form, vehicles: form.vehicles.map((v, idx) => (idx === i ? { ...v, ...patch } : v)) });

  // GST autofill (#7). Calls our `/masters/customers/gst-lookup/:gstin` stub.
  const [gstLoading, setGstLoading] = useState(false);
  const fetchFromGst = async () => {
    const gstin = form.gstNumber.trim().toUpperCase();
    if (!gstin) {
      setError('Enter a GSTIN before fetching.');
      return;
    }
    setError(null);
    setGstLoading(true);
    try {
      const r = await customerGstLookup(gstin);
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

  if (mode === 'list') {
    return (
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Customer Master</h1>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
            <Plus className="w-4 h-4" /> Add Customer
          </button>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>}
        <div className="bg-white rounded-lg border border-gray-300 mb-4 p-4 relative">
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by code, name, GSTIN, phone…"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-300">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bill Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">State</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">GSTIN</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remaining Balance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{c.code}</td>
                  <td className="px-6 py-4 text-gray-900">{c.name}</td>
                  <td className="px-6 py-4 text-gray-600">{c.billType === 'TAX_INVOICE' ? 'Tax Invoice' : 'Invoice'}</td>
                  <td className="px-6 py-4 text-gray-600">{c.state ?? '-'}</td>
                  <td className="px-6 py-4 text-gray-600 font-mono text-xs">{c.gstNumber ?? '-'}</td>
                  <td className="px-6 py-4 text-gray-700 font-mono">₹{Number(c.remainingBalance ?? 0).toFixed(2)}</td>
                  <td className="px-6 py-4 text-gray-600">{c.phone ?? '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${c.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openView(c.id)} className="text-blue-600 hover:text-blue-900" title="View"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => openEdit(c.id)} className="text-green-600 hover:text-green-900" title="Edit"><Edit className="w-4 h-4" /></button>
                      {c.isActive && <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-900" title="Deactivate"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div className="text-center py-8 text-gray-500 flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>}
          {!loading && items.length === 0 && <div className="text-center py-12 text-gray-500">No customers found</div>}
        </div>
      </div>
    );
  }

  if (mode === 'view' && viewing) {
    return (
      <div className="p-6">
        <button onClick={() => setMode('list')} className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Customer List
        </button>
        <div className="max-w-4xl mx-auto bg-white rounded-lg border border-gray-300 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Customer Details</h1>
          <div className="grid grid-cols-2 gap-4">
            <Disp label="Code" value={viewing.code} />
            <Disp label="Name" value={viewing.name} />
            <Disp label="Bill Type" value={viewing.billType === 'TAX_INVOICE' ? 'Tax Invoice' : 'Invoice'} />
            <Disp label="State" value={viewing.state ?? '-'} />
            <Disp label="GSTIN" value={viewing.gstNumber ?? '-'} />
            <Disp label="TCS Applicable" value={viewing.tcsApplicable ? 'Yes' : 'No'} />
            <Disp label="Credit Limit" value={viewing.creditLimit} />
            <Disp label="Remaining Balance" value={`₹${Number(viewing.remainingBalance ?? 0).toFixed(2)}`} />
            <Disp label="Contact Person" value={viewing.contactPerson ?? '-'} />
            <Disp label="Phone" value={viewing.phone ?? '-'} />
            <Disp label="Email" value={viewing.email ?? '-'} />
            <Disp label="Status" value={viewing.isActive ? 'Active' : 'Inactive'} />
            <div className="col-span-2"><Disp label="Address" value={viewing.address ?? '-'} /></div>
            <div className="col-span-2"><Disp label="Terms of Delivery" value={viewing.termsOfDelivery ?? '-'} /></div>
            <div><Disp label="Payment Due Days" value={String(viewing.paymentDueDays ?? 0)} /></div>
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

  // create / edit form
  return (
    <div className="p-6">
      <button onClick={() => setMode('list')} className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Customer List
      </button>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">{mode === 'create' ? 'Create Customer' : 'Edit Customer'}</h1>
      </div>
      {error && <div className="max-w-4xl mx-auto mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>}
      {loading && <div className="max-w-4xl mx-auto mb-4 p-3 bg-gray-50 border border-gray-300 text-gray-700 rounded flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>}

      <div className="max-w-4xl mx-auto bg-white rounded-lg border border-gray-300 p-6">
        <h3 className="font-semibold mb-4 pb-2 border-b border-gray-300">Identity</h3>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Inp label="Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <div className="col-span-2"><Txt label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} /></div>
          <Inp label="State" value={form.state} onChange={(v) => setForm({ ...form, state: v })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bill Type *</label>
            <SearchableDropdown
              options={[
                { label: 'Tax Invoice', value: 'TAX_INVOICE' },
                { label: 'Invoice', value: 'NON_GST' },
              ]}
              value={form.billType}
              onValueChange={(v) => {
                const next = v as BillTypeVal;
                setForm((f) => ({ ...f, billType: next, gstNumber: next === 'TAX_INVOICE' ? f.gstNumber : '' }));
              }}
              placeholder="Select"
            />
          </div>
          {form.billType === 'TAX_INVOICE' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              GSTIN{form.billType === 'TAX_INVOICE' ? ' *' : ''}
            </label>
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
                title="Fetch customer details from GST portal"
              >
                {gstLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                Fetch
              </button>
            </div>
          </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">TCS Applicable</label>
            <SearchableDropdown
              options={[{ label: 'No', value: 'false' }, { label: 'Yes', value: 'true' }]}
              value={form.tcsApplicable ? 'true' : 'false'}
              onValueChange={(v) => setForm({ ...form, tcsApplicable: v === 'true' })}
              placeholder="Select"
            />
          </div>
          <Inp label="Credit Limit" value={form.creditLimit} onChange={(v) => setForm({ ...form, creditLimit: v })} type="number" />
        </div>

        <h3 className="font-semibold mb-4 pb-2 border-b border-gray-300">Contact</h3>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Inp label="Contact Person" value={form.contactPerson} onChange={(v) => setForm({ ...form, contactPerson: v })} />
          <Inp label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Inp label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
            <SearchableDropdown
              options={[{ label: 'Active', value: 'true' }, { label: 'Inactive', value: 'false' }]}
              value={form.isActive ? 'true' : 'false'}
              onValueChange={(v) => setForm({ ...form, isActive: v === 'true' })}
              placeholder="Select"
            />
          </div>
          <div className="col-span-2"><Txt label="Terms of Delivery" value={form.termsOfDelivery} onChange={(v) => setForm({ ...form, termsOfDelivery: v })} /></div>
          <div><Txt label="Payment Due Days" value={form.paymentDueDays} onChange={(v) => setForm({ ...form, paymentDueDays: v.replace(/[^0-9]/g, '') })} /></div>
        </div>

        <h3 className="font-semibold mb-4 pb-2 border-b border-gray-300 flex items-center justify-between">
          <span>Vehicles <span className="text-red-600">*</span></span>
          <button onClick={addVehicle} className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>
        </h3>
        <div className="space-y-2 mb-6">
          {form.vehicles.map((v, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4"><Inp label="Vehicle No. *" value={v.vehicleNumber} onChange={(s) => setVehicle(i, { vehicleNumber: s.toUpperCase() })} mono /></div>
              <div className="col-span-4"><Inp label="Driver Name" value={v.driverName ?? ''} onChange={(s) => setVehicle(i, { driverName: s })} /></div>
              <div className="col-span-3"><Inp label="Driver Phone" value={v.driverPhone ?? ''} onChange={(s) => setVehicle(i, { driverPhone: s })} /></div>
              <div className="col-span-1">
                <button onClick={() => removeVehicle(i)} className="p-2 text-red-600 hover:bg-red-50 rounded"><X className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          {form.vehicles.length === 0 && <p className="text-sm text-red-600">At least one vehicle is required.</p>}
        </div>

        <div className="flex gap-4">
          <button onClick={handleSave} disabled={saving || loading} className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2 font-medium">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {mode === 'create' ? 'Save Customer' : 'Update Customer'}
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

const Inp = ({ label, value, onChange, type = 'text', mono }: { label: string; value: string; onChange: (v: string) => void; type?: string; mono?: boolean }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${mono ? 'font-mono' : ''}`} />
  </div>
);

const Txt = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
  </div>
);
