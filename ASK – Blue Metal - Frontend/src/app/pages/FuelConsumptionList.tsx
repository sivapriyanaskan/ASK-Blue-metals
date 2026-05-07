import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Plus, Search, Eye, Edit, Loader2 } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';
import { fuelConsumptionApi, type FuelConsumptionRow } from '../services/operationsApi';
import { suppliersApi, vehiclesApi, workCentresApi, describeError } from '../services/mastersApi';

const fmtNum = (s: string | number, d = 2) => Number(s).toFixed(d);
const fmtMoney = (s: string | number) => '₹' + Number(s).toLocaleString('en-IN', { minimumFractionDigits: 2 });

export const FuelConsumptionList = () => {
  const [rows, setRows] = useState<FuelConsumptionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [workCentreFilter, setWorkCentreFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [vehicleOptions, setVehicleOptions] = useState<{ label: string; value: string }[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<{ label: string; value: string }[]>([]);
  const [wcOptions, setWcOptions] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    vehiclesApi.list({ pageSize: 200 }).then(r =>
      setVehicleOptions(r.items.map(v => ({ label: `${v.registrationNumber} – ${v.name}`, value: v.id })))
    ).catch(() => {});
    suppliersApi.list({ pageSize: 200 }).then(r =>
      setSupplierOptions(r.items.map(s => ({ label: s.name, value: s.id })))
    ).catch(() => {});
    workCentresApi.list({ pageSize: 100 }).then(r =>
      setWcOptions(r.items.map(w => ({ label: w.name, value: w.id })))
    ).catch(() => {});
  }, []);

  const reload = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fuelConsumptionApi.list({
        pageSize: 200,
        vehicleId: vehicleFilter || undefined,
        supplierId: supplierFilter || undefined,
        workCentreId: workCentreFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setRows(res.items);
    } catch (err) { setError(describeError(err, 'Failed to load fuel entries')); }
    finally { setLoading(false); }
  };

  useEffect(() => { void reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [vehicleFilter, supplierFilter, workCentreFilter, dateFrom, dateTo]);

  const filteredEntries = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const q = searchTerm.toLowerCase();
    return rows.filter(r =>
      r.entryNo.toLowerCase().includes(q) ||
      r.vehicleRegNoSnapshot.toLowerCase().includes(q) ||
      (r.driverNameSnapshot ?? '').toLowerCase().includes(q)
    );
  }, [rows, searchTerm]);

  const kmsRun = (r: FuelConsumptionRow) => Number(r.meterCurrentReading) - Number(r.meterStartReading);
  const mileage = (r: FuelConsumptionRow) => {
    const km = kmsRun(r); const qty = Number(r.fuelFilledQty);
    return qty > 0 ? (km / qty).toFixed(2) : '—';
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fuel Consumption</h1>
          <p className="text-sm text-muted-foreground">Fuel fill records for all vehicles.</p>
        </div>
        <Link
          to="/fuel/consumption/create"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Fuel Entry
        </Link>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="bg-white rounded-lg border border-gray-300 mb-6 p-4">
        <div className="grid grid-cols-4 gap-3 mb-3">
          <div className="col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by Entry No, Vehicle, Driver…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <SearchableDropdown
            options={[{ value: '', label: 'All Vehicles' }, ...vehicleOptions]}
            value={vehicleFilter}
            onValueChange={setVehicleFilter}
            placeholder="All Vehicles"
          />
          <SearchableDropdown
            options={[{ value: '', label: 'All Work Centres' }, ...wcOptions]}
            value={workCentreFilter}
            onValueChange={setWorkCentreFilter}
            placeholder="All Work Centres"
          />
          <SearchableDropdown
            options={[{ value: '', label: 'All Suppliers' }, ...supplierOptions]}
            value={supplierFilter}
            onValueChange={setSupplierFilter}
            placeholder="All Suppliers"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-300">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entry No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date &amp; Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty (L)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate/L</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Kms Run</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Mileage</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEntries.map(entry => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-blue-600">{entry.entryNo}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{new Date(entry.entryDateTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      <div className="text-xs text-gray-500">{new Date(entry.entryDateTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono font-medium text-gray-900">{entry.vehicleRegNoSnapshot}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">{entry.driverNameSnapshot ?? <span className="text-gray-400 italic">—</span>}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-[200px] truncate">{entry.supplierNameSnapshot}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-mono">{fmtNum(entry.fuelFilledQty)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-mono">{fmtMoney(entry.ratePerLiter)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-mono font-bold text-gray-900">{fmtMoney(entry.fuelAmount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-mono">{kmsRun(entry)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-mono font-medium text-green-600">{mileage(entry)} km/L</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link to={`/fuel/consumption/${entry.id}`} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="View">
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link to={`/fuel/consumption/${entry.id}/edit`} className="p-1 text-amber-600 hover:bg-amber-50 rounded" title="Edit">
                          <Edit className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filteredEntries.length === 0 && (
          <div className="text-center py-12 text-gray-500">No fuel entries found</div>
        )}
        <div className="border-t border-gray-300 px-6 py-3 bg-gray-50 text-sm text-gray-600">
          Showing {filteredEntries.length} of {rows.length} entries
        </div>
      </div>
    </div>
  );
};
