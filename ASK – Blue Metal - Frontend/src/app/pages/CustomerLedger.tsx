import { useEffect, useMemo, useState } from 'react';
import { Calendar, Loader2 } from 'lucide-react';
import { salesBillApi, type SalesBillRow } from '../services/operationsApi';
import { customersApi, describeError, type CustomerRow } from '../services/mastersApi';
import { SearchableDropdown, type SearchableDropdownOption } from '../components/ui/searchable-dropdown';

const fmt = (n: string | number) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN');

export const CustomerLedger = () => {
  const [customerId, setCustomerId] = useState('');
  const [dateFrom, setDateFrom] = useState('2026-03-01');
  const [dateTo, setDateTo] = useState('2026-03-31');
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [bills, setBills] = useState<SalesBillRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    customersApi.list({ pageSize: 200 }).then(r => setCustomers(r.items)).catch(() => {});
  }, []);

  const load = async () => {
    if (!customerId) { setBills([]); return; }
    setLoading(true); setError(null);
    try {
      const res = await salesBillApi.list({ customerId, dateFrom, dateTo, pageSize: 200 });
      setBills(res.items);
    } catch (e) { setError(describeError(e, 'Failed to load ledger')); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [customerId, dateFrom, dateTo]);

  const totalDebit = useMemo(() => bills.reduce((s, b) => s + Number(b.totalAmount), 0), [bills]);
  const selectedCustomer = customers.find(c => c.id === customerId);

  const custOpts: SearchableDropdownOption[] = [
    { value: '', label: 'Select Customer' },
    ...customers.map(c => ({ value: c.id, label: c.name, description: c.code })),
  ];

  return (
    <div className="p-6">
      <div className="mb-4 pb-3 border-b border-gray-300">
        <h1 className="text-xl font-bold text-gray-900">Customer Ledger</h1>
        <p className="text-sm text-gray-500">Sales bills ledger by customer from DB</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-300 p-4 mb-4">
        <div className="grid grid-cols-4 gap-3">
          <div className="col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">Customer</label>
            <SearchableDropdown options={custOpts} value={customerId} onValueChange={setCustomerId} placeholder="Select Customer" /></div>
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
        </div>
      </div>
      {selectedCustomer && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="font-semibold text-blue-900">{selectedCustomer.name} ({selectedCustomer.code})</div>
          <div className="text-sm text-blue-700">Bill Type: {selectedCustomer.billType} | GST: {selectedCustomer.gstNumber ?? 'N/A'} | Credit Limit: ₹{fmt(selectedCustomer.creditLimit)}</div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {([['Total Bills', String(bills.length)], ['Total Debit (Sales)', '₹'+fmt(totalDebit)], ['Credit Limit', selectedCustomer?'₹'+fmt(selectedCustomer.creditLimit):'—']] as [string,string][]).map(([l,v])=>(
          <div key={l} className="bg-white rounded-lg border border-gray-300 p-3"><div className="text-xs text-gray-500">{l}</div><div className="text-xl font-bold text-gray-900">{v}</div></div>
        ))}
      </div>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>}
      {!customerId && <div className="bg-white rounded-lg border border-gray-300 p-12 text-center text-gray-400">Select a customer to view ledger</div>}
      {customerId && (
        <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
          {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" /><span>Loading...</span></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-300">
                  <tr>{['Date','Bill No','Token','Item','Vehicle','Net Wt (T)','Rate','Taxable','GST','Total','Mode'].map(h=><th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {bills.length === 0 ? <tr><td colSpan={11} className="px-3 py-8 text-center text-gray-400">No bills found for selected period</td></tr>
                  : bills.map(b=>{
                    const gst = Number(b.cgstAmount)+Number(b.sgstAmount)+Number(b.igstAmount);
                    return (
                      <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap">{fmtDate(b.billDate)}</td>
                        <td className="px-3 py-2 font-medium text-blue-600">{b.billNo}</td>
                        <td className="px-3 py-2">{b.token?.tokenNo??'—'}</td>
                        <td className="px-3 py-2 max-w-28 truncate">{b.item.name}</td>
                        <td className="px-3 py-2">{b.vehicleNo}</td>
                        <td className="px-3 py-2 text-right">{Number(b.netWeight).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">₹{fmt(b.rate)}</td>
                        <td className="px-3 py-2 text-right">₹{fmt(b.taxableAmount)}</td>
                        <td className="px-3 py-2 text-right">₹{fmt(gst)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-red-600">₹{fmt(b.totalAmount)}</td>
                        <td className="px-3 py-2">{b.paymentMode}</td>
                      </tr>
                    );
                  })}
                </tbody>
                {bills.length > 0 && (
                  <tfoot className="bg-gray-50 border-t-2 border-gray-300 font-semibold">
                    <tr>
                      <td colSpan={9} className="px-3 py-2 text-right text-xs text-gray-600">TOTAL OUTSTANDING</td>
                      <td className="px-3 py-2 text-right text-red-600">₹{fmt(totalDebit)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
