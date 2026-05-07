import { useEffect, useMemo, useState } from 'react';
import { Calendar, Loader2 } from 'lucide-react';
import { purchaseBillApi, type PurchaseBillRow } from '../services/operationsApi';
import { suppliersApi, describeError, type SupplierRow } from '../services/mastersApi';
import { SearchableDropdown, type SearchableDropdownOption } from '../components/ui/searchable-dropdown';

const fmt = (n: string | number) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN');

export const SupplierLedger = () => {
  const [supplierId, setSupplierId] = useState('');
  const [dateFrom, setDateFrom] = useState('2026-03-01');
  const [dateTo, setDateTo] = useState('2026-03-31');
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [bills, setBills] = useState<PurchaseBillRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    suppliersApi.list({ pageSize: 200 }).then(r => setSuppliers(r.items)).catch(() => {});
  }, []);

  const load = async () => {
    if (!supplierId) { setBills([]); return; }
    setLoading(true); setError(null);
    try {
      const res = await purchaseBillApi.list({ supplierId, dateFrom, dateTo, pageSize: 200 } as any);
      setBills(res.items);
    } catch (e) { setError(describeError(e, 'Failed to load ledger')); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [supplierId, dateFrom, dateTo]);

  const totalCredit = useMemo(() => bills.reduce((s, b) => s + Number(b.grossPayable), 0), [bills]);
  const selectedSupplier = suppliers.find(s => s.id === supplierId);

  const supOpts: SearchableDropdownOption[] = [
    { value: '', label: 'Select Supplier' },
    ...suppliers.map(s => ({ value: s.id, label: s.name, description: s.code })),
  ];

  return (
    <div className="p-6">
      <div className="mb-4 pb-3 border-b border-gray-300">
        <h1 className="text-xl font-bold text-gray-900">Supplier Ledger</h1>
        <p className="text-sm text-gray-500">Purchase bills ledger by supplier from DB</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-300 p-4 mb-4">
        <div className="grid grid-cols-4 gap-3">
          <div className="col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">Supplier</label>
            <SearchableDropdown options={supOpts} value={supplierId} onValueChange={setSupplierId} placeholder="Select Supplier" /></div>
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
      {selectedSupplier && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
          <div className="font-semibold text-orange-900">{selectedSupplier.name} ({selectedSupplier.code})</div>
          <div className="text-sm text-orange-700">Type: {selectedSupplier.supplierType} | GST: {selectedSupplier.gstNumber ?? 'N/A'}</div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {([['Total Bills', String(bills.length)], ['Net Weight', bills.reduce((s,b)=>s+Number(b.netWeight),0).toFixed(2)+' T'], ['Total Payable', '₹'+fmt(totalCredit)]] as [string,string][]).map(([l,v])=>(
          <div key={l} className="bg-white rounded-lg border border-gray-300 p-3"><div className="text-xs text-gray-500">{l}</div><div className="text-xl font-bold text-gray-900">{v}</div></div>
        ))}
      </div>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>}
      {!supplierId && <div className="bg-white rounded-lg border border-gray-300 p-12 text-center text-gray-400">Select a supplier to view ledger</div>}
      {supplierId && (
        <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
          {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" /><span>Loading...</span></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-300">
                  <tr>{['Date','Purchase No','Pass No','Item','Vehicle','Net Wt (T)','Rate','Gross Amt','GST','Payable','Mode'].map(h=><th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {bills.length === 0 ? <tr><td colSpan={11} className="px-3 py-8 text-center text-gray-400">No bills found</td></tr>
                  : bills.map(b=>(
                    <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap">{fmtDate(b.purchaseDateTime)}</td>
                      <td className="px-3 py-2 font-medium text-blue-600">{b.purchaseNo}</td>
                      <td className="px-3 py-2">{b.passNoSnapshot??'—'}</td>
                      <td className="px-3 py-2 max-w-28 truncate">{b.itemNameSnapshot}</td>
                      <td className="px-3 py-2">{b.vehicleNoSnapshot}</td>
                      <td className="px-3 py-2 text-right">{Number(b.netWeight).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">₹{fmt(b.rate)}</td>
                      <td className="px-3 py-2 text-right">₹{fmt(b.grossAmount)}</td>
                      <td className="px-3 py-2 text-right">₹{fmt(b.gstAmount)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-orange-600">₹{fmt(b.grossPayable)}</td>
                      <td className="px-3 py-2">{b.paymentMode}</td>
                    </tr>
                  ))}
                </tbody>
                {bills.length > 0 && (
                  <tfoot className="bg-gray-50 border-t-2 border-gray-300 font-semibold">
                    <tr>
                      <td colSpan={9} className="px-3 py-2 text-right text-xs text-gray-600">TOTAL PAYABLE</td>
                      <td className="px-3 py-2 text-right text-orange-600">₹{fmt(totalCredit)}</td>
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
