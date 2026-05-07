import { useEffect, useMemo, useState } from 'react';
import { Calendar, Download, Loader2 } from 'lucide-react';
import { salesBillApi, type SalesBillRow } from '../services/operationsApi';
import { describeError } from '../services/mastersApi';

const fmt = (n: string | number) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN');

export const DriverBATAReport = () => {
  const [dateFrom, setDateFrom] = useState('2026-03-01');
  const [dateTo, setDateTo] = useState('2026-03-31');
  const [bills, setBills] = useState<SalesBillRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await salesBillApi.list({ dateFrom, dateTo, pageSize: 200 });
      setBills(res.items);
    } catch (e) { setError(describeError(e, 'Failed to load')); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [dateFrom, dateTo]);

  const driverSummary = useMemo(() => {
    const map: Record<string, { trips: number; totalWeight: number; totalSales: number }> = {};
    for (const b of bills) {
      const name = b.driverName ?? 'Unknown Driver';
      if (!map[name]) map[name] = { trips: 0, totalWeight: 0, totalSales: 0 };
      map[name].trips += 1;
      map[name].totalWeight += Number(b.netWeight);
      map[name].totalSales += Number(b.totalAmount);
    }
    return Object.entries(map).sort((a, b) => b[1].trips - a[1].trips);
  }, [bills]);

  const billRows = useMemo(() => bills.filter(b => b.driverName), [bills]);

  return (
    <div className="p-6">
      <div className="mb-4 pb-3 border-b border-gray-300 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Driver Activity Report</h1>
          <p className="text-sm text-gray-500">Sales trips grouped by driver from DB</p>
        </div>
        <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"><Download className="w-3 h-3" />Excel</button>
      </div>
      <div className="bg-white rounded-lg border border-gray-300 p-4 mb-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded" />
          </div>
          <div className="flex items-end"><button onClick={load} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded text-sm">Apply</button></div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-4">
        {([['Total Bills', String(bills.length)], ['Total Drivers', String(driverSummary.length)], ['Total Sales', '₹'+fmt(bills.reduce((s,b)=>s+Number(b.totalAmount),0))]] as [string,string][]).map(([l,v])=>(
          <div key={l} className="bg-white rounded-lg border border-gray-300 p-3"><div className="text-xs text-gray-500">{l}</div><div className="text-xl font-bold text-gray-900">{v}</div></div>
        ))}
      </div>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>}
      {driverSummary.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-300 mb-4 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-300 font-semibold text-sm text-gray-700">Driver Summary</div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr>{['Driver','Trips','Net Weight (T)','Total Sales'].map(h=><th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600">{h}</th>)}</tr></thead>
            <tbody>
              {driverSummary.map(([name, d])=>(
                <tr key={name} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{name}</td>
                  <td className="px-3 py-2 text-right">{d.trips}</td>
                  <td className="px-3 py-2 text-right">{d.totalWeight.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-semibold">₹{fmt(d.totalSales)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-300 font-semibold text-sm text-gray-700">Bill Details</div>
        {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" /><span>Loading...</span></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-300">
                <tr>{['Bill No','Date','Driver','Vehicle','Customer','Item','Net Wt (T)','Amount'].map(h=><th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody>
                {billRows.length === 0 ? <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-400">No records found</td></tr>
                : billRows.map(b=>(
                  <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-blue-600">{b.billNo}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(b.billDate)}</td>
                    <td className="px-3 py-2">{b.driverName}</td>
                    <td className="px-3 py-2">{b.vehicleNo}</td>
                    <td className="px-3 py-2 max-w-32 truncate">{b.customer.name}</td>
                    <td className="px-3 py-2 max-w-28 truncate">{b.item.name}</td>
                    <td className="px-3 py-2 text-right">{Number(b.netWeight).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-semibold">₹{fmt(b.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
