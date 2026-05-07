import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Save, X, Plus, Trash2 } from 'lucide-react';
import { SearchableDropdown, SearchableDropdownOption } from '../components/ui/searchable-dropdown';
import { shiftApi } from '../services/operationsApi';
import { usersApi, type UserRow } from '../services/iamApi';
import { describeError } from '../services/mastersApi';
import { useAppContext } from '../context/AppContext';

interface DenominationRow {
  id: string;
  denomination: number;
  nos: number;
  amount: number;
}

export const ShiftManagementCreate = () => {
  const navigate = useNavigate();
  const { user } = useAppContext();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    shiftNo: 'Auto-generated on save',
    shiftDate: new Date().toISOString().split('T')[0],
    openedAt: new Date().toISOString().slice(0, 16),
    openedByUserId: '',
    openingAmount: 5000,
    status: 'OPEN' as 'OPEN' | 'CLOSED',
    closedAt: '',
    closedByUserId: '',
    nextShiftUserId: '',
    remarks: '',
    weightSlipTotal: 0,
    invoiceTotal: 0,
    billingTotal: 0,
    receiptVoucherTotal: 0,
    paymentVoucherTotal: 0,
    bataPaid: 0,
    purchaseTotal: 0,
    totalCashReceived: 0,
    netAmount: 0,
    cashInHand: 0,
    transferAmount: 0,
    closingAmount: 0
  });

  const [denominations, setDenominations] = useState<DenominationRow[]>([
    { id: '1', denomination: 500, nos: 0, amount: 0 }
  ]);

  useEffect(() => {
    (async () => {
      try {
        const res = await usersApi.list({ pageSize: 200 });
        setUsers(res.items.filter((u) => u.status === 'ACTIVE'));
      } catch (err) {
        setError(describeError(err, 'Failed to load users'));
      }
    })();
  }, []);

  // Default to logged-in user
  useEffect(() => {
    if (!formData.openedByUserId && user?.id) {
      setFormData((prev) => ({ ...prev, openedByUserId: user.id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const denominationOptions = [500, 200, 100, 50, 20, 10, 5, 2, 1];

  // Convert users to SearchableDropdown options
  const userOptions: SearchableDropdownOption[] = users.map((u) => ({
    label: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.username,
    value: u.id,
  }));

  // Convert denominations to SearchableDropdown options
  const denominationDropdownOptions: SearchableDropdownOption[] = denominationOptions.map(val => ({
    label: `₹ ${val}`,
    value: val.toString()
  }));

  // Status options
  const statusOptions: SearchableDropdownOption[] = [
    { label: 'OPEN', value: 'OPEN' },
    { label: 'CLOSED', value: 'CLOSED' }
  ];

  const calculateDenominationAmount = (denomination: number, nos: number) => {
    return denomination * nos;
  };

  const calculateTotalAmount = () => {
    return denominations.reduce((sum, row) => sum + row.amount, 0);
  };

  const handleDenominationChange = (id: string, field: 'denomination' | 'nos', value: number) => {
    setDenominations(prev => prev.map(row => {
      if (row.id === id) {
        const updatedRow = { ...row, [field]: value };
        updatedRow.amount = calculateDenominationAmount(updatedRow.denomination, updatedRow.nos);
        return updatedRow;
      }
      return row;
    }));
  };

  const addDenominationRow = () => {
    setDenominations(prev => [...prev, {
      id: Date.now().toString(),
      denomination: 500,
      nos: 0,
      amount: 0
    }]);
  };

  const removeDenominationRow = (id: string) => {
    if (denominations.length > 1) {
      setDenominations(prev => prev.filter(row => row.id !== id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate denominations
    const hasInvalidRows = denominations.some((row) => row.nos === 0 || !row.denomination);
    if (hasInvalidRows) {
      setError('Please fill all denomination rows or remove empty rows');
      return;
    }
    if (!formData.openedByUserId) {
      setError('Please select Opened By user');
      return;
    }
    const opener = users.find((u) => u.id === formData.openedByUserId);
    const openedBySnapshot =
      (opener ? `${opener.firstName ?? ''} ${opener.lastName ?? ''}`.trim() : '') ||
      opener?.username ||
      user?.name ||
      'system';
    const denomTotal = denominations.reduce((s, d) => s + d.amount, 0);

    setSaving(true);
    try {
      await shiftApi.create({
        shiftDate: new Date(`${formData.shiftDate}T00:00:00`).toISOString(),
        openedBySnapshot,
        openingAmount: denomTotal || formData.openingAmount,
        remarks: formData.remarks || null,
        openingDenominations: denominations
          .filter((d) => d.nos > 0)
          .map((d) => ({ denomination: d.denomination, nos: d.nos, amount: d.amount })),
      });
      navigate('/shift-management');
    } catch (err) {
      setError(describeError(err, 'Failed to start shift'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Start New Shift</h1>
        <p className="text-gray-600">Open a new shift for operations</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Shift Start Details */}
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <h3 className="font-semibold mb-4 pb-2 border-b">Shift Start Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shift No <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.shiftNo}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-generated</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shift Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.shiftDate}
                  onChange={(e) => setFormData({ ...formData, shiftDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Opened At <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.openedAt}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-filled with current time</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Opened By <span className="text-red-500">*</span>
                </label>
                <SearchableDropdown
                  options={userOptions}
                  value={formData.openedByUserId}
                  onValueChange={(value) => setFormData({ ...formData, openedByUserId: value })}
                  placeholder="Select User"
                  searchPlaceholder="Search users..."
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Opening Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.openingAmount}
                  onChange={(e) => setFormData({ ...formData, openingAmount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Cash amount at shift start</p>
              </div>
            </div>
          </div>

          {/* Financials & Cash Management */}
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <h3 className="font-semibold mb-4 pb-2 border-b">Financials & Cash Management</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weight Slip Total</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.weightSlipTotal}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-calculated</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Total</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.invoiceTotal}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-calculated</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Billing Total</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.billingTotal}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-calculated</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Voucher Total</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.receiptVoucherTotal}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-calculated</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Voucher Total</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.paymentVoucherTotal}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-calculated</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bata Paid</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.bataPaid}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-calculated</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Total</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.purchaseTotal}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-calculated</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Cash Received</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.totalCashReceived}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-calculated</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Net Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.netAmount}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-calculated</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cash in Hand</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cashInHand}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-semibold"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-calculated</p>
              </div>
            </div>
          </div>

          {/* End of Shift / Closing Details */}
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <h3 className="font-semibold mb-4 pb-2 border-b">End of Shift / Closing Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status <span className="text-red-500">*</span>
                </label>
                <SearchableDropdown
                  options={statusOptions}
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as 'OPEN' | 'CLOSED' })}
                  placeholder="Select Status"
                  allowClear={false}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Closed At
                </label>
                <input
                  type="datetime-local"
                  value={formData.closedAt}
                  onChange={(e) => setFormData({ ...formData, closedAt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={formData.status === 'OPEN'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Closed By
                </label>
                <SearchableDropdown
                  options={userOptions}
                  value={formData.closedByUserId}
                  onValueChange={(value) => setFormData({ ...formData, closedByUserId: value })}
                  placeholder="Select User"
                  searchPlaceholder="Search users..."
                  disabled={formData.status === 'OPEN'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Next Shift User
                </label>
                <SearchableDropdown
                  options={userOptions}
                  value={formData.nextShiftUserId}
                  onValueChange={(value) => setFormData({ ...formData, nextShiftUserId: value })}
                  placeholder="Select User"
                  searchPlaceholder="Search users..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transfer Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.transferAmount}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-calculated</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Closing Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.closingAmount}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-calculated</p>
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <h3 className="font-semibold mb-4 pb-2 border-b">Remarks</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remarks
              </label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Add any notes or remarks..."
              />
            </div>
          </div>

          {/* Denominations */}
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <h3 className="font-semibold mb-4 pb-2 border-b">Denominations</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-4">
                <button
                  type="button"
                  onClick={addDenominationRow}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add Denomination
                </button>
              </div>
              {denominations.map(row => (
                <div key={row.id} className="col-span-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Denomination</label>
                      <SearchableDropdown
                        options={denominationDropdownOptions}
                        value={row.denomination.toString()}
                        onValueChange={(value) => handleDenominationChange(row.id, 'denomination', parseInt(value))}
                        placeholder="Select Denomination"
                        searchPlaceholder="Search denominations..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nos</label>
                      <input
                        type="number"
                        step="1"
                        value={row.nos}
                        onChange={(e) => handleDenominationChange(row.id, 'nos', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        value={row.amount}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      />
                      <p className="text-xs text-gray-500 mt-1">Auto-calculated</p>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => removeDenominationRow(row.id)}
                        className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <div className="col-span-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={calculateTotalAmount()}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-calculated</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving…' : 'Start Shift'}
          </button>
          <Link
            to="/shift-management"
            className="flex items-center gap-2 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
};