import { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronDown, ChevronRight, Loader2, Download } from 'lucide-react';
import { salesBillApi, type SalesBillRow } from '../services/operationsApi';
import { describeError } from '../services/mastersApi';

const fmt = (n: string | number) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN');

interface CustomerGroup {
  customerId: string;
  customerName: string;
  customerCode: string;
  billType: string;
  bills: SalesBillRow[];
  totalWeight: number;
  totalTaxable: number;
  totalGst: number;
  totalAmount: number;
}

export const SalesCustomerWise = () => {
  const [dateFrom, setDateFrom] = useState('2026-03-01');
  const [dateTo, setDateTo] = useState('2026-03-31');
  const [bills, setBills] = useState<SalesBillRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await salesBillApi.list({ dateFrom, dateTo, pageSize: 200, status: 'POSTED' });
      setBills(res.items);
    } catch (e) { setError(describeError(e, 'Failed to load')); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [dateFrom, dateTo]);

  const groups = useMemo((): CustomerGroup[] => {
    const map: Record<string, CustomerGroup> = {};
    for (const b of bills) {
      if (!map[b.customerId]) {
        map[b.customerId] = {
          customerId: b.customerId,
          customerName: b.customer.name,
          customerCode: b.customer.code,
          billType: b.customer.billType,
          bills: [],
          totalWeight: 0, totalTaxable: 0, totalGst: 0, totalAmount: 0,
        };
      }
      const g = map[b.customerId];
      g.bills.push(b);
      g.totalWeight += Number(b.netWeight);
      g.totalTaxable += Number(b.taxableAmount);
      g.totalGst += Number(b.cgstAmount) + Number(b.sgstAmount) + Number(b.igstAmount);
      g.totalAmount += Number(b.totalAmount);
    }
    return Object.values(map).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [bills]);

  const grandTotal = useMemo(() => groups.reduce((a, g) => ({
    bills: a.bills + g.bills.length,
    weight: a.weight + g.totalWeight,
    taxable: a.taxable + g.totalTaxable,
    gst: a.gst + g.totalGst,
    total: a.total + g.totalAmount,
  }), { bills: 0, weight: 0, taxable: 0, gst: 0, total: 0 }), [groups]);

  const toggle = (id: string) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  return (
    <div className="p-6">
      <div className="mb-4 pb-3 border-b border-gray-300 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Sales Customer-Wise Report</h1>
          <p className="text-sm text-gray-500">Sales bills grouped by customer from DB</p>
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
      <div className="grid grid-cols-4 gap-4 mb-4">
        {([['Customers', String(groups.length)], ['Total Bills', String(grandTotal.bills)], ['Net Weight', grandTotal.weight.toFixed(2)+' T'], ['Grand Total', '₹'+fmt(grandTotal.total)]] as [string,string][]).map(([l,v])=>(
          <div key={l} className="bg-white rounded-lg border border-gray-300 p-3"><div className="text-xs text-gray-500">{l}</div><div className="text-xl font-bold text-gray-900">{v}</div></div>
        ))}
      </div>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>}
      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" /><span>Loading...</span></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-300">
                <tr>{['Customer','Type','Bills','Net Wt (T)','Taxable Amt','GST','Total Amount'].map(h=><th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody>
                {groups.length === 0 ? <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400">No records found</td></tr>
                : groups.map(g=>(
                  <>
                    <tr key={g.customerId} onClick={() => toggle(g.customerId)} className="border-b border-gray-300 hover:bg-blue-50 cursor-pointer bg-blue-50/30">
                      <td className="px-3 py-2 font-semibold flex items-center gap-1">
                        {expanded[g.customerId] ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                        {g.customerName} <span className="text-xs text-gray-400 font-normal">({g.customerCode})</span>
                      </td>
                      <td className="px-3 py-2"><span className={g.billType==='TAX_INVOICE'?'px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700':'px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600'}>{g.billType==='TAX_INVOICE'?'With GST':'Non-GST'}</span></td>
                      <td className="px-3 py-2 text-right font-medium">{g.bills.length}</td>
                      <td className="px-3 py-2 text-right font-medium">{g.totalWeight.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-medium">₹{fmt(g.totalTaxable)}</td>
                      <td className="px-3 py-2 text-right font-medium">₹{fmt(g.totalGst)}</td>
                      <td className="px-3 py-2 text-right font-bold text-blue-700">₹{fmt(g.totalAmount)}</td>
                    </tr>
                    {expanded[g.customerId] && g.bills.map(b=>(
                      <tr key={b.id} className="border-b border-gray-100 bg-gray-50/50 hover:bg-gray-100">
                        <td className="px-3 py-1.5 pl-8 text-blue-600 text-xs font-medium">{b.billNo}</td>
                        <td className="px-3 py-1.5 text-xs">{fmtDate(b.billDate)}</td>
                        <td className="px-3 py-1.5 text-xs">{b.item.name}</td>
                        <td className="px-3 py-1.5 text-right text-xs">{Number(b.netWeight).toFixed(2)}</td>
                        <td className="px-3 py-1.5 text-right text-xs">₹{fmt(b.taxableAmount)}</td>
                        <td className="px-3 py-1.5 text-right text-xs">₹{fmt(Number(b.cgstAmount)+Number(b.sgstAmount)+Number(b.igstAmount))}</td>
                        <td className="px-3 py-1.5 text-right text-xs font-semibold">₹{fmt(b.totalAmount)}</td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
              {groups.length > 0 && (
                <tfoot className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                  <tr>
                    <td colSpan={2} className="px-3 py-2 text-xs text-gray-600">GRAND TOTAL ({groups.length} customers)</td>
                    <td className="px-3 py-2 text-right">{grandTotal.bills}</td>
                    <td className="px-3 py-2 text-right">{grandTotal.weight.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">₹{fmt(grandTotal.taxable)}</td>
                    <td className="px-3 py-2 text-right">₹{fmt(grandTotal.gst)}</td>
                    <td className="px-3 py-2 text-right text-blue-700">₹{fmt(grandTotal.total)}</td>
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
