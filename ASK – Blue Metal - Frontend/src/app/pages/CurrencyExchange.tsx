import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Save, X, Loader2, Calendar } from 'lucide-react';
import {
  currencyExchangeApi,
  type CurrencyExchangeDetailInput,
} from '../services/operationsApi';
import { describeError } from '../services/mastersApi';

const denominationValues = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

interface DenomRow {
  denomination: number;
  nos: number;
  amount: number;
}

const emptyRows = (): DenomRow[] =>
  denominationValues.map((d) => ({ denomination: d, nos: 0, amount: 0 }));

const fromApiDetails = (rows: CurrencyExchangeDetailInput[]): DenomRow[] => {
  const map = new Map(rows.map((r) => [r.denomination, r]));
  return denominationValues.map((d) => {
    const r = map.get(d);
    return r
      ? { denomination: d, nos: Number(r.nos) || 0, amount: Number(r.amount) || 0 }
      : { denomination: d, nos: 0, amount: 0 };
  });
};

const toApiDetails = (rows: DenomRow[]): CurrencyExchangeDetailInput[] =>
  rows
    .filter((r) => r.nos > 0)
    .map((r) => ({ denomination: r.denomination, nos: r.nos, amount: r.amount }));

interface DenominationCardProps {
  title: string;
  subtitle: string;
  rows: DenomRow[];
  onChange: (rows: DenomRow[]) => void;
}

const DenominationCard = ({ title, subtitle, rows, onChange }: DenominationCardProps) => {
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const totalNos = rows.reduce((s, r) => s + r.nos, 0);
  const update = (denomination: number, nos: number) => {
    onChange(
      rows.map((r) =>
        r.denomination === denomination ? { ...r, nos, amount: r.denomination * nos } : r,
      ),
    );
  };
  return (
    <div className="bg-white rounded-lg border border-gray-300 p-6">
      <div className="mb-4">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.denomination} className="grid grid-cols-4 gap-3 items-center text-sm">
            <div className="font-medium text-gray-700">₹{r.denomination}</div>
            <div className="text-gray-500 text-center">×</div>
            <input
              type="number"
              min="0"
              value={r.nos || ''}
              onChange={(e) => update(r.denomination, parseInt(e.target.value, 10) || 0)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-center"
              placeholder="0"
            />
            <div className="font-mono text-gray-900 text-right">
              ₹{r.amount.toLocaleString('en-IN')}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
        <span className="text-sm text-gray-600">Total ({totalNos} notes)</span>
        <span className="text-lg font-bold text-gray-900">₹{total.toLocaleString('en-IN')}</span>
      </div>
    </div>
  );
};

export const CurrencyExchange = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));
  const [outRows, setOutRows] = useState<DenomRow[]>(emptyRows());
  const [inRows, setInRows] = useState<DenomRow[]>(emptyRows());

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    currencyExchangeApi
      .get(id)
      .then((row) => {
        setBillDate(new Date(row.billDateTime).toISOString().slice(0, 10));
        setOutRows(fromApiDetails(row.outDetails || []));
        setInRows(fromApiDetails(row.inDetails || []));
      })
      .catch((err) => setError(describeError(err, 'Failed to load entry')))
      .finally(() => setLoading(false));
  }, [id]);

  const totalOut = useMemo(() => outRows.reduce((s, r) => s + r.amount, 0), [outRows]);
  const totalIn = useMemo(() => inRows.reduce((s, r) => s + r.amount, 0), [inRows]);
  const difference = totalIn - totalOut;

  const handleSave = async () => {
    setError(null);
    if (totalOut === 0 && totalIn === 0) {
      setError('Enter at least one denomination on either side');
      return;
    }
    if (totalOut !== totalIn) {
      const msg = `Cash Out (₹${totalOut.toLocaleString('en-IN')}) and Cash In (₹${totalIn.toLocaleString(
        'en-IN',
      )}) do not match. Continue anyway?`;
      if (!window.confirm(msg)) return;
    }

    setSaving(true);
    try {
      const billDateTime = new Date(`${billDate}T00:00:00`).toISOString();
      if (isEdit && id) {
        await currencyExchangeApi.update(id, {
          billDateTime,
          outDetails: toApiDetails(outRows),
          inDetails: toApiDetails(inRows),
        });
      } else {
        await currencyExchangeApi.create({
          billDateTime,
          outDetails: toApiDetails(outRows),
          inDetails: toApiDetails(inRows),
        });
      }
      navigate('/currency-exchange');
    } catch (err) {
      setError(describeError(err, 'Failed to save currency exchange'));
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

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit' : 'New'} Currency Exchange
        </h1>
        <p className="text-sm text-gray-500">
          Record cash going out (paid) and cash coming in (received) by denomination.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-300 p-6 mb-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Difference (In − Out)</div>
            <div
              className={`text-2xl font-bold ${
                difference === 0
                  ? 'text-gray-900'
                  : difference > 0
                    ? 'text-green-600'
                    : 'text-red-600'
              }`}
            >
              ₹{difference.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <DenominationCard
          title="Cash Out (Paid)"
          subtitle="Denominations given to the bank / counter-party"
          rows={outRows}
          onChange={setOutRows}
        />
        <DenominationCard
          title="Cash In (Received)"
          subtitle="Denominations received in exchange"
          rows={inRows}
          onChange={setInRows}
        />
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => navigate('/currency-exchange')}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-60"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isEdit ? 'Save Changes' : 'Record Exchange'}
        </button>
      </div>
    </div>
  );
};
