import { useEffect, useMemo, useState } from 'react';
import { Calendar, Fuel, Download, Printer, TrendingUp, Loader2 } from 'lucide-react';
import { SearchableDropdown, type SearchableDropdownOption } from '../components/ui/searchable-dropdown';
import { fuelConsumptionApi, type FuelConsumptionRow } from '../services/operationsApi';
import { describeError } from '../services/mastersApi';
import { downloadReportCSV, printReport, inr, fmtDateISO, isNumericHeader, type ReportColumn, currentMonthStart, currentMonthEnd } from '../utils/reportExport';

export const FuelRegister = () => {
  const [dateFrom, setDateFrom] = useState(currentMonthStart());
  const [dateTo, setDateTo] = useState(currentMonthEnd());
  const [vehicleNo, setVehicleNo] = useState('');
  const [records, setRecords] = useState<FuelConsumptionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fuelConsumptionApi.list({ dateFrom, dateTo, pageSize: 200 });
      setRecords(res.items);
    } catch (e) { setError(describeError(e, 'Failed to load fuel records')); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [dateFrom, dateTo]);

  const filtered = useMemo(() => records.filter(r => !vehicleNo || r.vehicleRegNoSnapshot === vehicleNo), [records, vehicleNo]);

  const totals = useMemo(() => filtered.reduce((a, r) => ({
    qty: a.qty + Number(r.fuelFilledQty),
    amount: a.amount + Number(r.fuelAmount),
    expense: a.expense + Number(r.totalExpenseAmount),
    paid: a.paid + Number(r.paidAmount),
  }), { qty: 0, amount: 0, expense: 0, paid: 0 }), [filtered]);
  const avgRate = totals.qty > 0 ? totals.amount / totals.qty : 0;
  const uniqueVehicles = new Set(filtered.map(r => r.vehicleRegNoSnapshot)).size;

  const vehicleOpts: SearchableDropdownOption[] = [
    { value: '', label: 'All Vehicles' },
    ...Array.from(new Set(records.map(r => r.vehicleRegNoSnapshot))).filter(Boolean).map(v => ({ value: v, label: v })),
  ];

  const columns: ReportColumn<FuelConsumptionRow>[] = [
    { header: 'Entry No', value: r => r.entryNo },
    { header: 'Date', value: r => fmtDateISO(r.entryDateTime) },
    { header: 'Vehicle', value: r => r.vehicleRegNoSnapshot },
    { header: 'Driver', value: r => r.driverNameSnapshot ?? '-' },
    { header: 'Supplier', value: r => r.supplierNameSnapshot },
    { header: 'Qty (L)', value: r => Number(r.fuelFilledQty).toFixed(2), align: 'right' },
    { header: 'Rate', value: r => inr(r.ratePerLiter), align: 'right' },
    { header: 'Amount', value: r => inr(r.fuelAmount), align: 'right' },
    { header: 'Meter (KM)', value: r => Number(r.meterCurrentReading).toFixed(0), align: 'right' },
    { header: 'Status', value: r => r.status },
  ];
  const meta = () => ({
    title: 'Fuel Register',
    subtitle: [
      `From ${fmtDateISO(dateFrom)} to ${fmtDateISO(dateTo)}`,
      vehicleNo ? `Vehicle: ${vehicleNo}` : 'All Vehicles',
    ],
    totals: ['', '', '', '', 'TOTALS', totals.qty.toFixed(2), '', inr(totals.amount), '', ''],
  });
  const handleDownload = () => downloadReportCSV(filtered, columns, meta());
  const handlePrint = () => printReport(filtered, columns, meta());

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fuel Register</h1>
          <p className="text-gray-600">View fuel consumption records for all vehicles</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDownload} disabled={!filtered.length} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"><Download className="w-3 h-3" />Excel</button>
          <button onClick={handlePrint} disabled={!filtered.length} className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"><Printer className="w-3 h-3" />Print</button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-300 p-4 mb-4">
        <div className="grid grid-cols-4 gap-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Vehicle</label>
            <SearchableDropdown options={vehicleOpts} value={vehicleNo} onValueChange={setVehicleNo} placeholder="All Vehicles" className="w-full" /></div>
          <div className="flex items-end"><button onClick={load} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium">Apply</button></div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="flex items-center gap-2 mb-2"><Fuel className="w-5 h-5 text-blue-600" /><div className="text-sm text-gray-600">Total Fuel</div></div>
          <div className="text-2xl font-bold text-gray-900">{totals.qty.toFixed(2)} L</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-5 h-5 text-green-600" /><div className="text-sm text-gray-600">Total Amount</div></div>
          <div className="text-2xl font-bold text-green-600">₹{inr(totals.amount)}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-600 mb-2">Average Rate</div>
          <div className="text-2xl font-bold text-blue-600">₹{avgRate.toFixed(2)}/L</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-600 mb-2">Vehicles</div>
          <div className="text-2xl font-bold text-gray-900">{uniqueVehicles}</div>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>}

      <div className="bg-white rounded-lg border border-gray-300">
        {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" /><span>Loading...</span></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-300">
                <tr>
                  {['Entry No', 'Date', 'Vehicle', 'Driver', 'Supplier', 'Qty (L)', 'Rate', 'Amount', 'Meter (KM)', 'Status'].map(h => { const r = isNumericHeader(h); return (
                    <th key={h} className={`px-3 py-2 text-xs font-medium text-gray-500 uppercase whitespace-nowrap ${r?'text-right':'text-left'}`}>{h}</th>
                  ); })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.length === 0 ? <tr><td colSpan={10} className="px-3 py-8 text-center text-gray-400">No records found</td></tr> : filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap font-medium text-blue-600">{r.entryNo}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600"><div className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDateISO(r.entryDateTime)}</div></td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-900">{r.vehicleRegNoSnapshot}</td>
                    <td className="px-3 py-2 text-gray-600">{r.driverNameSnapshot ?? '-'}</td>
                    <td className="px-3 py-2 text-gray-600">{r.supplierNameSnapshot}</td>
                    <td className="px-3 py-2 text-right text-gray-900">{Number(r.fuelFilledQty).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-gray-600">₹{inr(r.ratePerLiter)}</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900">₹{inr(r.fuelAmount)}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{Number(r.meterCurrentReading).toFixed(0)}</td>
                    <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs ${r.status === 'POSTED' ? 'bg-green-100 text-green-700' : r.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
              {filtered.length > 0 && (
                <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                  <tr className="font-bold">
                    <td colSpan={5} className="px-3 py-2 text-right text-gray-900">TOTALS:</td>
                    <td className="px-3 py-2 text-right text-gray-900">{totals.qty.toFixed(2)}</td>
                    <td></td>
                    <td className="px-3 py-2 text-right text-green-600">₹{inr(totals.amount)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
