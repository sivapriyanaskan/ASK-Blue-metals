import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Loader2, Save } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';
import { fuelConsumptionApi } from '../services/operationsApi';
import { suppliersApi, vehiclesApi, workCentresApi, driversApi, describeError } from '../services/mastersApi';

export const FuelConsumptionEdit = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [workCentreId, setWorkCentreId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [entryDateTime, setEntryDateTime] = useState('');
  const [meterStartReading, setMeterStartReading] = useState('');
  const [meterCurrentReading, setMeterCurrentReading] = useState('');
  const [fuelFilledQty, setFuelFilledQty] = useState('');
  const [ratePerLiter, setRatePerLiter] = useState('');
  const [paidAmount, setPaidAmount] = useState('0');
  const [remarks, setRemarks] = useState('');

  const [vehicleOptions, setVehicleOptions] = useState<{ label: string; value: string }[]>([]);
  const [driverOptions, setDriverOptions] = useState<{ label: string; value: string }[]>([]);
  const [workCentreOptions, setWorkCentreOptions] = useState<{ label: string; value: string }[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [row, vehicles, drivers, workCentres, suppliers] = await Promise.all([
          fuelConsumptionApi.get(id),
          vehiclesApi.list({ pageSize: 200, isActive: true }),
          driversApi.list({ pageSize: 200, isActive: true }),
          workCentresApi.list({ pageSize: 200, isActive: true }),
          suppliersApi.list({ pageSize: 200, isActive: true }),
        ]);

        setVehicleOptions(vehicles.items.map(v => ({ value: v.id, label: `${v.registrationNumber} - ${v.name}` })));
        setDriverOptions(drivers.items.map(d => ({ value: d.id, label: d.name })));
        setWorkCentreOptions(workCentres.items.map(w => ({ value: w.id, label: w.name })));
        setSupplierOptions(suppliers.items.map(s => ({ value: s.id, label: s.name })));

        setVehicleId(row.vehicleId);
        setDriverId(row.driverId ?? '');
        setWorkCentreId(row.workCentreId);
        setSupplierId(row.supplierId);
        setEntryDateTime(row.entryDateTime.slice(0, 16));
        setMeterStartReading(String(row.meterStartReading));
        setMeterCurrentReading(String(row.meterCurrentReading));
        setFuelFilledQty(String(row.fuelFilledQty));
        setRatePerLiter(String(row.ratePerLiter));
        setPaidAmount(String(row.paidAmount));
      } catch (err) {
        setError(describeError(err, 'Failed to load fuel entry'));
      } finally {
        setLoading(false);
      }
    };
    if (id) void load();
  }, [id]);

  const fuelAmount = useMemo(() => Number(fuelFilledQty || 0) * Number(ratePerLiter || 0), [fuelFilledQty, ratePerLiter]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await fuelConsumptionApi.update(id, {
        entryDateTime: entryDateTime ? new Date(entryDateTime).toISOString() : undefined,
        vehicleId,
        driverId: driverId || null,
        workCentreId,
        supplierId,
        meterStartReading: Number(meterStartReading),
        meterCurrentReading: Number(meterCurrentReading),
        fuelFilledQty: Number(fuelFilledQty),
        ratePerLiter: Number(ratePerLiter),
        paidAmount: Number(paidAmount || 0),
        remarks: remarks || null,
      });
      navigate(`/fuel/consumption/${id}`);
    } catch (err) {
      setError(describeError(err, 'Failed to save fuel entry'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 flex items-center gap-2 text-gray-600"><Loader2 className="w-5 h-5 animate-spin" /> Loading...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Edit Fuel Entry</h1>
      <p className="text-sm text-gray-500 mb-6">Update the entry details below and save.</p>
      {error && <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="bg-white border border-gray-300 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="datetime-local" value={entryDateTime} onChange={e => setEntryDateTime(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg" />
          <SearchableDropdown options={vehicleOptions} value={vehicleId} onValueChange={setVehicleId} placeholder="Select vehicle" />
          <SearchableDropdown options={[{ label: 'Not Selected', value: '' }, ...driverOptions]} value={driverId} onValueChange={setDriverId} placeholder="Select driver" />
          <SearchableDropdown options={workCentreOptions} value={workCentreId} onValueChange={setWorkCentreId} placeholder="Select work centre" />
          <SearchableDropdown options={supplierOptions} value={supplierId} onValueChange={setSupplierId} placeholder="Select supplier" />
          <input type="number" min="0" step="0.01" value={meterStartReading} onChange={e => setMeterStartReading(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg" />
          <input type="number" min="0" step="0.01" value={meterCurrentReading} onChange={e => setMeterCurrentReading(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg" />
          <input type="number" min="0" step="0.01" value={fuelFilledQty} onChange={e => setFuelFilledQty(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg" />
          <input type="number" min="0" step="0.01" value={ratePerLiter} onChange={e => setRatePerLiter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg" />
          <input type="number" min="0" step="0.01" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg" />
          <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2} className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-lg" placeholder="Remarks" />
          <div className="md:col-span-2 text-sm text-gray-600">Computed fuel amount: <span className="font-mono font-semibold">{fuelAmount.toFixed(2)}</span></div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
          </button>
          <button type="button" onClick={() => navigate(`/fuel/consumption/${id}`)} className="px-4 py-2 border border-gray-300 rounded-lg">Cancel</button>
        </div>
      </form>
    </div>
  );
};
