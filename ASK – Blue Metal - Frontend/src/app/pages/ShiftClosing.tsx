import { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { LockKeyhole, Printer, Search, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router';
import { SearchableDropdown, SearchableDropdownOption } from '../components/ui/searchable-dropdown';
import { shiftApi, purchaseConsumptionApi, type ShiftRow, type ShiftDenomination } from '../services/operationsApi';
import { usersApi, type UserRow } from '../services/iamApi';
import { describeError } from '../services/mastersApi';

// Fallback staff list (used while users are loading)
const mockStaffUsers: { id: string; name: string; role: string }[] = [];

export const ShiftClosing = () => {
  const { user, shiftStatus, refreshShiftStatus } = useAppContext();
  const [formData, setFormData] = useState({
    entryDate: new Date().toISOString().split('T')[0],
    entryTime: new Date().toTimeString().slice(0, 5),
    openingAmount: 0,
    weightSlip: 0,
    invoice: 0,
    billingTotal: 0,
    receiptsVoucherTotal: 0,
    bataPaid: 0,
    paymentsVoucherTotal: 0,
    purchaseTotal: 0,
  });

  // Auto-populated denominations from active shift's opening denominations
  const [denominations, setDenominations] = useState<Record<string, number>>({
    '2000': 0,
    '500': 0,
    '200': 0,
    '100': 0,
    '50': 0,
    '20': 0,
    '10': 0,
    '5': 0,
    '2': 0,
    '1': 0,
  });

  const [transferDenominations, setTransferDenominations] = useState<Record<string, number>>({
    '2000': 0, '500': 0, '200': 0, '100': 0, '50': 0, '20': 0, '10': 0, '5': 0, '2': 0, '1': 0,
  });
  
  const [isClosed, setIsClosed] = useState(false);
  const [activeShift, setActiveShift] = useState<ShiftRow | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [blockingCount, setBlockingCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [shifts, userRes] = await Promise.all([
          shiftApi.list({ status: 'OPEN', pageSize: 1 }),
          usersApi.list({ pageSize: 100 }),
        ]);
        if (cancelled) return;
        const open = shifts.items[0] ?? null;
        setActiveShift(open);
        setUsers(userRes.items.filter((u) => u.status === 'ACTIVE'));
        if (open) {
          // Fetch count of NEW purchase consumption rows tied to this shift —
          // these block the close unless the user is strictly entry-way only.
          try {
            const block = await purchaseConsumptionApi.blocking(open.id);
            if (!cancelled) setBlockingCount(block.count);
          } catch {
            /* non-fatal */
          }
          setFormData((prev) => ({
            ...prev,
            entryDate: new Date(open.shiftDate).toISOString().slice(0, 10),
            openingAmount: Number(open.openingAmount) || 0,
            weightSlip: Number(open.weightSlipTotal) || 0,
            invoice: Number(open.invoiceTotal) || 0,
            billingTotal: Number(open.billingTotal) || 0,
            receiptsVoucherTotal: Number(open.receiptTotal) || 0,
            paymentsVoucherTotal: Number(open.paymentTotal) || 0,
            purchaseTotal: Number(open.purchaseTotal) || 0,
          }));
          // Hydrate denomination NOS from the LIVE breakdown (opening + sales
          // cash + receipts - payments) so the screen reflects the current
          // cash position. Falls back to opening denominations if the backend
          // hasn't supplied liveDenominations.
          const live = ((open.liveDenominations && open.liveDenominations.length > 0)
            ? open.liveDenominations
            : open.openingDenominations) as ShiftDenomination[] | undefined;
          if (live && live.length > 0) {
            setDenominations((prev) => {
              const next: Record<string, number> = { ...prev };
              // Reset known keys to zero before hydrating to avoid stale values.
              for (const k of Object.keys(next)) next[k] = 0;
              for (const d of live) {
                const key = String(d.denomination);
                next[key] = Number(d.nos) || 0;
              }
              return next;
            });
          }
        } else {
          setLoadError('No open shift found. Please open a shift first.');
        }
      } catch (err) {
        if (!cancelled) setLoadError(describeError(err, 'Failed to load active shift'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Dropdown options for staff
  const staffOptions: SearchableDropdownOption[] = users.map((u) => ({
    label: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.username,
    value: u.id,
    description: u.username,
  }));

  // Calculate denomination totals
  const calculateDenominationTotal = (denoms: Record<string, number>) => {
    return Object.entries(denoms).reduce((sum, [denomination, qty]) => {
      return sum + (parseInt(denomination) * qty);
    }, 0);
  };

  const denominationTotal = calculateDenominationTotal(denominations);
  const transferDenominationTotal = calculateDenominationTotal(transferDenominations);

  // Calculated fields
  // Total Cash Received = Opening + Weight Slip + Billing (cash only) + Receipts.
  // Invoice is shown for reference and is NOT added (it overlaps with Billing Total
  // for cash sales and would double-count).
  const totalCashReceived = formData.openingAmount + formData.weightSlip + formData.billingTotal + formData.receiptsVoucherTotal;
  const netAmount = totalCashReceived - formData.bataPaid - formData.paymentsVoucherTotal - formData.purchaseTotal;
  const cashInHand = netAmount;
  const totalAmountPaid = transferDenominationTotal;
  // Closing Amount = current cash on hand minus what is being transferred to next shift.
  const closingAmount = cashInHand - transferDenominationTotal;

  // Block close while purchase entries are still in NEW status — unless the
  // user is strictly an entry-way operator (WEIGHBRIDGE_OPERATOR only).
  const userRoles = user.roleCodes ?? [];
  const isEntryWayOnly = userRoles.length > 0 && userRoles.every((r) => r === 'WEIGHBRIDGE_OPERATOR');
  const isCloseBlocked = !isEntryWayOnly && blockingCount > 0;

  const handleDenominationChange = (denom: string, count: number) => {
    const newDenominations = { ...denominations, [denom]: count };
    setDenominations(newDenominations);
  };

  const handleTransferDenominationChange = (denom: string, count: number) => {
    const newTransferDenominations = { ...transferDenominations, [denom]: count };
    setTransferDenominations(newTransferDenominations);
  };

  const handleCloseShift = async () => {
    if (!activeShift) {
      alert('No open shift to close');
      return;
    }
    if (isCloseBlocked) {
      alert(`Cannot close shift: ${blockingCount} purchase entry(ies) are still in NEW status. Classify them on Raw Material — Purchase Wise first.`);
      return;
    }
    setSaving(true);
    try {
      const closingDenominations: ShiftDenomination[] = Object.entries(denominations)
        .filter(([, n]) => n > 0)
        .map(([k, n]) => ({
          denomination: parseInt(k, 10),
          nos: n,
          amount: parseInt(k, 10) * n,
        }));
      const transferDenoms: ShiftDenomination[] = Object.entries(transferDenominations)
        .filter(([, n]) => n > 0)
        .map(([k, n]) => ({
          denomination: parseInt(k, 10),
          nos: n,
          amount: parseInt(k, 10) * n,
        }));
      await shiftApi.close(activeShift.id, {
        closedBySnapshot: user.name || user.username || 'system',
        transferAmount: transferDenominationTotal,
        closingAmount,
        closingDenominations,
        transferDenominations: transferDenoms,
      });
      setIsClosed(true);
      await refreshShiftStatus();
      alert('Shift closed successfully! Report generated.');
    } catch (err) {
      alert(describeError(err, 'Failed to close shift'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Shift Closing</h1>
      </div>

      {loadError && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {!isClosed ? (
        <div className="bg-white rounded-lg border border-gray-300 p-6">
          {/* Header Fields */}
          <div className="grid grid-cols-5 gap-4 mb-6 pb-4 border-b">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entry No. <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={`SHIFT-${shiftStatus.shiftNumber}`}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 font-mono cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entry Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.entryDate}
                onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time
              </label>
              <input
                type="time"
                value={formData.entryTime}
                onChange={(e) => setFormData({ ...formData, entryTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Staff
              </label>
              <input
                type="text"
                value={user.name}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Main Content - 3 columns layout */}
          <div className="grid grid-cols-3 gap-6">
            {/* Left Column - Current In-Hand Cash Denomination Details (Read-only) */}
            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
              <div className="mb-3 pb-2 border-b-2 border-purple-300">
                <h3 className="font-bold text-purple-900">Current In-Hand Cash Denomination Details</h3>
                <p className="text-xs text-purple-700 mt-1">(Auto-populated from system - Read Only)</p>
              </div>
              <div className="bg-white rounded border border-gray-300 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-blue-100 border-b border-gray-300">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Denominations</th>
                      <th className="px-3 py-2 text-center font-semibold text-gray-700">Nos</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-700">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(denominations).map(([denom, count], idx) => {
                      const amount = parseInt(denom) * count;
                      const isEven = idx % 2 === 0;
                      return (
                        <tr key={denom} className={`border-b border-gray-300 last:border-b-0 ${isEven ? 'bg-gray-50' : 'bg-white'}`}>
                          <td className="px-3 py-2 font-bold text-center text-blue-900">{denom}</td>
                          <td className="px-3 py-2 text-center">
                            <div className="font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded">
                              {count}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-semibold text-gray-700">
                            {amount.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 p-3 bg-green-100 border border-green-300 rounded flex justify-between items-center">
                <span className="text-sm font-bold text-green-900">Total In-Hand</span>
                <span className="font-mono font-bold text-green-900 text-lg">₹{cashInHand.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Middle Column - Financial Fields */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-blue-700 mb-1">Opening Amount</label>
                <input
                  type="text"
                  value={formData.openingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 font-mono text-right cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-blue-700 mb-1">Weight Slip</label>
                <input
                  type="text"
                  value={formData.weightSlip.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 font-mono text-right cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-blue-700 mb-1">Invoice</label>
                <input
                  type="text"
                  value={formData.invoice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 font-mono text-right cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-blue-700 mb-1">Billing Total</label>
                <input
                  type="text"
                  value={formData.billingTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 font-mono text-right cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-blue-700 mb-1">Receipts Voucher Total</label>
                <input
                  type="text"
                  value={formData.receiptsVoucherTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 font-mono text-right cursor-not-allowed"
                />
              </div>
              <div className="pt-2 border-t-2 border-blue-300">
                <label className="block text-sm font-bold text-blue-900 mb-1">Total Cash Received</label>
                <input
                  type="text"
                  value={totalCashReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  readOnly
                  className="w-full px-3 py-2 border-2 border-blue-400 rounded-lg bg-blue-50 font-mono text-right font-bold text-blue-900 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-red-700 mb-1">Bata Paid</label>
                <input
                  type="text"
                  value={formData.bataPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 font-mono text-right cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-red-700 mb-1">Payments Voucher Total</label>
                <input
                  type="text"
                  value={formData.paymentsVoucherTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 font-mono text-right cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-red-700 mb-1">Purchase Total</label>
                <input
                  type="text"
                  value={formData.purchaseTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 font-mono text-right cursor-not-allowed"
                />
              </div>
              <div className="pt-2 border-t-2 border-purple-300">
                <label className="block text-sm font-bold text-purple-900 mb-1">Net Amount</label>
                <input
                  type="text"
                  value={netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  readOnly
                  className="w-full px-3 py-2 border-2 border-purple-400 rounded-lg bg-purple-50 font-mono text-right font-bold text-purple-900 cursor-not-allowed"
                />
              </div>
              <div className="pt-2 border-t-2 border-green-300">
                <label className="block text-sm font-bold text-green-900 mb-1">Cash In Hand</label>
                <input
                  type="text"
                  value={cashInHand.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  readOnly
                  className="w-full px-3 py-2 border-2 border-green-400 rounded-lg bg-green-50 font-mono text-right font-bold text-green-900 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Right Column - Denomination Transfer Details */}
            <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
              <div className="mb-3 pb-2 border-b-2 border-orange-300">
                <h3 className="font-bold text-orange-900">Denomination Transfer Details</h3>
                <p className="text-xs text-orange-700 mt-1">(Enter cash to handover to next shift person)</p>
              </div>
              <div className="bg-white rounded border border-gray-300 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-blue-100 border-b border-gray-300">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Denominations</th>
                      <th className="px-3 py-2 text-center font-semibold text-gray-700">Nos</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-700">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(transferDenominations).map(([denom, count], idx) => {
                      const amount = parseInt(denom) * count;
                      const isEven = idx % 2 === 0;
                      return (
                        <tr key={denom} className={`border-b border-gray-300 last:border-b-0 ${isEven ? 'bg-gray-50' : 'bg-white'}`}>
                          <td className="px-3 py-2 font-bold text-center text-blue-900">{denom}</td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="number"
                              value={count}
                              onChange={(e) => handleTransferDenominationChange(denom, parseInt(e.target.value) || 0)}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-center font-semibold"
                              min="0"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-semibold">
                            {amount.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 space-y-2">
                <div className="p-3 bg-yellow-100 border border-yellow-300 rounded flex justify-between items-center">
                  <span className="text-sm font-bold text-yellow-900">Total Amount Paid</span>
                  <span className="font-mono font-bold text-yellow-900 text-lg">₹{totalAmountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="p-3 bg-blue-100 border border-blue-300 rounded flex justify-between items-center">
                  <span className="text-sm font-bold text-blue-900">Closing Amount</span>
                  <span className="font-mono font-bold text-blue-900 text-lg">₹{closingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 pt-6 border-t space-y-3">
            {isCloseBlocked && (
              <div className="flex items-center justify-between gap-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3">
                <div className="flex items-start gap-2 text-sm text-red-800">
                  <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold">Cannot close shift</div>
                    <div>
                      {blockingCount} purchase entr{blockingCount === 1 ? 'y is' : 'ies are'} still in <strong>NEW</strong> status. Mark them Consumed, In Stock, or Undefined first.
                    </div>
                  </div>
                </div>
                <Link
                  to="/production/purchase-wise"
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  Go to Raw Material
                </Link>
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCloseShift}
                disabled={saving || !activeShift || isCloseBlocked}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                title={isCloseBlocked ? 'Resolve NEW purchase entries before closing' : undefined}
              >
                <LockKeyhole className="w-5 h-5" />
                {saving ? 'Closing…' : 'Close Shift & Lock Transactions'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-300 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <LockKeyhole className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Shift Closed Successfully</h2>
          <p className="text-gray-600 mb-6">All transactions have been locked. Report is ready to print.</p>
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-sm text-gray-700">
              <div className="text-left">
                <span className="text-gray-600">Transfer Amount:</span>
                <span className="ml-2 font-semibold text-green-900">
                  ₹{transferDenominationTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button className="px-6 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium flex items-center gap-2 transition-colors">
              <Printer className="w-5 h-5" />
              Print Shift Report
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg font-medium transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};