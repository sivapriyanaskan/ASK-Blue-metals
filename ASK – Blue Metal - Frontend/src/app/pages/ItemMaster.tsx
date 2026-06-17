import { useEffect, useState } from 'react';
import { Plus, Search, Eye, Edit, Trash2, Save, ArrowLeft, Loader2 } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';
import {
  itemsApi,
  itemGroupsApi,
  itemSubGroupsApi,
  unitsApi,
  describeError,
  type ItemRow,
  type ItemInput,
  type ItemGroupRow,
  type ItemSubGroupRow,
  type UnitRow,
} from '../services/mastersApi';

type Mode = 'list' | 'create' | 'edit' | 'view';

interface FormState {
  code: string;
  name: string;
  groupId: string;
  subGroupId: string;
  purchaseUnitId: string;
  sellingUnitId: string;
  hsnCode: string;
  isRawMaterial: boolean;
  isSaleMaterial: boolean;
  sellingPrice: string;
  gstPercent: string;
  isActive: boolean;
}

const empty: FormState = {
  code: '',
  name: '',
  groupId: '',
  subGroupId: '',
  purchaseUnitId: '',
  sellingUnitId: '',
  hsnCode: '',
  isRawMaterial: false,
  isSaleMaterial: true,
  sellingPrice: '0',
  gstPercent: '0',
  isActive: true,
};

export const ItemMaster = () => {
  const [mode, setMode] = useState<Mode>('list');
  const [items, setItems] = useState<ItemRow[]>([]);
  const [groups, setGroups] = useState<ItemGroupRow[]>([]);
  const [subGroups, setSubGroups] = useState<ItemSubGroupRow[]>([]);
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [viewing, setViewing] = useState<ItemRow | null>(null);

  useEffect(() => {
    Promise.all([
      itemGroupsApi.list({ pageSize: 200, isActive: true }).then((r) => setGroups(r.items)),
      itemSubGroupsApi.list({ pageSize: 200, isActive: true }).then((r) => setSubGroups(r.items)),
      unitsApi.list({ pageSize: 200, isActive: true }).then((r) => setUnits(r.items)),
    ]).catch(() => undefined);
  }, []);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await itemsApi.list({ pageSize: 200, search: searchTerm || undefined });
      setItems(res.items);
    } catch (err) {
      setError(describeError(err, 'Failed to load items'));
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
      const it = await itemsApi.get(id);
      setForm({
        code: it.code,
        name: it.name,
        groupId: it.groupId,
        subGroupId: it.subGroupId,
        purchaseUnitId: it.purchaseUnitId,
        sellingUnitId: it.sellingUnitId,
        hsnCode: it.hsnCode ?? '',
        isRawMaterial: it.isRawMaterial,
        isSaleMaterial: it.isSaleMaterial,
        sellingPrice: it.sellingPrice ?? '0',
        gstPercent: it.gstPercent ?? '0',
        isActive: it.isActive,
      });
      setEditingId(id);
      setMode('edit');
    } catch (err) {
      setError(describeError(err, 'Failed to load item'));
    } finally {
      setLoading(false);
    }
  };

  const openView = async (id: string) => {
    setError(null);
    setLoading(true);
    try {
      const it = await itemsApi.get(id);
      setViewing(it);
      setMode('view');
    } catch (err) {
      setError(describeError(err, 'Failed to load item'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim() || !form.groupId || !form.subGroupId || !form.purchaseUnitId || !form.sellingUnitId) {
      setError('Code, name, group, sub-group, purchase unit and selling unit are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: ItemInput = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        groupId: form.groupId,
        subGroupId: form.subGroupId,
        purchaseUnitId: form.purchaseUnitId,
        sellingUnitId: form.sellingUnitId,
        hsnCode: form.hsnCode.trim() || null,
        isRawMaterial: form.isRawMaterial,
        isSaleMaterial: form.isSaleMaterial,
        sellingPrice: Number(form.sellingPrice) || 0,
        gstPercent: Number(form.gstPercent) || 0,
        isActive: form.isActive,
      };
      if (editingId) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { code, ...patch } = payload;
        await itemsApi.update(editingId, patch);
      } else {
        await itemsApi.create(payload);
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
    if (!confirm('Deactivate this item?')) return;
    try {
      await itemsApi.deactivate(id);
      await reload();
    } catch (err) {
      setError(describeError(err, 'Deactivate failed'));
    }
  };

  const groupOptions = [{ label: 'Select group', value: '' }, ...groups.map((g) => ({ label: `${g.code} - ${g.name}`, value: g.id }))];
  const filteredSubGroups = form.groupId ? subGroups.filter((s) => s.groupId === form.groupId) : subGroups;
  const subGroupOptions = [{ label: 'Select sub-group', value: '' }, ...filteredSubGroups.map((s) => ({ label: `${s.code} - ${s.name}`, value: s.id }))];
  const unitOptions = [{ label: 'Select unit', value: '' }, ...units.map((u) => ({ label: `${u.code} - ${u.name}`, value: u.id }))];

  if (mode === 'list') {
    return (
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Item Master</h1>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>}
        <div className="bg-white rounded-lg border border-gray-300 mb-4 p-4 relative">
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by code, name, HSN…"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-300">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Group</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sub-Group</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">HSN</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Selling Price</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">GST %</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((it) => (
                <tr key={it.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{it.code}</td>
                  <td className="px-4 py-3 text-gray-900">{it.name}</td>
                  <td className="px-4 py-3 text-gray-600 text-sm">{it.group?.name ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-600 text-sm">{it.subGroup?.name ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{it.hsnCode ?? '-'}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{it.sellingPrice}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{it.gstPercent}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${it.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {it.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openView(it.id)} className="text-blue-600 hover:text-blue-900" title="View"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => openEdit(it.id)} className="text-green-600 hover:text-green-900" title="Edit"><Edit className="w-4 h-4" /></button>
                      {it.isActive && <button onClick={() => handleDelete(it.id)} className="text-red-600 hover:text-red-900" title="Deactivate"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div className="text-center py-8 text-gray-500 flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>}
          {!loading && items.length === 0 && <div className="text-center py-12 text-gray-500">No items found</div>}
        </div>
      </div>
    );
  }

  if (mode === 'view' && viewing) {
    return (
      <div className="p-6">
        <button onClick={() => setMode('list')} className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Item List
        </button>
        <div className="max-w-4xl mx-auto bg-white rounded-lg border border-gray-300 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Item Details</h1>
          <div className="grid grid-cols-2 gap-4">
            <Disp label="Code" value={viewing.code} />
            <Disp label="Name" value={viewing.name} />
            <Disp label="Group" value={viewing.group?.name ?? '-'} />
            <Disp label="Sub-Group" value={viewing.subGroup?.name ?? '-'} />
            <Disp label="Purchase Unit" value={viewing.purchaseUnit?.name ?? '-'} />
            <Disp label="Selling Unit" value={viewing.sellingUnit?.name ?? '-'} />
            <Disp label="HSN Code" value={viewing.hsnCode ?? '-'} />
            <Disp label="Selling Price" value={viewing.sellingPrice} />
            <Disp label="GST %" value={viewing.gstPercent} />
            <Disp label="Raw Material" value={viewing.isRawMaterial ? 'Yes' : 'No'} />
            <Disp label="Sale Material" value={viewing.isSaleMaterial ? 'Yes' : 'No'} />
            <Disp label="Status" value={viewing.isActive ? 'Active' : 'Inactive'} />
          </div>
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
        <ArrowLeft className="w-4 h-4" /> Back to Item List
      </button>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">{mode === 'create' ? 'Create Item' : 'Edit Item'}</h1>
      </div>
      {error && <div className="max-w-4xl mx-auto mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>}
      {loading && <div className="max-w-4xl mx-auto mb-4 p-3 bg-gray-50 border border-gray-300 text-gray-700 rounded flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>}

      <div className="max-w-4xl mx-auto bg-white rounded-lg border border-gray-300 p-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Inp label="Code *" value={form.code} onChange={(v) => setForm({ ...form, code: v.toUpperCase() })} disabled={mode === 'edit'} />
          <Inp label="Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Group *</label>
            <SearchableDropdown options={groupOptions} value={form.groupId} onValueChange={(v) => setForm({ ...form, groupId: v, subGroupId: '' })} placeholder="Select group" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sub-Group *</label>
            <SearchableDropdown options={subGroupOptions} value={form.subGroupId} onValueChange={(v) => setForm({ ...form, subGroupId: v })} placeholder="Select sub-group" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Unit *</label>
            <SearchableDropdown options={unitOptions} value={form.purchaseUnitId} onValueChange={(v) => setForm({ ...form, purchaseUnitId: v })} placeholder="Select unit" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Selling Unit *</label>
            <SearchableDropdown options={unitOptions} value={form.sellingUnitId} onValueChange={(v) => setForm({ ...form, sellingUnitId: v })} placeholder="Select unit" />
          </div>
          <Inp label="HSN Code" value={form.hsnCode} onChange={(v) => setForm({ ...form, hsnCode: v })} mono />
          <Inp label="Selling Price" value={form.sellingPrice} onChange={(v) => setForm({ ...form, sellingPrice: v })} type="number" />
          <Inp label="GST %" value={form.gstPercent} onChange={(v) => setForm({ ...form, gstPercent: v })} type="number" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Raw Material</label>
            <SearchableDropdown
              options={[{ label: 'No', value: 'false' }, { label: 'Yes', value: 'true' }]}
              value={form.isRawMaterial ? 'true' : 'false'}
              onValueChange={(v) => setForm({ ...form, isRawMaterial: v === 'true' })}
              placeholder="Select"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sale Material</label>
            <SearchableDropdown
              options={[{ label: 'No', value: 'false' }, { label: 'Yes', value: 'true' }]}
              value={form.isSaleMaterial ? 'true' : 'false'}
              onValueChange={(v) => setForm({ ...form, isSaleMaterial: v === 'true' })}
              placeholder="Select"
            />
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

        <div className="flex gap-4">
          <button onClick={handleSave} disabled={saving || loading} className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2 font-medium">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {mode === 'create' ? 'Save Item' : 'Update Item'}
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
