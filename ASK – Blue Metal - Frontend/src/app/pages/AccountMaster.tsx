import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Save, X, Eye, Search, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { SearchableDropdown, type SearchableDropdownOption } from '../components/ui/searchable-dropdown';
import {
  accountsApi,
  describeError,
  type AccountRow,
  type AccountInput,
} from '../services/mastersApi';

type Mode = 'list' | 'create' | 'edit' | 'view';
type AccountType = AccountInput['type'];

interface FormState {
  code: string;
  name: string;
  type: AccountType;
  parentId: string;
  isActive: boolean;
}

const emptyForm: FormState = { code: '', name: '', type: 'ASSET', parentId: '', isActive: true };

const TYPE_OPTIONS: SearchableDropdownOption[] = [
  { label: 'Asset', value: 'ASSET' },
  { label: 'Liability', value: 'LIABILITY' },
  { label: 'Income', value: 'INCOME' },
  { label: 'Expense', value: 'EXPENSE' },
  { label: 'Equity', value: 'EQUITY' },
];

const TYPE_LABEL: Record<AccountType, string> = {
  ASSET: 'Asset',
  LIABILITY: 'Liability',
  INCOME: 'Income',
  EXPENSE: 'Expense',
  EQUITY: 'Equity',
};

export const AccountMaster = () => {
  const [items, setItems] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<Mode>('list');
  const [editingItem, setEditingItem] = useState<AccountRow | null>(null);
  const [viewingItem, setViewingItem] = useState<AccountRow | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const reload = async (search?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await accountsApi.list({ pageSize: 200, search: search || undefined });
      setItems(res.items);
    } catch (err) {
      setError(describeError(err, 'Failed to load accounts'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => void reload(searchTerm), 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const parentOptions: SearchableDropdownOption[] = [
    { label: '— None —', value: '' },
    ...items
      .filter((i) => i.isActive && (!editingItem || i.id !== editingItem.id))
      .map((i) => ({ label: `${i.code} — ${i.name} (${TYPE_LABEL[i.type]})`, value: i.id })),
  ];

  const parentName = (id?: string | null) => {
    if (!id) return '-';
    const a = items.find((x) => x.id === id);
    return a ? `${a.code} — ${a.name}` : id;
  };

  const handleCreate = () => {
    setMode('create');
    setFormData(emptyForm);
    setError(null);
  };

  const handleEdit = (item: AccountRow) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      type: item.type,
      parentId: item.parentId ?? '',
      isActive: item.isActive,
    });
    setMode('edit');
    setError(null);
  };

  const handleView = (item: AccountRow) => {
    setViewingItem(item);
    setMode('view');
  };

  const handleSave = async () => {
    if (!formData.code.trim() || !formData.name.trim() || !formData.type) {
      setError('Code, name and type are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: AccountInput = {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        type: formData.type,
        parentId: formData.parentId || undefined,
        isActive: formData.isActive,
      };
      if (mode === 'create') {
        await accountsApi.create(payload);
      } else if (mode === 'edit' && editingItem) {
        await accountsApi.update(editingItem.id, payload);
      }
      setMode('list');
      setEditingItem(null);
      await reload(searchTerm);
    } catch (err) {
      setError(describeError(err, 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this account?')) return;
    setError(null);
    try {
      await accountsApi.deactivate(id);
      await reload(searchTerm);
    } catch (err) {
      setError(describeError(err, 'Deactivate failed'));
    }
  };

  const handleCancel = () => {
    setMode('list');
    setEditingItem(null);
    setViewingItem(null);
    setError(null);
  };

  const filteredItems = items.filter((i) => typeFilter === 'all' || i.type === typeFilter);

  if (mode === 'view' && viewingItem) {
    return (
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Account Details</h1>
          <button onClick={handleCancel} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <X className="w-4 h-4" /> Close
          </button>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-6 max-w-4xl mx-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
              <input type="text" value={viewingItem.code} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <input type="text" value={TYPE_LABEL[viewingItem.type]} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input type="text" value={viewingItem.name} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent</label>
              <input type="text" value={parentName(viewingItem.parentId)} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <input type="text" value={viewingItem.isActive ? 'Active' : 'Inactive'} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{mode === 'create' ? 'Create Account' : 'Edit Account'}</h1>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-6 max-w-4xl mx-auto">
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code <span className="text-red-500">*</span></label>
              <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="e.g., 1100" className="w-full px-3 py-2 border border-gray-300 rounded-lg uppercase" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={formData.isActive ? 'true' : 'false'} onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Cash in Hand" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type <span className="text-red-500">*</span></label>
              <SearchableDropdown options={TYPE_OPTIONS} value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as AccountType })} placeholder="Select type" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Account</label>
              <SearchableDropdown options={parentOptions} value={formData.parentId} onValueChange={(v) => setFormData({ ...formData, parentId: v })} placeholder="(top-level)" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {mode === 'create' ? 'Create' : 'Update'}
            </button>
            <button onClick={handleCancel} disabled={saving} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Account Master</h1>
        <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Account
        </button>
      </div>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>}

      <div className="bg-white rounded-lg border border-gray-300 p-4 mb-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by code or name..." className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <SearchableDropdown options={[{ label: 'All Types', value: 'all' }, ...TYPE_OPTIONS]} value={typeFilter} onValueChange={setTypeFilter} placeholder="All types" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-300">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parent</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredItems.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{item.code}</td>
                <td className="px-6 py-4 text-gray-900">{item.name}</td>
                <td className="px-6 py-4 text-gray-700">{TYPE_LABEL[item.type]}</td>
                <td className="px-6 py-4 text-gray-600 text-sm">{parentName(item.parentId)}</td>
                <td className="px-6 py-4">
                  {item.isActive ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded"><CheckCircle className="w-3 h-3" /> Active</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded"><XCircle className="w-3 h-3" /> Inactive</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => handleView(item)} className="text-blue-600 hover:text-blue-900" title="View"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => handleEdit(item)} className="text-green-600 hover:text-green-900" title="Edit"><Edit className="w-4 h-4" /></button>
                    {item.isActive && (
                      <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900" title="Deactivate"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <div className="text-center py-8 text-gray-500 flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>}
        {!loading && filteredItems.length === 0 && <div className="text-center py-12 text-gray-500">No accounts found</div>}
      </div>
    </div>
  );
};
