import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Edit, Loader2 } from 'lucide-react';
import { fuelConsumptionApi, type FuelConsumptionRow } from '../services/operationsApi';
import { describeError } from '../services/mastersApi';

const fmt = (n: string | number, d = 2) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });

export const FuelConsumptionView = () => {
  const { id = '' } = useParams();
  const [row, setRow] = useState<FuelConsumptionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        setRow(await fuelConsumptionApi.get(id));
      } catch (err) {
        setError(describeError(err, 'Failed to load fuel entry'));
      } finally {
        setLoading(false);
      }
    };
    if (id) void load();
  }, [id]);

  const kmsRun = useMemo(() => {
    if (!row) return 0;
    return Number(row.meterCurrentReading) - Number(row.meterStartReading);
  }, [row]);

  const mileage = useMemo(() => {
    if (!row) return '-';
    const qty = Number(row.fuelFilledQty);
    if (qty <= 0) return '-';
    return (kmsRun / qty).toFixed(2);
  }, [row, kmsRun]);

  if (loading) {
    return <div className="p-6 flex items-center gap-2 text-gray-600"><Loader2 className="w-5 h-5 animate-spin" /> Loading...</div>;
  }

  if (error || !row) {
    return <div className="p-6 text-red-700">{error ?? 'Entry not found'}</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fuel Entry {row.entryNo}</h1>
          <p className="text-sm text-gray-500">Created on {new Date(row.entryDateTime).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/fuel/consumption" className="px-3 py-2 border rounded-lg inline-flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> Back</Link>
          <Link to={`/fuel/consumption/${row.id}/edit`} className="px-3 py-2 bg-blue-600 text-white rounded-lg inline-flex items-center gap-2"><Edit className="w-4 h-4" /> Edit</Link>
        </div>
      </div>

      <div className="bg-white border border-gray-300 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><div className="text-xs text-gray-500">Vehicle</div><div className="font-mono">{row.vehicleRegNoSnapshot}</div></div>
        <div><div className="text-xs text-gray-500">Driver</div><div>{row.driverNameSnapshot || '-'}</div></div>
        <div><div className="text-xs text-gray-500">Supplier</div><div>{row.supplierNameSnapshot}</div></div>
        <div><div className="text-xs text-gray-500">Status</div><div>{row.status}</div></div>
      </div>

      <div className="bg-white border border-gray-300 rounded-lg p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
        <div><div className="text-xs text-gray-500">Meter Start</div><div className="font-mono">{fmt(row.meterStartReading)}</div></div>
        <div><div className="text-xs text-gray-500">Meter Current</div><div className="font-mono">{fmt(row.meterCurrentReading)}</div></div>
        <div><div className="text-xs text-gray-500">Kms Run</div><div className="font-mono">{fmt(kmsRun)}</div></div>
        <div><div className="text-xs text-gray-500">Fuel Qty (L)</div><div className="font-mono">{fmt(row.fuelFilledQty)}</div></div>
        <div><div className="text-xs text-gray-500">Rate/L</div><div className="font-mono">{fmt(row.ratePerLiter)}</div></div>
        <div><div className="text-xs text-gray-500">Mileage</div><div className="font-mono">{mileage}</div></div>
        <div><div className="text-xs text-gray-500">Fuel Amount</div><div className="font-mono">{fmt(row.fuelAmount)}</div></div>
        <div><div className="text-xs text-gray-500">Total Expense</div><div className="font-mono">{fmt(row.totalExpenseAmount)}</div></div>
        <div><div className="text-xs text-gray-500">Paid Amount</div><div className="font-mono">{fmt(row.paidAmount)}</div></div>
      </div>
    </div>
  );
};
