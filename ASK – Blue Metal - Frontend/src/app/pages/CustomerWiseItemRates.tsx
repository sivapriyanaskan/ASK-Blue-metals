import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Edit, Trash2, Save, ArrowLeft, Loader2 } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';
import {
  customerRatesApi,
  customersApi,
  itemsApi,
  describeError,
  type CustomerRateRow,
  type CustomerRow,
  type ItemRow,
} from '../services/mastersApi';

type Mode = 'list' | 'create' | 'edit';

interface FormState {
  customerId: string;
  itemId: string;
  rate: string;
  validFrom: string;
  validTo: string;
  isActive: boolean;
}
const empty: FormState = { customerId: '', itemId: '', rate: '', validFrom: '', validTo: '', isActive: true };
const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : '');

export const CustomerWiseItemRates = () => {
  const [mode, setMode] = useState<Mode>('list');
  const [items, setItems] = useState<CustomerRateRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [itemsList, setItemsList] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty);

  useEffect(() => {
    Promise.all([customersApi.list({ pageSize: 200 }), itemsApi.list({ pageSize: 200 })])
      .then(([c, i]) => { setCustomers(c.items); setItemsList(i.items); })
      .catch(() => undefined);
  }, []);

  const reload = async () => {
    setLoading(true); setError(null);
    try {
      const res = await customerRatesApi.list({ pageSize: 200 });
      setItems(res.items);
    } catch (err) { setError(describeError(err, 'Failed to load rates')); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (mode === 'list') void reload(); }, [mode]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((r) =>
      r.customer?.name.toLowerCase().includes(q) ||
      r.customer?.code.toLowerCase().includes(q) ||
      r.item?.name.toLowerCase().includes(q) ||
      r.item?.code.toLowerCase().includes(q),
    );
  }, [items, search]);

  const openCreate = () => { setForm(empty); setEditingId(null); setError(null); setMode('create'); };
  const openEdit = (r: CustomerRateRow) => {
    setForm({
      customerId: r.customerId, itemId: r.itemId, rate: String(r.rate),
      validFrom: toDateInput(r.validFrom), validTo: toDateInput(r.validTo), isActive: r.isActive,
    });
    setEditingId(r.id); setError(null); setMode('edit');
  };

  const handleSave = async () => {
    if (!form.customerId || !form.itemId || !form.rate) { setError('Customer, item and rate are required.'); return; }
    const rateNum = Number(form.rate);
    if (!Number.isFinite(rateNum) || rateNum < 0) { setError('Rate must be a non-negative number.'); return; }
    setSaving(true); setError(null);
    try {
      if (editingId) {
        await customerRatesApi.update(editingId, {
          rate: rateNum,
          validFrom: form.validFrom ? new Date(form.validFrom).toISOString() : null,
          validTo: form.validTo ? new Date(form.validTo).toISOString() : null,
          isActive: form.isActive,
        });
      } else {
        await customerRatesApi.create({
          customerId: form.customerId, itemId: form.itemId, rate: rateNum,
          validFrom: form.validFrom ? new Date(form.validFrom).toISOString() : undefined,
          validTo: form.validTo ? new Date(form.validTo).toISOString() : undefined,
          isActive: form.isActive,
        });
      }
      setMode('list');
    } catch (err) { setError(describeError(err, 'Save failed')); }
    finally { setSaving(false); }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Deactivate this rate?')) return;
    try { await customerRatesApi.deactivate(id); await reload(); }
    catch (err) { setError(describeError(err, 'Deactivate failed')); }
  };

  const customerOptions = customers.map((c) => ({ label: `${c.code} — ${c.name}`, value: c.id }));
  const itemOptions = itemsList.map((i) => ({ label: `${i.code} — ${i.name}`, value: i.id }));

  if (mode === 'list') {
    return (
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customer-wise Item Rates</h1>
            <p className="text-sm text-gray-500 mt-1">Negotiated sales rates per customer per item with validity windows.</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
            <Plus className="w-4 h-4" /> Add Rate
          </button>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>}
        <div className="bg-white rounded-lg border border-gray-300 mb-4 p-4 relative">
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by customer or item…" className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-300">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valid From</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valid To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm">
                    <div className="font-medium text-gray-900">{r.customer?.name ?? r.customerId}</div>
                    <div className="text-xs text-gray-500">{r.customer?.code}</div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="font-medium text-gray-900">{r.item?.name ?? r.itemId}</div>
                    <div className="text-xs text-gray-500">{r.item?.code}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-mono">{Number(r.rate).toFixed(2)}</td>
                  <td className="px-6 py-4 text-xs text-gray-600">{r.validFrom ? new Date(r.validFrom).toLocaleDateString() : 'Always'}</td>
                  <td className="px-6 py-4 text-xs text-gray-600">{r.validTo ? new Date(r.validTo).toLocaleDateString() : 'Always'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${r.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                      {r.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(r)} className="text-green-600 hover:text-green-900" title="Edit"><Edit className="w-4 h-4" /></button>
                      {r.isActive && <button onClick={() => handleDeactivate(r.id)} className="text-red-600 hover:text-red-900" title="Deactivate"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div className="text-center py-8 text-gray-500 flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>}
          {!loading && filtered.length === 0 && <div className="text-center py-12 text-gray-500">No rates found</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <button onClick={() => setMode('list')} className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to List
      </button>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">{mode === 'create' ? 'Add Customer Rate' : 'Edit Customer Rate'}</h1>
      </div>
      {error && <div className="max-w-2xl mx-auto mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>}
      <div className="max-w-2xl mx-auto bg-white rounded-lg border border-gray-300 p-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
            <SearchableDropdown options={customerOptions} value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })} placeholder="Select customer" disabled={mode === 'edit'} />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Item *</label>
            <SearchableDropdown options={itemOptions} value={form.itemId} onValueChange={(v) => setForm({ ...form, itemId: v })} placeholder="Select item" disabled={mode === 'edit'} />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Rate *</label>
            <input type="number" step="0.01" min={0} value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valid From</label>
            <input type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valid To</label>
            <input type="date" value={form.validTo} onChange={(e) => setForm({ ...form, validTo: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <label className="col-span-2 flex items-center gap-2 mt-2">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            <span className="text-sm">Active</span>
          </label>
        </div>
        <div className="flex gap-4">
          <button onClick={handleSave} disabled={saving} className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2 font-medium">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {mode === 'create' ? 'Save' : 'Update'}
          </button>
          <button onClick={() => setMode('list')} className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default CustomerWiseItemRates;
