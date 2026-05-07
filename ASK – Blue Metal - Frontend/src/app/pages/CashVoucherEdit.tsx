import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Save, X, Plus, Trash2, Loader2 } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';
import {
  cashVoucherApi,
  type VoucherType,
  type VoucherStatus,
  type CashVoucherLineInput,
  type CashVoucherDenominationInput,
} from '../services/operationsApi';
import {
  accountsApi,
  banksApi,
  describeError,
  type AccountRow,
  type BankRow,
} from '../services/mastersApi';
import { useAppContext } from '../context/AppContext';

type PaymentMode = 'CASH' | 'ONLINE' | 'CREDIT' | 'MIXED';

interface LineRow {
  uid: string;
  slNo: number;
  accountId: string;
  accountHeadNameSnapshot: string;
  description: string;
  amount: number;
  narration: string;
}

interface DenomRow {
  uid: string;
  denomination: number;
  nos: number;
  amount: number;
}

const denominationOptions = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

const newLine = (slNo: number): LineRow => ({
  uid: `${Date.now()}-${Math.random()}`,
  slNo,
  accountId: '',
  accountHeadNameSnapshot: '',
  description: '',
  amount: 0,
  narration: '',
});

const newDenom = (denomination: number): DenomRow => ({
  uid: `${Date.now()}-${Math.random()}`,
  denomination,
  nos: 0,
  amount: 0,
});

const parseLineDescription = (raw: string): { description: string; narration: string } => {
  const idx = raw.indexOf(' | Narration: ');
  if (idx >= 0) {
    return { description: raw.slice(0, idx), narration: raw.slice(idx + ' | Narration: '.length) };
  }
  return { description: raw, narration: '' };
};

export const CashVoucherEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAppContext();
  const isEdit = Boolean(id);

  const [voucherType, setVoucherType] = useState<VoucherType>('PAYMENT');
  const [docDate, setDocDate] = useState(new Date().toISOString().slice(0, 10));
  const [voucherNo, setVoucherNo] = useState('');
  const [drBalance, setDrBalance] = useState('0');
  const [crTotal, setCrTotal] = useState('0');

  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [bankId, setBankId] = useState<string>('');
  const [transactionNo, setTransactionNo] = useState('');

  const [preparedBy, setPreparedBy] = useState('');
  const [authorisedBy, setAuthorisedBy] = useState('');
  const [receivedByName, setReceivedByName] = useState('');

  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState<VoucherStatus>('DRAFT');

  const [lines, setLines] = useState<LineRow[]>([newLine(1)]);
  const [denoms, setDenoms] = useState<DenomRow[]>([newDenom(1), newDenom(2), newDenom(5)]);

  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [banks, setBanks] = useState<BankRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default Prepared By to logged-in user
  useEffect(() => {
    if (!preparedBy && user?.name) setPreparedBy(user.name);
  }, [user?.name, preparedBy]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [accRes, bankRes] = await Promise.all([
          accountsApi.list({ pageSize: 200 }),
          banksApi.list({ pageSize: 200 }),
        ]);
        if (cancelled) return;
        setAccounts(accRes.items.filter((a) => a.isActive !== false));
        setBanks(bankRes.items.filter((b) => b.isActive !== false));

        if (id) {
          const v = await cashVoucherApi.get(id);
          if (cancelled) return;
          setVoucherNo(v.voucherNo);
          setVoucherType(v.voucherType);
          setStatus(v.status);
          setDocDate(new Date(v.docDate).toISOString().slice(0, 10));
          setPaymentMode(v.paymentMode);
          setBankId(v.bankId ?? '');
          setTransactionNo(v.transactionNo ?? '');
          setRemarks(v.remarks ?? '');
          setLines(
            (v.lines || []).map((l, i) => {
              const parsed = parseLineDescription(l.description ?? '');
              return {
                uid: `${i}-${Math.random()}`,
                slNo: l.slNo,
                accountId: l.accountId ?? '',
                accountHeadNameSnapshot: l.accountHeadNameSnapshot,
                description: parsed.description,
                narration: parsed.narration,
                amount: Number(l.amount) || 0,
              };
            }),
          );
          if (v.denominations && v.denominations.length > 0) {
            setDenoms(
              v.denominations.map((d) => ({
                uid: `${d.denomination}-${Math.random()}`,
                denomination: Number(d.denomination),
                nos: Number(d.nos) || 0,
                amount: Number(d.amount) || 0,
              })),
            );
          }
        }
      } catch (err) {
        if (!cancelled) setError(describeError(err, 'Failed to load voucher data'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const accountOptions = useMemo(
    () => accounts.map((a) => ({ value: a.id, label: `${a.code} - ${a.name}` })),
    [accounts],
  );
  const bankOptions = useMemo(
    () => [
      { value: '', label: '— None —' },
      ...banks.map((b) => ({ value: b.id, label: `${b.code} – ${b.name}` })),
    ],
    [banks],
  );

  const denomDropdownOptions = useMemo(
    () => denominationOptions.map((d) => ({ value: String(d), label: `₹${d}` })),
    [],
  );

  const updateLine = (uid: string, patch: Partial<LineRow>) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.uid !== uid) return l;
        const next = { ...l, ...patch };
        if (patch.accountId !== undefined) {
          const acc = accounts.find((a) => a.id === patch.accountId);
          next.accountHeadNameSnapshot = acc?.name ?? '';
        }
        return next;
      }),
    );
  };

  const updateDenom = (uid: string, patch: Partial<DenomRow>) => {
    setDenoms((prev) =>
      prev.map((d) => {
        if (d.uid !== uid) return d;
        const next = { ...d, ...patch };
        next.amount = next.denomination * next.nos;
        return next;
      }),
    );
  };

  const addLine = () => setLines((prev) => [...prev, newLine(prev.length + 1)]);
  const removeLine = (uid: string) =>
    setLines((prev) => prev.filter((l) => l.uid !== uid).map((l, i) => ({ ...l, slNo: i + 1 })));

  const addDenom = () => {
    const used = new Set(denoms.map((d) => d.denomination));
    const next = denominationOptions.find((d) => !used.has(d)) ?? 1;
    setDenoms((prev) => [...prev, newDenom(next)]);
  };
  const removeDenom = (uid: string) =>
    setDenoms((prev) => prev.filter((d) => d.uid !== uid));

  const totalAmount = useMemo(
    () => lines.reduce((s, l) => s + Number(l.amount || 0), 0),
    [lines],
  );
  const denomTotal = useMemo(() => denoms.reduce((s, d) => s + d.amount, 0), [denoms]);

  const handleSave = async (publish: boolean) => {
    setError(null);

    if (lines.length === 0 || !lines.some((l) => l.amount > 0 && l.accountId)) {
      const missing: string[] = [];
      if (!lines.some((l) => !!l.accountId)) missing.push('select an Account Code');
      if (!lines.some((l) => Number(l.amount) > 0)) missing.push('enter an Amount greater than 0');
      setError(
        missing.length > 0
          ? `Please ${missing.join(' and ')} on at least one line item.`
          : 'Add at least one line with an account and amount',
      );
      return;
    }
    if ((paymentMode === 'ONLINE' || paymentMode === 'MIXED') && !bankId) {
      setError('Select a bank for online/mixed payments');
      return;
    }
    if (paymentMode === 'CASH' && denomTotal > 0 && Math.abs(denomTotal - totalAmount) > 0.5) {
      if (
        !window.confirm(
          `Denomination total (₹${denomTotal.toLocaleString('en-IN')}) does not match voucher total (₹${totalAmount.toLocaleString('en-IN')}). Continue?`,
        )
      )
        return;
    }

    const apiLines: CashVoucherLineInput[] = lines
      .filter((l) => l.accountId && l.amount > 0)
      .map((l, i) => ({
        slNo: i + 1,
        accountId: l.accountId,
        accountHeadNameSnapshot: l.accountHeadNameSnapshot,
        description: l.narration
          ? `${l.description}${l.description ? ' | ' : ''}Narration: ${l.narration}`
          : l.description || '',
        amount: Number(l.amount),
      }));
    const apiDenoms: CashVoucherDenominationInput[] = denoms
      .filter((d) => d.nos > 0)
      .map((d) => ({ denomination: d.denomination, nos: d.nos, amount: d.amount }));

    const remarksParts = [
      remarks.trim(),
      authorisedBy.trim() ? `Authorised By: ${authorisedBy.trim()}` : '',
      receivedByName.trim() ? `Received By: ${receivedByName.trim()}` : '',
      drBalance && Number(drBalance) !== 0 ? `Dr Balance: ${drBalance}` : '',
      crTotal && Number(crTotal) !== 0 ? `Cr Total: ${crTotal}` : '',
    ].filter(Boolean);
    const remarksValue = remarksParts.length ? remarksParts.join(' | ') : null;

    setSaving(true);
    try {
      if (isEdit && id) {
        await cashVoucherApi.update(id, {
          docDate: new Date(`${docDate}T00:00:00`).toISOString(),
          lines: apiLines,
          paymentMode,
          bankId: bankId || null,
          transactionNo: transactionNo || null,
          denominations: apiDenoms,
          remarks: remarksValue,
          status: publish ? 'POSTED' : status === 'POSTED' ? 'POSTED' : 'DRAFT',
        });
      } else {
        const created = await cashVoucherApi.create({
          voucherType,
          docDate: new Date(`${docDate}T00:00:00`).toISOString(),
          lines: apiLines,
          paymentMode,
          bankId: bankId || null,
          transactionNo: transactionNo || null,
          denominations: apiDenoms,
          preparedBySnapshot: preparedBy || user?.name || user?.username || 'system',
          remarks: remarksValue,
        });
        if (publish) {
          await cashVoucherApi.update(created.id, { status: 'POSTED' });
        }
      }
      navigate('/cash-voucher');
    } catch (err) {
      setError(describeError(err, 'Failed to save voucher'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading…
      </div>
    );
  }

  const showBank = paymentMode === 'ONLINE' || paymentMode === 'MIXED' || paymentMode === 'CREDIT';

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit' : 'Create'} Cash Voucher
        </h1>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Voucher Information */}
      <div className="bg-white rounded-lg border border-gray-300 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Voucher Information</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Voucher Type <span className="text-red-500">*</span>
            </label>
            <SearchableDropdown
              options={[
                { value: 'PAYMENT', label: 'Payment' },
                { value: 'RECEIPT', label: 'Receipt' },
              ]}
              value={voucherType}
              onValueChange={(v) => setVoucherType(v as VoucherType)}
              placeholder="Select type"
              disabled={isEdit}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Doc Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={docDate}
              onChange={(e) => setDocDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Voucher No <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              readOnly
              value={voucherNo || 'Auto-generated on save'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dr Balance</label>
            <input
              type="number"
              step="0.01"
              value={drBalance}
              onChange={(e) => setDrBalance(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cr Total</label>
            <input
              type="number"
              step="0.01"
              value={crTotal}
              onChange={(e) => setCrTotal(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Mode <span className="text-red-500">*</span>
            </label>
            <SearchableDropdown
              options={[
                { value: 'CASH', label: 'Cash' },
                { value: 'ONLINE', label: 'Online' },
                { value: 'CREDIT', label: 'Credit' },
                { value: 'MIXED', label: 'Mixed' },
              ]}
              value={paymentMode}
              onValueChange={(v) => setPaymentMode(v as PaymentMode)}
              placeholder="Select mode"
              className="w-full"
            />
          </div>
          {showBank && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank</label>
                <SearchableDropdown
                  options={bankOptions}
                  value={bankId}
                  onValueChange={setBankId}
                  placeholder="Select bank"
                  className="w-full"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Transaction No</label>
                <input
                  type="text"
                  value={transactionNo}
                  onChange={(e) => setTransactionNo(e.target.value)}
                  placeholder="Reference / UTR"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-lg border border-gray-300 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Line Items</h2>
          <button
            type="button"
            onClick={addLine}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            <Plus className="w-4 h-4" /> Add Line
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-300 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-3 py-2 text-left w-16">Sl No</th>
                <th className="px-3 py-2 text-left">
                  Account Code <span className="text-red-500">*</span>
                </th>
                <th className="px-3 py-2 text-left">Description</th>
                <th className="px-3 py-2 text-right w-32">
                  Amount <span className="text-red-500">*</span>
                </th>
                <th className="px-3 py-2 text-left">Narration</th>
                <th className="px-3 py-2 w-16 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {lines.map((l) => (
                <tr key={l.uid}>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      readOnly
                      value={l.slNo}
                      className="w-12 px-2 py-1.5 border border-gray-300 rounded text-sm text-center bg-gray-50"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <SearchableDropdown
                      options={accountOptions}
                      value={l.accountId}
                      onValueChange={(v) => updateLine(l.uid, { accountId: v })}
                      placeholder="Select account..."
                      searchPlaceholder="Search account..."
                      className="w-full"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={l.description}
                      onChange={(e) => updateLine(l.uid, { description: e.target.value })}
                      placeholder=""
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={l.amount || ''}
                      onChange={(e) => updateLine(l.uid, { amount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right font-mono"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={l.narration}
                      onChange={(e) => updateLine(l.uid, { narration: e.target.value })}
                      placeholder=""
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    {lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(l.uid)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Remove line"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-300">
              <tr>
                <td colSpan={3} className="px-3 py-3 text-right font-semibold">
                  Total Amount:
                </td>
                <td className="px-3 py-3 text-right font-mono text-blue-600 font-semibold">
                  ₹
                  {totalAmount.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Payment Details */}
      <div className="bg-white rounded-lg border border-gray-300 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Payment Details</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prepared By</label>
            <input
              type="text"
              value={preparedBy}
              onChange={(e) => setPreparedBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Prepared by"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Authorised By</label>
            <input
              type="text"
              value={authorisedBy}
              onChange={(e) => setAuthorisedBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Authorised by"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Received By Name</label>
            <input
              type="text"
              value={receivedByName}
              onChange={(e) => setReceivedByName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Received by name"
            />
          </div>
        </div>
      </div>

      {/* Paid Denominations */}
      <div className="bg-white rounded-lg border border-gray-300 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Paid Denominations</h2>
          <button
            type="button"
            onClick={addDenom}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            <Plus className="w-4 h-4" /> Add Row
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-3 py-2 text-left">
                  Denomination <span className="text-red-500">*</span>
                </th>
                <th className="px-3 py-2 text-left">
                  Nos <span className="text-red-500">*</span>
                </th>
                <th className="px-3 py-2 text-left">Amount</th>
                <th className="px-3 py-2 w-16 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {denoms.map((d) => (
                <tr key={d.uid}>
                  <td className="px-3 py-2">
                    <SearchableDropdown
                      options={denomDropdownOptions}
                      value={String(d.denomination)}
                      onValueChange={(v) =>
                        updateDenom(d.uid, { denomination: parseInt(v, 10) || 1 })
                      }
                      placeholder="Select"
                      className="w-full"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      value={d.nos || ''}
                      onChange={(e) =>
                        updateDenom(d.uid, { nos: parseInt(e.target.value, 10) || 0 })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      readOnly
                      value={`₹${d.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeDenom(d.uid)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                      title="Remove row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={2} className="px-3 py-2 text-right font-semibold">
                  Denom Total:
                </td>
                <td className="px-3 py-2 font-mono font-semibold">
                  ₹{denomTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Remarks */}
      <div className="bg-white rounded-lg border border-gray-300 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Remarks</h2>
        <textarea
          rows={3}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Optional notes about this voucher"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => navigate('/cash-voucher')}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-60"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
        <button
          type="button"
          onClick={() => handleSave(false)}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-white border border-blue-600 text-blue-700 rounded-lg hover:bg-blue-50 disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save as Draft
        </button>
        <button
          type="button"
          onClick={() => handleSave(true)}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save &amp; Post
        </button>
      </div>
    </div>
  );
};

export default CashVoucherEdit;
