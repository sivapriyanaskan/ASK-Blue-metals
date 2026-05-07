import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Trash2, Save, ArrowLeft, Loader2, Snowflake } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';
import {
  customerFreezesApi,
  customersApi,
  itemsApi,
  describeError,
  type CustomerFreezeRow,
  type CustomerRow,
  type ItemRow,
} from '../services/mastersApi';

type Mode = 'list' | 'create';

interface FormState {
  customerId: string;
  itemId: string;
  validFrom: string;
  validTo: string;
  reason: string;
}
const empty: FormState = { customerId: '', itemId: '', validFrom: '', validTo: '', reason: '' };

export const FreezeItemToCustomer = () => {
  const [mode, setMode] = useState<Mode>('list');
  const [items, setItems] = useState<CustomerFreezeRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [itemsList, setItemsList] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<FormState>(empty);

  useEffect(() => {
    Promise.all([customersApi.list({ pageSize: 200 }), itemsApi.list({ pageSize: 200 })])
      .then(([c, i]) => { setCustomers(c.items); setItemsList(i.items); })
      .catch(() => undefined);
  }, []);

  const reload = async () => {
    setLoading(true); setError(null);
    try {
      const res = await customerFreezesApi.list({ pageSize: 200 });
      setItems(res.items);
    } catch (err) { setError(describeError(err, 'Failed to load freezes')); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (mode === 'list') void reload(); }, [mode]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((r) =>
      r.customer?.name.toLowerCase().includes(q) ||
      r.customer?.code.toLowerCase().includes(q) ||
      (r.item?.name?.toLowerCase().includes(q) ?? false) ||
      (r.reason?.toLowerCase().includes(q) ?? false),
    );
  }, [items, search]);

  const openCreate = () => { setForm(empty); setError(null); setMode('create'); };

  const handleSave = async () => {
    if (!form.customerId || !form.validFrom || !form.validTo) { setError('Customer, valid from and valid to are required.'); return; }
    if (new Date(form.validFrom) > new Date(form.validTo)) { setError('Valid From must be on or before Valid To.'); return; }
    setSaving(true); setError(null);
    try {
      await customerFreezesApi.create({
        customerId: form.customerId,
        itemId: form.itemId || null,
        validFrom: new Date(form.validFrom).toISOString(),
        validTo: new Date(form.validTo).toISOString(),
        reason: form.reason.trim() || undefined,
      });
      setMode('list');
    } catch (err) { setError(describeError(err, 'Save failed')); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this freeze?')) return;
    try { await customerFreezesApi.remove(id); await reload(); }
    catch (err) { setError(describeError(err, 'Delete failed')); }
  };

  const customerOptions = customers.map((c) => ({ label: `${c.code} — ${c.name}`, value: c.id }));
  const itemOptions = [
    { label: 'All items (freeze entire customer)', value: '' },
    ...itemsList.map((i) => ({ label: `${i.code} — ${i.name}`, value: i.id })),
  ];

  if (mode === 'list') {
    return (
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Freeze Item-to-Customer</h1>
            <p className="text-sm text-gray-500 mt-1">Block sales of specific items (or all items) to a customer for a date range.</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
            <Plus className="w-4 h-4" /> Add Freeze
          </button>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>}
        <div className="bg-white rounded-lg border border-gray-300 mb-4 p-4 relative">
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by customer, item or reason…" className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-300">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valid From</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valid To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
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
                    {r.itemId ? (
                      <>
                        <div className="font-medium text-gray-900">{r.item?.name ?? r.itemId}</div>
                        <div className="text-xs text-gray-500">{r.item?.code}</div>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-amber-50 text-amber-800 rounded">
                        <Snowflake className="w-3 h-3" /> All items
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-600">{new Date(r.validFrom).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-xs text-gray-600">{new Date(r.validTo).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{r.reason ?? '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDelete(r.id)} className="text-red-600 hover:text-red-900" title="Delete"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div className="text-center py-8 text-gray-500 flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>}
          {!loading && filtered.length === 0 && <div className="text-center py-12 text-gray-500">No freezes found</div>}
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
        <h1 className="text-2xl font-bold text-gray-900">Add Freeze</h1>
      </div>
      {error && <div className="max-w-2xl mx-auto mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>}
      <div className="max-w-2xl mx-auto bg-white rounded-lg border border-gray-300 p-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
            <SearchableDropdown options={customerOptions} value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })} placeholder="Select customer" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Item</label>
            <SearchableDropdown options={itemOptions} value={form.itemId} onValueChange={(v) => setForm({ ...form, itemId: v })} placeholder="All items" />
            <p className="text-xs text-gray-500 mt-1">Leave as "All items" to block every item for this customer.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valid From *</label>
            <input type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valid To *</label>
            <input type="date" value={form.validTo} onChange={(e) => setForm({ ...form, validTo: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} maxLength={500} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="flex gap-4">
          <button onClick={handleSave} disabled={saving} className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2 font-medium">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Freeze
          </button>
          <button onClick={() => setMode('list')} className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default FreezeItemToCustomer;
