import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Save, X, Plus, Trash2 } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';
import { shiftApi, type ShiftRow, type ShiftDenomination } from '../services/operationsApi';
import { describeError } from '../services/mastersApi';

interface DenominationRow {
  id: string;
  denomination: number;
  nos: number;
  amount: number;
}

const parseId = (raw: string | undefined): { shiftId: string | null } => {
  if (!raw || raw === 'new') return { shiftId: null };
  const [shiftId] = decodeURIComponent(raw).split(':');
  return { shiftId: shiftId || null };
};

export const ShiftTransferDenominationsEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { shiftId: routeShiftId } = parseId(id);
  const [formData, setFormData] = useState({
    shiftTransferDenomId: '',
    shiftId: '',
    shiftStatus: 'OPEN' as 'OPEN' | 'CLOSED',
    status: 'Transferred',
  });

  const [denominationRows, setDenominationRows] = useState<DenominationRow[]>([
    { id: '1', denomination: 500, nos: 0, amount: 0 },
  ]);
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const denominations = [500, 200, 100, 50, 20, 10, 5, 2, 1];

  // Transform options for SearchableDropdown
  const shiftOptions = shifts.map((shift) => ({
    label: `${shift.shiftNo} - ${shift.status}`,
    value: shift.id,
    description: shift.status,
  }));

  const denominationOptions = denominations.map((denom) => ({
    label: `₹${denom}`,
    value: denom.toString(),
  }));

  const isReadOnly = formData.shiftStatus === 'CLOSED';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [shiftList, current] = await Promise.all([
          shiftApi.list({ pageSize: 100 }),
          routeShiftId ? shiftApi.get(routeShiftId) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setShifts(shiftList.items);
        if (current) {
          const denoms = (current.transferDenominations || []) as ShiftDenomination[];
          setFormData({
            shiftTransferDenomId: current.id,
            shiftId: current.id,
            shiftStatus: current.status === 'CLOSED' ? 'CLOSED' : 'OPEN',
            status: current.status === 'CLOSED' ? 'Transferred' : 'Pending',
          });
          if (denoms.length > 0) {
            setDenominationRows(
              denoms.map((d, i) => ({
                id: `${i}-${d.denomination}`,
                denomination: Number(d.denomination) || 0,
                nos: Number(d.nos) || 0,
                amount: Number(d.amount) || Number(d.denomination) * Number(d.nos) || 0,
              })),
            );
          }
        }
      } catch (err) {
        if (!cancelled) setError(describeError(err, 'Failed to load shift transfer'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [routeShiftId]);

  const calculateAmount = (denomination: number, nos: number) => {
    return denomination * nos;
  };

  const calculateTotalTransferAmount = () => {
    return denominationRows.reduce((sum, row) => sum + row.amount, 0);
  };

  const handleShiftChange = (shiftId: string) => {
    const selectedShift = shifts.find((s) => s.id === shiftId);
    setFormData({
      ...formData,
      shiftId,
      shiftStatus: (selectedShift?.status === 'CLOSED' ? 'CLOSED' : 'OPEN'),
    });
  };

  const handleDenominationChange = (index: number, field: keyof DenominationRow, value: number) => {
    const newRows = [...denominationRows];
    newRows[index] = { ...newRows[index], [field]: value };
    
    if (field === 'denomination' || field === 'nos') {
      newRows[index].amount = calculateAmount(newRows[index].denomination, newRows[index].nos);
    }
    
    setDenominationRows(newRows);
  };

  const addDenominationRow = () => {
    setDenominationRows([
      ...denominationRows,
      { id: Date.now().toString(), denomination: 500, nos: 0, amount: 0 }
    ]);
  };

  const removeDenominationRow = (index: number) => {
    if (denominationRows.length > 1) {
      setDenominationRows(denominationRows.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.shiftId) {
      alert('Shift is required');
      return;
    }

    const hasInvalidRows = denominationRows.some((row) => !row.denomination || row.nos <= 0);
    if (hasInvalidRows) {
      alert('All denomination rows must have a valid denomination and number of notes greater than 0');
      return;
    }

    const totalTransferAmount = calculateTotalTransferAmount();
    if (totalTransferAmount <= 0) {
      alert('Total transfer amount must be greater than 0');
      return;
    }

    setSaving(true);
    try {
      const denoms: ShiftDenomination[] = denominationRows.map((r) => ({
        denomination: r.denomination,
        nos: r.nos,
        amount: r.amount,
      }));
      await shiftApi.setTransferDenominations(formData.shiftId, denoms, totalTransferAmount);
      navigate('/shift-management/transfer');
    } catch (err) {
      setError(describeError(err, 'Failed to save shift transfer denominations'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{id && id !== 'new' ? 'Edit' : 'Create'} Shift Transfer Denomination</h1>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {loading && (
        <div className="mb-4 rounded-md bg-blue-50 border border-blue-200 px-4 py-2 text-sm text-blue-700">
          Loading…
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Shift Reference */}
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <h3 className="font-semibold mb-4 pb-2 border-b">Shift Reference</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shift <span className="text-red-500">*</span>
                </label>
                <SearchableDropdown
                  options={shiftOptions}
                  value={formData.shiftId}
                  onValueChange={(value) => handleShiftChange(value)}
                  placeholder="Select Shift"
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <div className="flex items-center gap-2">
                  {formData.shiftStatus === 'CLOSED' ? (
                    <span className="px-3 py-2 text-sm font-medium bg-green-100 text-green-800 rounded-lg">
                      ✓ Transfer Completed
                    </span>
                  ) : (
                    <span className="px-3 py-2 text-sm font-medium bg-blue-100 text-blue-800 rounded-lg">
                      {formData.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Denomination Details */}
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <div className="flex items-center justify-between mb-4 pb-2 border-b">
              <h3 className="font-semibold">Denomination Details</h3>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={addDenominationRow}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Row
                </button>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                      Denomination <span className="text-red-500">*</span>
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                      Nos <span className="text-red-500">*</span>
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Amount</th>
                    {!isReadOnly && <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {denominationRows.map((row, index) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3">
                        <SearchableDropdown
                          options={denominationOptions}
                          value={row.denomination.toString()}
                          onValueChange={(value) => handleDenominationChange(index, 'denomination', parseInt(value))}
                          placeholder="Select Denomination"
                          disabled={isReadOnly}
                          className="w-full"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          value={row.nos}
                          onChange={(e) => handleDenominationChange(index, 'nos', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                          disabled={isReadOnly}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={`₹${row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-semibold text-gray-900"
                        />
                      </td>
                      {!isReadOnly && (
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => removeDenominationRow(index)}
                            disabled={denominationRows.length === 1}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Total Transfer Amount */}
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <h3 className="font-semibold mb-4 pb-2 border-b">Transfer Summary</h3>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Total Denominations</label>
                <div className="text-lg font-semibold text-gray-900">{denominationRows.length}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Total Notes</label>
                <div className="text-lg font-semibold text-gray-900">
                  {denominationRows.reduce((sum, row) => sum + row.nos, 0)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Total Transfer Amount</label>
                <div className="text-2xl font-bold text-blue-600">
                  ₹{calculateTotalTransferAmount().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <div className="flex gap-3 justify-end">
              <Link
                to="/shift-management/transfer"
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X className="w-5 h-5 inline mr-2" />
                Cancel
              </Link>
              {!isReadOnly && (
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Save className="w-5 h-5 inline mr-2" />
                  {saving ? 'Saving…' : 'Save Denomination Transfer'}
                </button>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};