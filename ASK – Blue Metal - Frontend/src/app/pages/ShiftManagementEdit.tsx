import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Save, X, Plus, Trash2 } from 'lucide-react';
import { SearchableDropdown, SearchableDropdownOption } from '../components/ui/searchable-dropdown';
import { shiftApi, type ShiftDenomination } from '../services/operationsApi';
import { usersApi, type UserRow } from '../services/iamApi';
import { describeError } from '../services/mastersApi';

interface DenominationRow {
  id: string;
  denomination: number;
  nos: number;
  amount: number;
}

export const ShiftManagementEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState({
    shiftNo: '',
    shiftDate: '',
    openedAt: '',
    openedByUserId: '',
    openingAmount: 0,
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

  const [transferDenominations, setTransferDenominations] = useState<DenominationRow[]>([
    { id: '1', denomination: 500, nos: 0, amount: 0 }
  ]);

  const mockUsers: { id: string; name: string }[] = [];
  const [users, setUsers] = useState<UserRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const calculateTransferTotalAmount = () => {
    return transferDenominations.reduce((sum, row) => sum + row.amount, 0);
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

  const handleTransferDenominationChange = (id: string, field: 'denomination' | 'nos', value: number) => {
    setTransferDenominations(prev => prev.map(row => {
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

  const addTransferDenominationRow = () => {
    setTransferDenominations(prev => [...prev, {
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

  const removeTransferDenominationRow = (id: string) => {
    if (transferDenominations.length > 1) {
      setTransferDenominations(prev => prev.filter(row => row.id !== id));
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [userRes, shift] = await Promise.all([
          usersApi.list({ pageSize: 100 }),
          id ? shiftApi.get(id) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setUsers(userRes.items.filter((u) => u.status === 'ACTIVE'));
        if (shift) {
          setFormData({
            shiftNo: shift.shiftNo,
            shiftDate: shift.shiftDate ? new Date(shift.shiftDate).toISOString().slice(0, 10) : '',
            openedAt: shift.openedAt ? new Date(shift.openedAt).toISOString().slice(0, 16) : '',
            openedByUserId: shift.openedById ?? '',
            openingAmount: Number(shift.openingAmount) || 0,
            status: shift.status,
            closedAt: shift.closedAt ? new Date(shift.closedAt).toISOString().slice(0, 16) : '',
            closedByUserId: shift.closedById ?? '',
            nextShiftUserId: shift.nextShiftUserId ?? '',
            remarks: shift.remarks ?? '',
            weightSlipTotal: Number(shift.weightSlipTotal) || 0,
            invoiceTotal: Number(shift.invoiceTotal) || 0,
            billingTotal: Number(shift.billingTotal) || 0,
            receiptVoucherTotal: Number(shift.receiptTotal) || 0,
            paymentVoucherTotal: Number(shift.paymentTotal) || 0,
            bataPaid: 0,
            purchaseTotal: Number(shift.purchaseTotal) || 0,
            totalCashReceived: Number(shift.totalCashReceived) || 0,
            netAmount: Number(shift.netAmount) || 0,
            cashInHand: Number(shift.cashInHand) || 0,
            transferAmount: Number(shift.transferAmount) || 0,
            closingAmount: Number(shift.closingAmount) || 0,
          });
          const od = Array.isArray(shift.openingDenominations) ? shift.openingDenominations : [];
          if (od.length > 0) {
            setDenominations(
              od.map((d, i) => ({
                id: `${i}-${Math.random()}`,
                denomination: Number(d.denomination) || 0,
                nos: Number(d.nos) || 0,
                amount: Number(d.amount) || 0,
              })),
            );
          }
          const td = Array.isArray(shift.transferDenominations) ? shift.transferDenominations : [];
          if (td.length > 0) {
            setTransferDenominations(
              td.map((d, i) => ({
                id: `${i}-${Math.random()}`,
                denomination: Number(d.denomination) || 0,
                nos: Number(d.nos) || 0,
                amount: Number(d.amount) || 0,
              })),
            );
          }
        }
      } catch (err) {
        if (!cancelled) setError(describeError(err, 'Failed to load shift'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!id) return;

    if (formData.status === 'CLOSED') {
      setError('Cannot modify a closed shift.');
      return;
    }
    const hasInvalidRows = denominations.some((row) => row.nos === 0 || !row.denomination);
    if (hasInvalidRows) {
      setError('Please fill all denomination rows or remove empty rows');
      return;
    }
    const hasInvalidTransferRows = transferDenominations.some((row) => row.nos === 0 || !row.denomination);
    if (hasInvalidTransferRows) {
      setError('Please fill all transfer denomination rows or remove empty rows');
      return;
    }

    const toDenoms = (rows: DenominationRow[]): ShiftDenomination[] =>
      rows
        .filter((r) => r.nos > 0)
        .map((r) => ({ denomination: r.denomination, nos: r.nos, amount: r.amount }));

    setSaving(true);
    try {
      await shiftApi.update(id, {
        remarks: formData.remarks || null,
        nextShiftUserId: formData.nextShiftUserId || null,
        transferAmount: calculateTransferTotalAmount(),
        closingAmount: formData.closingAmount,
        openingDenominations: toDenoms(denominations),
        transferDenominations: toDenoms(transferDenominations),
      });
      navigate('/shift-management');
    } catch (err) {
      setError(describeError(err, 'Failed to update shift'));
    } finally {
      setSaving(false);
    }
  };

  const isReadOnly = formData.status === 'CLOSED';

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Shift</h1>
        <p className="text-gray-600">Update shift details and close shift</p>
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
                  disabled
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
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
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
                disabled={isReadOnly}
              />
            </div>
          </div>

          {/* Shift Closing Denominations */}
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <h3 className="font-semibold mb-4 pb-2 border-b">Shift Closing Denominations</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Denomination</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Nos <span className="text-red-500">*</span></th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {denominations.map(row => (
                    <tr key={row.id} className="border-b">
                      <td className="px-4 py-3">
                        <SearchableDropdown
                          options={denominationDropdownOptions}
                          value={row.denomination.toString()}
                          onValueChange={(value) => handleDenominationChange(row.id, 'denomination', parseInt(value))}
                          placeholder="Select Denomination"
                          searchPlaceholder="Search denominations..."
                          disabled={isReadOnly}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          value={row.nos}
                          onChange={(e) => handleDenominationChange(row.id, 'nos', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          disabled={isReadOnly}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={`₹${row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-medium"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => removeDenominationRow(row.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          disabled={denominations.length === 1 || isReadOnly}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-blue-50 border-t-2 border-blue-200">
                    <td className="px-4 py-3 font-semibold text-gray-900" colSpan={2}>Total Closing Amount</td>
                    <td className="px-4 py-3 font-bold text-blue-900" colSpan={2}>
                      ₹{calculateTotalAmount().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {!isReadOnly && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={addDenominationRow}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add Denomination Row
                </button>
              </div>
            )}
          </div>

          {/* Denomination Transfer Details */}
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <div className="flex items-center justify-between mb-4 pb-2 border-b">
              <h3 className="font-semibold">Denomination Transfer Details (Next Shift)</h3>
              <span className="text-sm text-gray-600">Transfer cash to next shift operator</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Denomination</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Nos <span className="text-red-500">*</span></th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {transferDenominations.map(row => (
                    <tr key={row.id} className="border-b">
                      <td className="px-4 py-3">
                        <SearchableDropdown
                          options={denominationDropdownOptions}
                          value={row.denomination.toString()}
                          onValueChange={(value) => handleTransferDenominationChange(row.id, 'denomination', parseInt(value))}
                          placeholder="Select Denomination"
                          searchPlaceholder="Search denominations..."
                          disabled={isReadOnly}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          value={row.nos}
                          onChange={(e) => handleTransferDenominationChange(row.id, 'nos', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          disabled={isReadOnly}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={`₹${row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-medium"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => removeTransferDenominationRow(row.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          disabled={transferDenominations.length === 1 || isReadOnly}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-green-50 border-t-2 border-green-200">
                    <td className="px-4 py-3 font-semibold text-gray-900" colSpan={2}>Total Amount Paid (Transfer)</td>
                    <td className="px-4 py-3 font-bold text-green-900" colSpan={2}>
                      ₹{calculateTransferTotalAmount().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {!isReadOnly && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={addTransferDenominationRow}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add Transfer Denomination Row
                </button>
              </div>
            )}
          </div>

          {/* Transfer Summary & Validation */}
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <h3 className="font-semibold mb-4 pb-2 border-b">Transfer Summary & Validation</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Closing Amount</label>
                <div className="text-2xl font-bold text-blue-900">
                  ₹{calculateTotalAmount().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount Paid (Transfer)</label>
                <div className="text-2xl font-bold text-green-900">
                  ₹{calculateTransferTotalAmount().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-1">Cash in Hand</label>
                <div className="text-2xl font-bold text-purple-900">
                  ₹{formData.cashInHand.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-1">Remaining Amount</label>
                <div className="text-2xl font-bold text-amber-900">
                  ₹{(calculateTotalAmount() - calculateTransferTotalAmount()).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
            {calculateTotalAmount() !== calculateTransferTotalAmount() && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 font-medium">
                  ⚠️ Warning: Total Closing Amount and Total Transfer Amount do not match. Please verify the denominations before closing the shift.
                </p>
              </div>
            )}
            {calculateTotalAmount() === calculateTransferTotalAmount() && calculateTotalAmount() > 0 && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 font-medium">
                  ✓ Transfer amounts validated successfully. Ready to close shift.
                </p>
              </div>
            )}
          </div>

          {/* Related Records */}
          {formData.status === 'CLOSED' && (
            <div className="bg-white rounded-lg border border-gray-300 p-6">
              <h3 className="font-semibold mb-4 pb-2 border-b">Related Records</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">Denomination Details</div>
                    <div className="text-sm text-gray-600">View closing denomination breakdown</div>
                  </div>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                    View Details
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">Transfer Denomination Details</div>
                    <div className="text-sm text-gray-600">View amount transferred to next shift</div>
                  </div>
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                    View Transfer
                  </button>
                </div>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800 font-medium">
                    ✓ Amount successfully transferred to the next shift (SH-2025-002)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving…' : 'Update Shift'}
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