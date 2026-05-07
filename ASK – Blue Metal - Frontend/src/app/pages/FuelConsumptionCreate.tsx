import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ChevronDown, ChevronUp, Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';
import { useAppContext } from '../context/AppContext';
import {
  fuelConsumptionApi,
  type FuelExpenseInput,
} from '../services/operationsApi';
import {
  describeError,
  driversApi,
  suppliersApi,
  vehiclesApi,
  workCentresApi,
} from '../services/mastersApi';

interface ExpenseRow {
  uid: string;
  slNo: number;
  expenseHead: string;
  supplierName: string;
  amount: string;
  paid: string;
}

const newExpense = (slNo: number): ExpenseRow => ({
  uid: `${Date.now()}-${Math.random()}`,
  slNo,
  expenseHead: '',
  supplierName: '',
  amount: '',
  paid: '',
});

const formatDateTime = (value: string) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const FuelConsumptionCreate = () => {
  const navigate = useNavigate();
  const { user } = useAppContext();

  // Header
  const [entryDateTime, setEntryDateTime] = useState(
    new Date().toISOString().slice(0, 16),
  );
  const [referenceNo, setReferenceNo] = useState('');
  const [indentNo, setIndentNo] = useState('');
  const [billNo, setBillNo] = useState('');
  const [remarks, setRemarks] = useState('');

  // Vehicle & Driver
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [driverNameSnapshot, setDriverNameSnapshot] = useState('');
  const [workCentreId, setWorkCentreId] = useState('');
  const [filledBy, setFilledBy] = useState('');

  // Supplier
  const [supplierId, setSupplierId] = useState('');

  // Meter / Hour
  const [meterStartReading, setMeterStartReading] = useState('');
  const [meterCurrentReading, setMeterCurrentReading] = useState('');
  const [hourStartReading, setHourStartReading] = useState('');
  const [hourCurrentReading, setHourCurrentReading] = useState('');
  const [lastFuelMeterReading, setLastFuelMeterReading] = useState('');

  // Fuel
  const [fuelFilledQty, setFuelFilledQty] = useState('');
  const [ratePerLiter, setRatePerLiter] = useState('');
  const [preparedBy, setPreparedBy] = useState('');
  const [currentMeterReadingFuelFilled, setCurrentMeterReadingFuelFilled] = useState('');

  // Payment
  const [paidAmount, setPaidAmount] = useState('');

  // Expenses
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);

  // Options
  const [vehicleOptions, setVehicleOptions] = useState<{ label: string; value: string }[]>([]);
  const [driverOptions, setDriverOptions] = useState<{ label: string; value: string }[]>([]);
  const [workCentreOptions, setWorkCentreOptions] = useState<{ label: string; value: string }[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<{ label: string; value: string }[]>([]);
  const [vehicleMap, setVehicleMap] = useState<Record<string, { workCentreId?: string; lastFuelMeter?: number }>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calcOpen, setCalcOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [vehicles, drivers, workCentres, suppliers] = await Promise.all([
          vehiclesApi.list({ pageSize: 200, isActive: true }),
          driversApi.list({ pageSize: 200, isActive: true }),
          workCentresApi.list({ pageSize: 200, isActive: true }),
          suppliersApi.list({ pageSize: 200, isActive: true }),
        ]);
        if (cancelled) return;
        setVehicleOptions(
          vehicles.items.map((v) => ({
            value: v.id,
            label: `${v.registrationNumber} - ${v.name}`,
          })),
        );
        const map: Record<string, { workCentreId?: string; lastFuelMeter?: number }> = {};
        vehicles.items.forEach((v: any) => {
          map[v.id] = {
            workCentreId: v.workCentreId,
            lastFuelMeter: v.lastFuelFilledMeter ? Number(v.lastFuelFilledMeter) : undefined,
          };
        });
        setVehicleMap(map);
        setDriverOptions(drivers.items.map((d) => ({ value: d.id, label: d.name })));
        setWorkCentreOptions(workCentres.items.map((w) => ({ value: w.id, label: w.name })));
        setSupplierOptions(suppliers.items.map((s) => ({ value: s.id, label: s.name })));
      } catch (err) {
        if (!cancelled) setError(describeError(err, 'Failed to load form data'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Default Prepared By to the logged-in user
  useEffect(() => {
    if (!preparedBy && user?.username) setPreparedBy(user.username);
  }, [user?.username, preparedBy]);

  // Auto-populate workCentre + lastFuelMeter from vehicle
  const handleVehicleChange = (id: string) => {
    setVehicleId(id);
    const meta = vehicleMap[id];
    if (meta?.workCentreId && !workCentreId) setWorkCentreId(meta.workCentreId);
    if (meta?.lastFuelMeter !== undefined) {
      setLastFuelMeterReading(String(meta.lastFuelMeter));
      if (!meterStartReading) setMeterStartReading(String(meta.lastFuelMeter));
    }
  };

  const handleDriverChange = (id: string) => {
    setDriverId(id);
    const found = driverOptions.find((o) => o.value === id);
    setDriverNameSnapshot(found?.label ?? '');
  };

  // Computeds
  const kmsRun = useMemo(() => {
    const a = Number(meterCurrentReading || 0);
    const b = Number(meterStartReading || 0);
    return a > b ? a - b : 0;
  }, [meterCurrentReading, meterStartReading]);

  const hoursRun = useMemo(() => {
    const a = Number(hourCurrentReading || 0);
    const b = Number(hourStartReading || 0);
    return a > b ? a - b : 0;
  }, [hourCurrentReading, hourStartReading]);

  const fuelAmount = useMemo(
    () => Number(fuelFilledQty || 0) * Number(ratePerLiter || 0),
    [fuelFilledQty, ratePerLiter],
  );

  const mileageValue = useMemo(() => {
    const last = Number(lastFuelMeterReading || 0);
    const curr = Number(currentMeterReadingFuelFilled || 0);
    const q = Number(fuelFilledQty || 0);
    if (q <= 0) return 0;
    if (curr > last && last > 0) return (curr - last) / q;
    return kmsRun > 0 ? kmsRun / q : 0;
  }, [lastFuelMeterReading, currentMeterReadingFuelFilled, fuelFilledQty, kmsRun]);

  const additionalExpenses = useMemo(
    () => expenses.reduce((s, e) => s + Number(e.amount || 0), 0),
    [expenses],
  );

  const additionalPaid = useMemo(
    () => expenses.reduce((s, e) => s + Number(e.paid || 0), 0),
    [expenses],
  );

  const totalExpenseAmount = fuelAmount + additionalExpenses;
  const totalPaidAmount = Number(paidAmount || 0) + additionalPaid;

  const updateExpense = (uid: string, patch: Partial<ExpenseRow>) =>
    setExpenses((prev) => prev.map((e) => (e.uid === uid ? { ...e, ...patch } : e)));
  const addExpense = () => setExpenses((prev) => [...prev, newExpense(prev.length + 1)]);
  const removeExpense = (uid: string) =>
    setExpenses((prev) => prev.filter((e) => e.uid !== uid).map((e, i) => ({ ...e, slNo: i + 1 })));

  const handleSubmit = async (publish: boolean) => {
    setError(null);
    if (!referenceNo.trim()) {
      setError('Reference No is required');
      return;
    }
    if (!vehicleId || !workCentreId || !supplierId) {
      setError('Vehicle, work centre and supplier are required');
      return;
    }
    if (!fuelFilledQty || Number(fuelFilledQty) <= 0) {
      setError('Fuel filled quantity must be greater than zero');
      return;
    }
    if (!ratePerLiter || Number(ratePerLiter) <= 0) {
      setError('Rate per litre must be greater than zero');
      return;
    }

    const apiExpenses: FuelExpenseInput[] = expenses
      .filter((e) => e.expenseHead.trim() && Number(e.amount) > 0)
      .map((e, i) => ({
        slNo: i + 1,
        expenseHead: e.expenseHead.trim(),
        supplierName: e.supplierName.trim() || undefined,
        amount: Number(e.amount),
        paid: Number(e.paid || 0),
      }));

    const remarksParts = [
      remarks.trim(),
      indentNo.trim() ? `Indent: ${indentNo.trim()}` : '',
      billNo.trim() ? `Bill: ${billNo.trim()}` : '',
      filledBy.trim() ? `Filled by: ${filledBy.trim()}` : '',
      preparedBy.trim() && preparedBy.trim() !== (user?.username ?? '')
        ? `Prepared by: ${preparedBy.trim()}`
        : '',
      hourStartReading ? `Hr start: ${hourStartReading}` : '',
      hourCurrentReading ? `Hr current: ${hourCurrentReading}` : '',
      currentMeterReadingFuelFilled
        ? `Curr meter (fuel filled): ${currentMeterReadingFuelFilled}`
        : '',
    ].filter(Boolean);

    setSaving(true);
    try {
      const created = await fuelConsumptionApi.create({
        entryDateTime: entryDateTime ? new Date(entryDateTime).toISOString() : undefined,
        vehicleId,
        driverId: driverId || null,
        driverNameSnapshot: driverNameSnapshot || null,
        workCentreId,
        supplierId,
        referenceNo: referenceNo || null,
        meterStartReading: Number(meterStartReading || 0),
        meterCurrentReading: Number(meterCurrentReading || 0),
        fuelFilledQty: Number(fuelFilledQty),
        ratePerLiter: Number(ratePerLiter),
        expenses: apiExpenses,
        paidAmount: Number(paidAmount || 0),
        remarks: remarksParts.length ? remarksParts.join(' | ') : null,
      });
      if (publish) {
        await fuelConsumptionApi.update(created.id, { status: 'POSTED' });
      }
      navigate('/fuel/consumption');
    } catch (err) {
      setError(describeError(err, 'Failed to create fuel entry'));
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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Create Fuel Entry</h1>
        <Link
          to="/fuel/consumption"
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <X className="w-5 h-5" />
          Cancel
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {/* Header Information */}
          <div className="bg-white border border-gray-300 rounded-lg p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Header Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entry No <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  readOnly
                  value="Auto-generated"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entry Date &amp; Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={entryDateTime}
                  onChange={(e) => setEntryDateTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference No <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  placeholder="Enter reference number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Indent No</label>
                <input
                  type="text"
                  value={indentNo}
                  onChange={(e) => setIndentNo(e.target.value)}
                  placeholder="Enter indent number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bill No</label>
                <input
                  type="text"
                  value={billNo}
                  onChange={(e) => setBillNo(e.target.value)}
                  placeholder="Enter bill number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter remarks"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Vehicle & Driver Details */}
          <div className="bg-white border border-gray-300 rounded-lg p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Vehicle &amp; Driver Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle <span className="text-red-500">*</span>
                </label>
                <SearchableDropdown
                  options={vehicleOptions}
                  value={vehicleId}
                  onValueChange={handleVehicleChange}
                  placeholder="Select Vehicle"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Driver</label>
                <SearchableDropdown
                  options={[{ label: 'Select Driver', value: '' }, ...driverOptions]}
                  value={driverId}
                  onValueChange={handleDriverChange}
                  placeholder="Select Driver"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Work Centre <span className="text-red-500">*</span>
                </label>
                <SearchableDropdown
                  options={workCentreOptions}
                  value={workCentreId}
                  onValueChange={setWorkCentreId}
                  placeholder="Select Work Centre"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filled By</label>
                <input
                  type="text"
                  value={filledBy}
                  onChange={(e) => setFilledBy(e.target.value)}
                  placeholder="Enter person who filled"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Supplier */}
          <div className="bg-white border border-gray-300 rounded-lg p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Supplier (Fuel Station)</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier <span className="text-red-500">*</span>
                </label>
                <SearchableDropdown
                  options={supplierOptions}
                  value={supplierId}
                  onValueChange={setSupplierId}
                  placeholder="Select Supplier"
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Meter / Hour Readings */}
          <div className="bg-white border border-gray-300 rounded-lg p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Meter / Hour Readings</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meter Start Reading <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={meterStartReading}
                  onChange={(e) => setMeterStartReading(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meter Current Reading <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={meterCurrentReading}
                  onChange={(e) => setMeterCurrentReading(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hour Start Reading</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={hourStartReading}
                  onChange={(e) => setHourStartReading(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hour Current Reading</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={hourCurrentReading}
                  onChange={(e) => setHourCurrentReading(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kms Run (Computed)</label>
                <input
                  type="text"
                  readOnly
                  value={kmsRun.toFixed(2)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-blue-50 font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hours Run (Computed)</label>
                <input
                  type="text"
                  readOnly
                  value={hoursRun.toFixed(2)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-blue-50 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Fuel Details */}
          <div className="bg-white border border-gray-300 rounded-lg p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Fuel Details</h2>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fuel Filled Qty (Liters) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={fuelFilledQty}
                  onChange={(e) => setFuelFilledQty(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rate Per Liter <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={ratePerLiter}
                  onChange={(e) => setRatePerLiter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Amount (Computed)</label>
                <input
                  type="text"
                  readOnly
                  value={`₹${fuelAmount.toFixed(2)}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paid</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="0.00"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Prepared By</label>
                <input
                  type="text"
                  value={preparedBy}
                  onChange={(e) => setPreparedBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Prepared by"
                />
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Meter Reading When Fuel Filled</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Meter Reading</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={lastFuelMeterReading}
                    onChange={(e) => setLastFuelMeterReading(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Meter Reading</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={currentMeterReadingFuelFilled}
                    onChange={(e) => setCurrentMeterReadingFuelFilled(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mileage (Computed)</label>
                  <input
                    type="text"
                    readOnly
                    value={`${mileageValue.toFixed(2)} km/L`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-green-50 text-green-700 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Additional Expenses */}
          <div className="bg-white border border-gray-300 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Additional Expenses</h2>
              <button
                type="button"
                onClick={addExpense}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50 rounded-lg"
              >
                <Plus className="w-4 h-4" /> Add Expense
              </button>
            </div>
            {expenses.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-10 text-center">
                <Plus className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <div className="text-sm text-gray-700 font-medium">No additional expenses added</div>
                <div className="text-xs text-gray-500 mt-1">
                  Click "Add Expense" button above to add expense entries
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-300 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-3 py-2 text-left w-12">#</th>
                      <th className="px-3 py-2 text-left">Expense Head</th>
                      <th className="px-3 py-2 text-left">Supplier</th>
                      <th className="px-3 py-2 text-right w-32">Amount (₹)</th>
                      <th className="px-3 py-2 text-right w-32">Paid (₹)</th>
                      <th className="px-3 py-2 w-12" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {expenses.map((e) => (
                      <tr key={e.uid}>
                        <td className="px-3 py-2 text-sm">{e.slNo}</td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={e.expenseHead}
                            onChange={(ev) => updateExpense(e.uid, { expenseHead: ev.target.value })}
                            placeholder="e.g. Toll, Parking"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={e.supplierName}
                            onChange={(ev) => updateExpense(e.uid, { supplierName: ev.target.value })}
                            placeholder="Optional"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={e.amount}
                            onChange={(ev) => updateExpense(e.uid, { amount: ev.target.value })}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right font-mono"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={e.paid}
                            onChange={(ev) => updateExpense(e.uid, { paid: ev.target.value })}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right font-mono"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeExpense(e.uid)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Summary */}
          <div className="bg-white border border-gray-300 rounded-lg p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Payment Summary</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Paid Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono"
                />
              </div>
              <div className="pt-2 border-t border-gray-200 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Fuel Amount:</span>
                  <span className="font-mono">₹{fuelAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Additional Expenses:</span>
                  <span className="font-mono">₹{additionalExpenses.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="font-semibold">Total Expense Amount:</span>
                  <span className="font-mono font-semibold">₹{totalExpenseAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span className="font-semibold">Total Paid Amount:</span>
                  <span className="font-mono font-semibold">₹{totalPaidAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* System Information */}
          <div className="bg-white border border-gray-300 rounded-lg p-6">
            <h2 className="font-semibold text-gray-900 mb-4">System Information</h2>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-gray-500">Prepared By</div>
                <div className="font-medium text-gray-900">{preparedBy || user.username || user.name}</div>
              </div>
              <div>
                <div className="text-gray-500">Entry User</div>
                <div className="font-medium text-gray-900">{user.name}</div>
              </div>
              <div>
                <div className="text-gray-500">Entry Date</div>
                <div className="font-medium text-gray-900">{formatDateTime(entryDateTime)}</div>
              </div>
            </div>
          </div>

          {/* Calculation Breakdown */}
          <div className="bg-white border border-gray-300 rounded-lg">
            <button
              type="button"
              onClick={() => setCalcOpen((v) => !v)}
              className="w-full flex items-center justify-between p-4 font-semibold text-gray-900"
            >
              <span>Calculation Breakdown</span>
              {calcOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {calcOpen && (
              <div className="px-4 pb-4 space-y-2 text-sm border-t border-gray-200 pt-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Kms Run</span>
                  <span className="font-mono">{kmsRun.toFixed(2)} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Mileage</span>
                  <span className="font-mono">{mileageValue.toFixed(2)} km/L</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fuel × Rate</span>
                  <span className="font-mono">
                    {Number(fuelFilledQty || 0).toFixed(2)} × ₹{Number(ratePerLiter || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fuel Amount</span>
                  <span className="font-mono">₹{fuelAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">+ Additional Expenses</span>
                  <span className="font-mono">₹{additionalExpenses.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200 font-semibold">
                  <span>Total Expense</span>
                  <span className="font-mono">₹{totalExpenseAmount.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Entry
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60 font-medium"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save &amp; Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FuelConsumptionCreate;
