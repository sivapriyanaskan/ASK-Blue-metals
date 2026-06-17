import { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2, Save, ArrowLeft, Loader2, X } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';
import {
  usersApi,
  rolesApi,
  type UserRow,
  type UserCreateInput,
  type RoleRow,
} from '../services/iamApi';
import { describeError } from '../services/mastersApi';

type Mode = 'list' | 'create' | 'edit';

interface FormState {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED';
  roleCodes: string[];
}

const empty: FormState = {
  firstName: '',
  lastName: '',
  username: '',
  email: '',
  password: '',
  status: 'ACTIVE',
  roleCodes: [],
};

export const UserManagement = () => {
  const [mode, setMode] = useState<Mode>('list');
  const [items, setItems] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty);

  useEffect(() => {
    rolesApi.list().then((r) => setRoles(r.items)).catch(() => undefined);
  }, []);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await usersApi.list({ pageSize: 200, search: searchTerm || undefined });
      setItems(res.items);
    } catch (err) {
      setError(describeError(err, 'Failed to load users'));
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
      const u = await usersApi.get(id);
      setForm({
        firstName: u.firstName,
        lastName: u.lastName,
        username: u.username,
        email: u.email,
        password: '',
        status: u.status,
        roleCodes: u.roles,
      });
      setEditingId(id);
      setMode('edit');
    } catch (err) {
      setError(describeError(err, 'Failed to load user'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || form.roleCodes.length === 0) {
      setError('First name, last name, email, and at least one role are required.');
      return;
    }
    if (mode === 'create' && (!form.username.trim() || !form.password.trim())) {
      setError('Username and password are required.');
      return;
    }
    if (mode === 'create' && form.password.length < 12) {
      setError('Password must be at least 12 characters.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await usersApi.update(editingId, {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          status: form.status,
          roleCodes: form.roleCodes,
        });
      } else {
        const payload: UserCreateInput = {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
          status: form.status === 'LOCKED' ? 'ACTIVE' : form.status,
          roleCodes: form.roleCodes,
        };
        await usersApi.create(payload);
      }
      setMode('list');
      await reload();
    } catch (err) {
      setError(describeError(err, 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Deactivate this user? They will not be able to log in.')) return;
    try {
      await usersApi.deactivate(id);
      await reload();
    } catch (err) {
      setError(describeError(err, 'Deactivate failed'));
    }
  };

  const toggleRole = (code: string) => {
    setForm((f) =>
      f.roleCodes.includes(code)
        ? { ...f, roleCodes: f.roleCodes.filter((c) => c !== code) }
        : { ...f, roleCodes: [...f.roleCodes, code] }
    );
  };

  if (mode === 'list') {
    return (
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
            <Plus className="w-4 h-4" /> Add User
          </button>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>}
        <div className="bg-white rounded-lg border border-gray-300 mb-4 p-4 relative">
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by username, name, email…"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-300">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roles</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{u.username}</td>
                  <td className="px-6 py-4 text-gray-900">{u.firstName} {u.lastName}</td>
                  <td className="px-6 py-4 text-gray-600 text-sm">{u.email}</td>
                  <td className="px-6 py-4 text-gray-600 text-sm">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <span key={r} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">{r}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      u.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                      u.status === 'LOCKED' ? 'bg-amber-100 text-amber-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-xs">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(u.id)} className="text-green-600 hover:text-green-900" title="Edit"><Edit className="w-4 h-4" /></button>
                      {u.status !== 'INACTIVE' && (
                        <button onClick={() => handleDeactivate(u.id)} className="text-red-600 hover:text-red-900" title="Deactivate"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div className="text-center py-8 text-gray-500 flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>}
          {!loading && items.length === 0 && <div className="text-center py-12 text-gray-500">No users found</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <button onClick={() => setMode('list')} className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to User List
      </button>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">{mode === 'create' ? 'Create User' : 'Edit User'}</h1>
      </div>
      {error && <div className="max-w-3xl mx-auto mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>}
      {loading && <div className="max-w-3xl mx-auto mb-4 p-3 bg-gray-50 border border-gray-300 text-gray-700 rounded flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>}

      <div className="max-w-3xl mx-auto bg-white rounded-lg border border-gray-300 p-6">
        <h3 className="font-semibold mb-4 pb-2 border-b border-gray-300">User Details</h3>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
            <input type="text" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
            <input type="text" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username {mode === 'create' && '*'}</label>
            <input type="text" value={form.username} disabled={mode === 'edit'} onChange={(e) => setForm({ ...form, username: e.target.value })} className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${mode === 'edit' ? 'bg-gray-50' : ''}`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          {mode === 'create' && (
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Password * (min 12 chars)</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
            <SearchableDropdown
              options={
                mode === 'create'
                  ? [{ label: 'Active', value: 'ACTIVE' }, { label: 'Inactive', value: 'INACTIVE' }]
                  : [{ label: 'Active', value: 'ACTIVE' }, { label: 'Inactive', value: 'INACTIVE' }, { label: 'Locked', value: 'LOCKED' }]
              }
              value={form.status}
              onValueChange={(v) => setForm({ ...form, status: v as FormState['status'] })}
              placeholder="Select"
            />
          </div>
        </div>

        <h3 className="font-semibold mb-4 pb-2 border-b border-gray-300">Roles *</h3>
        <div className="grid grid-cols-2 gap-2 mb-6">
          {roles.map((r) => (
            <label key={r.code} className="flex items-start gap-2 p-3 border border-gray-300 rounded hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={form.roleCodes.includes(r.code)}
                onChange={() => toggleRole(r.code)}
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{r.name}</div>
                <div className="text-xs text-gray-500 truncate">{r.description ?? r.code}</div>
              </div>
            </label>
          ))}
        </div>

        <div className="flex gap-4">
          <button onClick={handleSave} disabled={saving || loading} className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2 font-medium">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {mode === 'create' ? 'Save User' : 'Update User'}
          </button>
          <button onClick={() => setMode('list')} className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
        </div>
      </div>
    </div>
  );
};
