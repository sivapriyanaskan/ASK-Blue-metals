import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Edit, Trash2, Save, ArrowLeft, Loader2 } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';
import {
  supplierRatesApi,
  suppliersApi,
  itemsApi,
  describeError,
  type SupplierRateRow,
  type SupplierRow,
  type ItemRow,
} from '../services/mastersApi';

type Mode = 'list' | 'create' | 'edit';

// Single-row edit (kept for quick edits from the list).
interface FormState {
  supplierId: string;
  itemId: string;
  rate: string;
  validFrom: string;
  validTo: string;
  isActive: boolean;
}
const empty: FormState = { supplierId: '', itemId: '', rate: '', validFrom: '', validTo: '', isActive: true };

// One line in the bulk "all items" grid.
interface RateRow {
  itemId: string;
  code: string;
  name: string;
  rate: string; // current input value
  original: string; // value loaded from the server (to detect changes)
  existingId: string | null; // active rate row id, if the supplier already has one
}

const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : '');

export const SupplierWiseItemRates = () => {
  const [mode, setMode] = useState<Mode>('list');
  const [items, setItems] = useState<SupplierRateRow[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [itemsList, setItemsList] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty);

  // Bulk create state.
  const [bulkSupplierId, setBulkSupplierId] = useState('');
  const [bulkValidFrom, setBulkValidFrom] = useState('');
  const [bulkValidTo, setBulkValidTo] = useState('');
  const [rows, setRows] = useState<RateRow[]>([]);
  const [rowSearch, setRowSearch] = useState('');
  const [loadingRows, setLoadingRows] = useState(false);

  useEffect(() => {
    Promise.all([suppliersApi.list({ pageSize: 200 }), itemsApi.list({ pageSize: 500 })])
      .then(([s, i]) => { setSuppliers(s.items); setItemsList(i.items); })
      .catch(() => undefined);
  }, []);

  const reload = async () => {
    setLoading(true); setError(null);
    try {
      const res = await supplierRatesApi.list({ pageSize: 200 });
      setItems(res.items);
    } catch (err) { setError(describeError(err, 'Failed to load rates')); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (mode === 'list') void reload(); }, [mode]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((r) =>
      r.supplier?.name.toLowerCase().includes(q) ||
      r.supplier?.code.toLowerCase().includes(q) ||
      r.item?.name.toLowerCase().includes(q) ||
      r.item?.code.toLowerCase().includes(q),
    );
  }, [items, search]);

  const visibleRows = useMemo(() => {
    const q = rowSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q));
  }, [rows, rowSearch]);

  const enteredCount = useMemo(() => rows.filter((r) => r.rate.trim() !== '').length, [rows]);

  const openCreate = () => {
    setBulkSupplierId(''); setBulkValidFrom(''); setBulkValidTo(''); setRows([]); setRowSearch('');
    setError(null); setMode('create');
  };

  // Load the supplier's existing rates and pre-fill an input row for every item.
  const onSelectSupplier = async (supplierId: string) => {
    setBulkSupplierId(supplierId);
    if (!supplierId) { setRows([]); return; }
    setLoadingRows(true); setError(null);
    try {
      const res = await supplierRatesApi.list({ supplierId, pageSize: 500 });
      const activeByItem = new Map<string, SupplierRateRow>();
      for (const r of res.items) {
        if (r.isActive && !activeByItem.has(r.itemId)) activeByItem.set(r.itemId, r);
      }
      setRows(itemsList.map((it) => {
        const existing = activeByItem.get(it.id);
        const rate = existing ? String(existing.rate) : '';
        return { itemId: it.id, code: it.code, name: it.name, rate, original: rate, existingId: existing?.id ?? null };
      }));
    } catch (err) {
      setError(describeError(err, 'Failed to load existing rates'));
      setRows([]);
    } finally { setLoadingRows(false); }
  };

  const setRowRate = (itemId: string, value: string) => {
    setRows((prev) => prev.map((r) => (r.itemId === itemId ? { ...r, rate: value } : r)));
  };

  const handleBulkSave = async () => {
    if (!bulkSupplierId) { setError('Please select a supplier first.'); return; }
    const changed = rows.filter((r) => r.rate.trim() !== '' && r.rate.trim() !== r.original.trim());
    if (changed.length === 0) { setError('Enter a rate for at least one item.'); return; }
    for (const r of changed) {
      const n = Number(r.rate);
      if (!Number.isFinite(n) || n < 0) { setError(`Invalid rate for ${r.code} — ${r.name}.`); return; }
    }
    const validFrom = bulkValidFrom ? new Date(bulkValidFrom).toISOString() : undefined;
    const validTo = bulkValidTo ? new Date(bulkValidTo).toISOString() : undefined;
    setSaving(true); setError(null);
    try {
      const results = await Promise.allSettled(changed.map((r) => {
        const rate = Number(r.rate);
        if (r.existingId) {
          return supplierRatesApi.update(r.existingId, {
            rate,
            ...(validFrom !== undefined ? { validFrom } : {}),
            ...(validTo !== undefined ? { validTo } : {}),
          });
        }
        return supplierRatesApi.create({ supplierId: bulkSupplierId, itemId: r.itemId, rate, validFrom, validTo });
      }));
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed > 0) { setError(`Saved ${changed.length - failed} of ${changed.length}. ${failed} failed.`); }
      else { setMode('list'); }
    } catch (err) { setError(describeError(err, 'Save failed')); }
    finally { setSaving(false); }
  };

  const openEdit = (r: SupplierRateRow) => {
    setForm({
      supplierId: r.supplierId, itemId: r.itemId, rate: String(r.rate),
      validFrom: toDateInput(r.validFrom), validTo: toDateInput(r.validTo), isActive: r.isActive,
    });
    setEditingId(r.id); setError(null); setMode('edit');
  };

  const handleUpdate = async () => {
    if (!form.rate) { setError('Rate is required.'); return; }
    const rateNum = Number(form.rate);
    if (!Number.isFinite(rateNum) || rateNum < 0) { setError('Rate must be a non-negative number.'); return; }
    if (!editingId) return;
    setSaving(true); setError(null);
    try {
      await supplierRatesApi.update(editingId, {
        rate: rateNum,
        validFrom: form.validFrom ? new Date(form.validFrom).toISOString() : null,
        validTo: form.validTo ? new Date(form.validTo).toISOString() : null,
        isActive: form.isActive,
      });
      setMode('list');
    } catch (err) { setError(describeError(err, 'Save failed')); }
    finally { setSaving(false); }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Deactivate this rate?')) return;
    try { await supplierRatesApi.deactivate(id); await reload(); }
    catch (err) { setError(describeError(err, 'Deactivate failed')); }
  };

  const supplierOptions = suppliers.map((s) => ({ label: `${s.code} — ${s.name}`, value: s.id }));

  if (mode === 'list') {
    return (
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Supplier-wise Item Rates</h1>
            <p className="text-sm text-gray-500 mt-1">Negotiated purchase rates per supplier per item with validity windows.</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
            <Plus className="w-4 h-4" /> Add Rates
          </button>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>}
        <div className="bg-white rounded-lg border border-gray-300 mb-4 p-4 relative">
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by supplier or item…" className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-300">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
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
                    <div className="font-medium text-gray-900">{r.supplier?.name ?? r.supplierId}</div>
                    <div className="text-xs text-gray-500">{r.supplier?.code}</div>
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

  // Single-row edit (from the list).
  if (mode === 'edit') {
    return (
      <div className="p-6">
        <button onClick={() => setMode('list')} className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to List
        </button>
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Edit Supplier Rate</h1>
        </div>
        {error && <div className="max-w-2xl mx-auto mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>}
        <div className="max-w-2xl mx-auto bg-white rounded-lg border border-gray-300 p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
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
            <button onClick={handleUpdate} disabled={saving} className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2 font-medium">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Update
            </button>
            <button onClick={() => setMode('list')} className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  // Bulk create — set rates for many items of one supplier in a single screen.
  return (
    <div className="p-6">
      <button onClick={() => setMode('list')} className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to List
      </button>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Add Supplier Rates</h1>
        <p className="text-sm text-gray-500 mt-1">Pick a supplier, then set rates for any number of items at once.</p>
      </div>
      {error && <div className="max-w-4xl mx-auto mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>}
      <div className="max-w-4xl mx-auto bg-white rounded-lg border border-gray-300 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
            <SearchableDropdown options={supplierOptions} value={bulkSupplierId} onValueChange={onSelectSupplier} placeholder="Select supplier" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valid From</label>
            <input type="date" value={bulkValidFrom} onChange={(e) => setBulkValidFrom(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valid To</label>
            <input type="date" value={bulkValidTo} onChange={(e) => setBulkValidTo(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {!bulkSupplierId && <div className="text-center py-12 text-gray-500">Select a supplier to load items.</div>}
        {bulkSupplierId && loadingRows && <div className="text-center py-12 text-gray-500 flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading items…</div>}

        {bulkSupplierId && !loadingRows && (
          <>
            <div className="flex items-center justify-between mb-3 gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" value={rowSearch} onChange={(e) => setRowSearch(e.target.value)} placeholder="Filter items…" className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <span className="text-sm text-gray-500">{enteredCount} item{enteredCount === 1 ? '' : 's'} with a rate</span>
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[28rem] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-300 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-48">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visibleRows.map((r) => (
                    <tr key={r.itemId} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm">
                        <div className="font-medium text-gray-900">{r.name}</div>
                        <div className="text-xs text-gray-500">{r.code}{r.existingId ? ' · existing rate' : ''}</div>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number" step="0.01" min={0} value={r.rate}
                          onChange={(e) => setRowRate(r.itemId, e.target.value)}
                          placeholder="—"
                          className="w-40 px-3 py-1.5 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visibleRows.length === 0 && <div className="text-center py-8 text-gray-500">No items match.</div>}
            </div>
          </>
        )}

        <div className="flex gap-4 mt-6">
          <button onClick={handleBulkSave} disabled={saving || !bulkSupplierId} className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2 font-medium">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Rates
          </button>
          <button onClick={() => setMode('list')} className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default SupplierWiseItemRates;
