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

export const FreezeItemToCustomer = () => {
  const [mode, setMode] = useState<Mode>('list');
  const [items, setItems] = useState<CustomerFreezeRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [itemsList, setItemsList] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Create state.
  const [customerId, setCustomerId] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [reason, setReason] = useState('');
  const [freezeAll, setFreezeAll] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rowSearch, setRowSearch] = useState('');

  useEffect(() => {
    Promise.all([customersApi.list({ pageSize: 200 }), itemsApi.list({ pageSize: 500 })])
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

  const visibleItems = useMemo(() => {
    const q = rowSearch.trim().toLowerCase();
    if (!q) return itemsList;
    return itemsList.filter((i) => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q));
  }, [itemsList, rowSearch]);

  const openCreate = () => {
    setCustomerId(''); setValidFrom(''); setValidTo(''); setReason(''); setFreezeAll(false);
    setSelected(new Set()); setRowSearch(''); setError(null); setMode('create');
  };

  const toggleItem = (itemId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = visibleItems.every((i) => next.has(i.id));
      for (const i of visibleItems) { if (allSelected) next.delete(i.id); else next.add(i.id); }
      return next;
    });
  };

  const handleSave = async () => {
    if (!customerId || !validFrom || !validTo) { setError('Customer, valid from and valid to are required.'); return; }
    if (new Date(validFrom) > new Date(validTo)) { setError('Valid From must be on or before Valid To.'); return; }
    if (!freezeAll && selected.size === 0) { setError('Select at least one item, or choose "Freeze entire customer".'); return; }
    setSaving(true); setError(null);
    const base = {
      customerId,
      validFrom: new Date(validFrom).toISOString(),
      validTo: new Date(validTo).toISOString(),
      reason: reason.trim() || undefined,
    };
    try {
      if (freezeAll) {
        await customerFreezesApi.create({ ...base, itemId: null });
        setMode('list');
      } else {
        const itemIds = Array.from(selected);
        const results = await Promise.allSettled(itemIds.map((itemId) => customerFreezesApi.create({ ...base, itemId })));
        const failed = results.filter((r) => r.status === 'rejected').length;
        if (failed > 0) { setError(`Saved ${itemIds.length - failed} of ${itemIds.length}. ${failed} failed.`); }
        else { setMode('list'); }
      }
    } catch (err) { setError(describeError(err, 'Save failed')); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this freeze?')) return;
    try { await customerFreezesApi.remove(id); await reload(); }
    catch (err) { setError(describeError(err, 'Delete failed')); }
  };

  const customerOptions = customers.map((c) => ({ label: `${c.code} — ${c.name}`, value: c.id }));

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

  // Bulk create — freeze many items for one customer in a single screen.
  const allVisibleSelected = visibleItems.length > 0 && visibleItems.every((i) => selected.has(i.id));

  return (
    <div className="p-6">
      <button onClick={() => setMode('list')} className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to List
      </button>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Add Freeze</h1>
        <p className="text-sm text-gray-500 mt-1">Pick a customer and date range, then select any number of items to freeze at once.</p>
      </div>
      {error && <div className="max-w-4xl mx-auto mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>}
      <div className="max-w-4xl mx-auto bg-white rounded-lg border border-gray-300 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
            <SearchableDropdown options={customerOptions} value={customerId} onValueChange={setCustomerId} placeholder="Select customer" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valid From *</label>
            <input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valid To *</label>
            <input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>

        <label className="flex items-center gap-2 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <input type="checkbox" checked={freezeAll} onChange={(e) => setFreezeAll(e.target.checked)} />
          <span className="text-sm text-amber-900 inline-flex items-center gap-1"><Snowflake className="w-4 h-4" /> Freeze entire customer (block every item)</span>
        </label>

        {!freezeAll && (
          <>
            <div className="flex items-center justify-between mb-3 gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" value={rowSearch} onChange={(e) => setRowSearch(e.target.value)} placeholder="Filter items…" className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <span className="text-sm text-gray-500">{selected.size} item{selected.size === 1 ? '' : 's'} selected</span>
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[28rem] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-300 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left w-12">
                      <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} title="Select all" />
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visibleItems.map((it) => (
                    <tr key={it.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleItem(it.id)}>
                      <td className="px-4 py-2">
                        <input type="checkbox" checked={selected.has(it.id)} onChange={() => toggleItem(it.id)} onClick={(e) => e.stopPropagation()} />
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <div className="font-medium text-gray-900">{it.name}</div>
                        <div className="text-xs text-gray-500">{it.code}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visibleItems.length === 0 && <div className="text-center py-8 text-gray-500">No items match.</div>}
            </div>
          </>
        )}

        <div className="flex gap-4 mt-6">
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
