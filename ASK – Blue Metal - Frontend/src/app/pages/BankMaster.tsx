import { useEffect, useState } from 'react';
import { Landmark, Plus, Edit, Trash2, Eye, Search, Filter, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';
import {
  banksApi,
  describeError,
  type BankRow,
  type BankInput,
} from '../services/mastersApi';

type Mode = 'list' | 'create' | 'edit' | 'view';

interface FormState {
  code: string;
  name: string;
  accountNumber: string;
  branch: string;
  ifsc: string;
  isActive: boolean;
}

const emptyForm: FormState = {
  code: '',
  name: '',
  accountNumber: '',
  branch: '',
  ifsc: '',
  isActive: true,
};

const maskAccountNumber = (n?: string | null) => {
  if (!n) return '-';
  if (n.length <= 4) return n;
  return 'X'.repeat(n.length - 4) + n.slice(-4);
};

export const BankMaster = () => {
  const [banks, setBanks] = useState<BankRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<Mode>('list');
  const [editingBank, setEditingBank] = useState<BankRow | null>(null);
  const [viewingBank, setViewingBank] = useState<BankRow | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const reload = async (search?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await banksApi.list({ pageSize: 200, search: search || undefined });
      setBanks(res.items);
    } catch (err) {
      setError(describeError(err, 'Failed to load banks'));
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

  const handleAdd = () => {
    setFormData(emptyForm);
    setEditingBank(null);
    setMode('create');
    setError(null);
  };

  const handleEdit = (bank: BankRow) => {
    setFormData({
      code: bank.code,
      name: bank.name,
      accountNumber: bank.accountNumber ?? '',
      branch: bank.branch ?? '',
      ifsc: bank.ifsc ?? '',
      isActive: bank.isActive,
    });
    setEditingBank(bank);
    setMode('edit');
    setError(null);
  };

  const handleSave = async () => {
    if (!formData.code.trim() || !formData.name.trim()) {
      setError('Bank code and name are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: BankInput = {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        accountNumber: formData.accountNumber.trim() || undefined,
        branch: formData.branch.trim() || undefined,
        ifsc: formData.ifsc.trim().toUpperCase() || undefined,
        isActive: formData.isActive,
      };
      if (mode === 'create') {
        await banksApi.create(payload);
      } else if (mode === 'edit' && editingBank) {
        await banksApi.update(editingBank.id, payload);
      }
      setMode('list');
      setEditingBank(null);
      await reload(searchTerm);
    } catch (err) {
      setError(describeError(err, 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this bank?')) return;
    setError(null);
    try {
      await banksApi.deactivate(id);
      await reload(searchTerm);
    } catch (err) {
      setError(describeError(err, 'Deactivate failed'));
    }
  };

  const handleView = (bank: BankRow) => {
    setViewingBank(bank);
    setMode('view');
  };

  const filteredBanks = banks.filter((b) =>
    statusFilter === 'All' ? true : statusFilter === 'Active' ? b.isActive : !b.isActive,
  );

  if (mode === 'view' && viewingBank) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Bank Details</h1>
        </div>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Code</label>
                <input type="text" value={viewingBank.code} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                <input type="text" value={viewingBank.name} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                <input type="text" value={viewingBank.branch ?? ''} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Account Details</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                <input type="text" value={viewingBank.accountNumber ?? ''} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                <input type="text" value={viewingBank.ifsc ?? ''} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Status</h3>
            <div>
              {viewingBank.isActive ? (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-800 text-sm font-medium rounded">
                  <CheckCircle className="w-4 h-4" /> Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-800 text-sm font-medium rounded">
                  <XCircle className="w-4 h-4" /> Inactive
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => { setViewingBank(null); setMode('list'); }} className="px-6 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="p-6">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {mode === 'edit' ? 'Edit Bank' : 'Add Bank'}
          </h1>
        </div>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>
            )}
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., HDFC001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg uppercase"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., HDFC Bank"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                <input
                  type="text"
                  value={formData.branch}
                  onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                  placeholder="e.g., Ahmedabad Main Branch"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Account Details</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                <input
                  type="text"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  placeholder="e.g., 50100123456789"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={formData.ifsc}
                  onChange={(e) => setFormData({ ...formData, ifsc: e.target.value.toUpperCase() })}
                  placeholder="e.g., HDFC0001234"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg uppercase"
                />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Status</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status <span className="text-red-500">*</span>
                </label>
                <SearchableDropdown
                  options={[
                    { value: 'Active', label: 'Active' },
                    { value: 'Inactive', label: 'Inactive' },
                  ]}
                  value={formData.isActive ? 'Active' : 'Inactive'}
                  onValueChange={(value) => setFormData({ ...formData, isActive: value === 'Active' })}
                  placeholder="Select Status"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save
              </button>
              <button
                onClick={() => { setMode('list'); setEditingBank(null); setError(null); }}
                disabled={saving}
                className="px-6 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4 pb-3 border-b border-gray-300 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Bank Master</h1>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Bank
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-full"><Landmark className="w-6 h-6 text-blue-600" /></div>
            <div>
              <div className="text-sm text-gray-600">Total Banks</div>
              <div className="text-2xl font-bold text-gray-900">{banks.length}</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-full"><CheckCircle className="w-6 h-6 text-green-600" /></div>
            <div>
              <div className="text-sm text-gray-600">Active Banks</div>
              <div className="text-2xl font-bold text-gray-900">{banks.filter((b) => b.isActive).length}</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-full"><XCircle className="w-6 h-6 text-red-600" /></div>
            <div>
              <div className="text-sm text-gray-600">Inactive Banks</div>
              <div className="text-2xl font-bold text-gray-900">{banks.filter((b) => !b.isActive).length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-300 p-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Bank Code / Name / Branch"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <SearchableDropdown
              options={[
                { value: 'All', label: 'All Statuses' },
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
              ]}
              value={statusFilter}
              onValueChange={setStatusFilter}
              placeholder="All Statuses"
              className="w-full"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-300">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-300">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bank Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bank Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IFSC Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredBanks.map((bank) => (
                <tr key={bank.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{bank.code}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <Landmark className="w-4 h-4 text-gray-400" />
                      {bank.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">{maskAccountNumber(bank.accountNumber)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{bank.branch ?? '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">{bank.ifsc ?? '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {bank.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                        <CheckCircle className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded">
                        <XCircle className="w-3 h-3" /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleView(bank)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="View"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => handleEdit(bank)} className="p-1 text-gray-600 hover:bg-gray-50 rounded" title="Edit"><Edit className="w-4 h-4" /></button>
                      {bank.isActive && (
                        <button onClick={() => handleDelete(bank.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Deactivate"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {loading && (
            <div className="p-8 text-center text-gray-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          )}
          {!loading && filteredBanks.length === 0 && (
            <div className="p-12 text-center">
              <Landmark className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No banks found matching your criteria</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
