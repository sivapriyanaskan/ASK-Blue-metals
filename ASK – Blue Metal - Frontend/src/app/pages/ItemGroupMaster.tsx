import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Save, X, Eye, Search, Loader2 } from 'lucide-react';
import {
  itemGroupsApi,
  describeError,
  type ItemGroupRow,
  type ItemGroupInput,
} from '../services/mastersApi';

type Mode = 'list' | 'create' | 'edit' | 'view';

interface FormState {
  code: string;
  name: string;
  isActive: boolean;
}

const emptyForm: FormState = { code: '', name: '', isActive: true };

export const ItemGroupMaster = () => {
  const [items, setItems] = useState<ItemGroupRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<Mode>('list');
  const [editingItem, setEditingItem] = useState<ItemGroupRow | null>(null);
  const [viewingItem, setViewingItem] = useState<ItemGroupRow | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const reload = async (search?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await itemGroupsApi.list({ pageSize: 200, search: search || undefined });
      setItems(res.items);
    } catch (err) {
      setError(describeError(err, 'Failed to load item groups'));
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

  const handleCreate = () => {
    setMode('create');
    setFormData(emptyForm);
    setError(null);
  };

  const handleEdit = (item: ItemGroupRow) => {
    setEditingItem(item);
    setFormData({ code: item.code, name: item.name, isActive: item.isActive });
    setMode('edit');
    setError(null);
  };

  const handleView = (item: ItemGroupRow) => {
    setViewingItem(item);
    setMode('view');
  };

  const handleSave = async () => {
    if (!formData.code.trim() || !formData.name.trim()) {
      setError('Group code and name are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: ItemGroupInput = {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        isActive: formData.isActive,
      };
      if (mode === 'create') {
        await itemGroupsApi.create(payload);
      } else if (mode === 'edit' && editingItem) {
        await itemGroupsApi.update(editingItem.id, payload);
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

  const handleCancel = () => {
    setMode('list');
    setEditingItem(null);
    setViewingItem(null);
    setError(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this item group?')) return;
    setError(null);
    try {
      await itemGroupsApi.deactivate(id);
      await reload(searchTerm);
    } catch (err) {
      setError(describeError(err, 'Deactivate failed'));
    }
  };

  if (mode === 'view' && viewingItem) {
    return (
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Item Group Details</h1>
          <button
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Close
          </button>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-6 max-w-4xl mx-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Group Code</label>
              <input type="text" value={viewingItem.code} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <input type="text" value={viewingItem.isActive ? 'Active' : 'Inactive'} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
              <input type="text" value={viewingItem.name} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
              <input type="text" value={new Date(viewingItem.createdAt).toLocaleString('en-IN')} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Updated</label>
              <input type="text" value={new Date(viewingItem.updatedAt).toLocaleString('en-IN')} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" />
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
          <h1 className="text-2xl font-bold text-gray-900">
            {mode === 'create' ? 'Create Item Group' : 'Edit Item Group'}
          </h1>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-6 max-w-4xl mx-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Group Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g., BM"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.isActive ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Group Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Blue Metal"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {mode === 'create' ? 'Create' : 'Update'}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Item Group Master</h1>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Item Group
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-300 p-4 mb-6">
        <div className="grid grid-cols-4 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by code or name..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-300">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{item.code}</td>
                <td className="px-6 py-4 text-gray-900">{item.name}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${item.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {item.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => handleView(item)} className="text-blue-600 hover:text-blue-900" title="View">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleEdit(item)} className="text-green-600 hover:text-green-900" title="Edit">
                      <Edit className="w-4 h-4" />
                    </button>
                    {item.isActive && (
                      <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900" title="Deactivate">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && (
          <div className="text-center py-8 text-gray-500 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="text-center py-12 text-gray-500">No item groups found</div>
        )}
      </div>
    </div>
  );
};
