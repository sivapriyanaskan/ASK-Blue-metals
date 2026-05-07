import { useEffect, useMemo, useState } from 'react';
import { Calendar, Loader2 } from 'lucide-react';
import { tokenApi, purchaseBillApi, type TokenRow, type PurchaseBillRow } from '../services/operationsApi';
import { vehiclesApi, describeError, type VehicleRow } from '../services/mastersApi';
import { SearchableDropdown, type SearchableDropdownOption } from '../components/ui/searchable-dropdown';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN');

interface Trip {
  date: string;
  docNo: string;
  type: 'Sales' | 'Purchase';
  party: string;
  item: string;
  netWeight: number;
  driver: string;
}

export const VehicleHistory = () => {
  const [vehicleRegNo, setVehicleRegNo] = useState('');
  const [dateFrom, setDateFrom] = useState('2026-03-01');
  const [dateTo, setDateTo] = useState('2026-03-31');
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    vehiclesApi.list({ pageSize: 200 }).then(r => setVehicles(r.items)).catch(() => {});
  }, []);

  const load = async () => {
    if (!vehicleRegNo) { setTrips([]); return; }
    setLoading(true); setError(null);
    try {
      const [tokensRes, pbRes] = await Promise.all([
        tokenApi.list({ search: vehicleRegNo, dateFrom, dateTo, pageSize: 200 }),
        purchaseBillApi.list({ search: vehicleRegNo, dateFrom, dateTo, pageSize: 200 } as any),
      ]);
      const salesTrips: Trip[] = (tokensRes.items as TokenRow[])
        .map((t) => ({
          date: t.tokenDateTime,
          docNo: t.entryNo,
          type: 'Sales' as const,
          party: t.customer.name,
          item: t.item.name,
          netWeight: Number(t.emptyWeight),
          driver: t.driverName ?? '—',
        }));
      const purchaseTrips: Trip[] = (pbRes.items as PurchaseBillRow[])
        .map((b) => ({
          date: b.purchaseDateTime,
          docNo: b.purchaseNo,
          type: 'Purchase' as const,
          party: b.supplierNameSnapshot,
          item: b.itemNameSnapshot,
          netWeight: Number(b.netWeight),
          driver: '—',
        }));
      setTrips([...salesTrips, ...purchaseTrips].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    } catch (e) { setError(describeError(e, 'Failed to load vehicle history')); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [vehicleRegNo, dateFrom, dateTo]);

  const totalWeight = useMemo(() => trips.reduce((s, t) => s + t.netWeight, 0), [trips]);
  const salesTrips = useMemo(() => trips.filter(t => t.type === 'Sales').length, [trips]);
  const purchTrips = useMemo(() => trips.filter(t => t.type === 'Purchase').length, [trips]);

  const vehOpts: SearchableDropdownOption[] = [
    { value: '', label: 'Select Vehicle' },
    ...vehicles.map(v => ({ value: v.registrationNumber, label: v.registrationNumber, description: v.name })),
  ];

  return (
    <div className="p-6">
      <div className="mb-4 pb-3 border-b border-gray-300">
        <h1 className="text-xl font-bold text-gray-900">Vehicle History</h1>
        <p className="text-sm text-gray-500">All trips (sales + purchase) for a vehicle from DB</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-300 p-4 mb-4">
        <div className="grid grid-cols-4 gap-3">
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Vehicle</label>
            <SearchableDropdown options={vehOpts} value={vehicleRegNo} onValueChange={setVehicleRegNo} placeholder="Select Vehicle" /></div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
            <div className="relative"><Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded" /></div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
            <div className="relative"><Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded" /></div>
          </div>
          <div className="flex items-end"><button onClick={load} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded text-sm">Search</button></div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-4">
        {([['Total Trips', String(trips.length)], ['Sales Trips', String(salesTrips)], ['Purchase Trips', String(purchTrips)], ['Total Weight (T)', totalWeight.toFixed(2)]] as [string,string][]).map(([l,v])=>(
          <div key={l} className="bg-white rounded-lg border border-gray-300 p-3"><div className="text-xs text-gray-500">{l}</div><div className="text-xl font-bold text-gray-900">{v}</div></div>
        ))}
      </div>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>}
      {!vehicleRegNo && <div className="bg-white rounded-lg border border-gray-300 p-12 text-center text-gray-400">Select a vehicle to view history</div>}
      {vehicleRegNo && (
        <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
          {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" /><span>Loading...</span></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-300">
                  <tr>{['Date','Doc No','Type','Party','Item','Net Wt (T)','Driver'].map(h=><th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {trips.length === 0 ? <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400">No trips found</td></tr>
                  : trips.map((t,i)=>(
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap">{fmtDate(t.date)}</td>
                      <td className="px-3 py-2 font-medium text-blue-600">{t.docNo}</td>
                      <td className="px-3 py-2"><span className={t.type==='Sales'?'px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700':'px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700'}>{t.type}</span></td>
                      <td className="px-3 py-2 max-w-32 truncate">{t.party}</td>
                      <td className="px-3 py-2 max-w-28 truncate">{t.item}</td>
                      <td className="px-3 py-2 text-right">{t.netWeight.toFixed(2)}</td>
                      <td className="px-3 py-2">{t.driver}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
