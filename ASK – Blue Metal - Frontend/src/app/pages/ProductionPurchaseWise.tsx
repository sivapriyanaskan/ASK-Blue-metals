import { useEffect, useMemo, useState } from 'react';
import { Search, Download, Calendar, Printer, Loader2 } from 'lucide-react';
import { purchaseBillApi, purchaseEntryPassApi, type PurchaseBillRow, type PurchaseEntryPassRow, purchaseConsumptionApi, type PurchaseConsumptionRow } from '../services/operationsApi';
import { describeError } from '../services/mastersApi';
import { usersApi, type UserRow } from '../services/iamApi';
import { downloadReportCSV, printReport, fmtDateISO, isNumericHeader, type ReportColumn, currentMonthStart, currentMonthEnd } from '../utils/reportExport';

const NA = '—';

const fmtTime = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const finYear = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  // FY in India runs Apr–Mar.
  const start = d.getMonth() >= 3 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
};

const HEADERS = [
  'Sl. No', 'Entry No', 'Entry Date', 'Entry Time', 'Fin. Year',
  'Purchase No', 'Purchase Date', 'Purchase Time',
  'Supplier Name', 'Vehicle No', 'Item Name',
  'Purchase Qty', 'Consume Qty', 'Created By',
] as const;
const COLSPAN = HEADERS.length;

interface Row {
  bill: PurchaseBillRow;
  pass?: PurchaseEntryPassRow;
  consumption?: PurchaseConsumptionRow;
  createdByName: string;
}

export const ProductionPurchaseWise = () => {
  const [dateFrom, setDateFrom] = useState(currentMonthStart());
  const [dateTo, setDateTo] = useState(currentMonthEnd());
  const [searchTerm, setSearchTerm] = useState('');
  const [bills, setBills] = useState<PurchaseBillRow[]>([]);
  const [passes, setPasses] = useState<PurchaseEntryPassRow[]>([]);
  const [consumptions, setConsumptions] = useState<PurchaseConsumptionRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { usersApi.list({ pageSize: 200 }).then(r => setUsers(r.items)).catch(() => {}); }, []);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [billRes, passRes, consRes] = await Promise.all([
        purchaseBillApi.list({ dateFrom, dateTo, pageSize: 200 }),
        purchaseEntryPassApi.list({ dateFrom, dateTo, pageSize: 200 }).catch(() => ({ items: [] as PurchaseEntryPassRow[] })),
        purchaseConsumptionApi.list({}).catch(() => ({ items: [] as PurchaseConsumptionRow[], shiftId: null })),
      ]);
      setBills(billRes.items);
      setPasses(passRes.items);
      setConsumptions(consRes.items);
    } catch (e) { setError(describeError(e, 'Failed to load')); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [dateFrom, dateTo]);

  const rows = useMemo((): Row[] => {
    const passById = new Map(passes.map(p => [p.id, p]));
    const consByBill = new Map(consumptions.map(c => [c.purchaseBillId, c]));
    const userById = new Map(users.map(u => [u.id, [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.username]));
    const out: Row[] = bills.map(b => ({
      bill: b,
      pass: b.entryPassId ? passById.get(b.entryPassId) : undefined,
      consumption: consByBill.get(b.id),
      createdByName: b.createdByName ?? userById.get(b.createdById) ?? NA,
    }));
    const s = searchTerm.toLowerCase();
    return out.filter(r => {
      if (!s) return true;
      return r.bill.purchaseNo.toLowerCase().includes(s)
        || r.bill.supplierNameSnapshot.toLowerCase().includes(s)
        || r.bill.itemNameSnapshot.toLowerCase().includes(s)
        || r.bill.vehicleNoSnapshot.toLowerCase().includes(s)
        || (r.pass?.passNo ?? '').toLowerCase().includes(s);
    });
  }, [bills, passes, consumptions, users, searchTerm]);

  const totals = useMemo(() => rows.reduce((a, r) => ({
    qty: a.qty + Number(r.bill.netWeight),
    consumed: a.consumed + (r.consumption?.status === 'CONSUMED' ? Number(r.consumption.quantity) : 0),
  }), { qty: 0, consumed: 0 }), [rows]);

  const consumeQty = (r: Row) => r.consumption?.status === 'CONSUMED' ? Number(r.consumption.quantity).toFixed(3) : '0.000';

  const columns: ReportColumn<Row>[] = useMemo(() => {
    let serial = 0;
    return [
      { header: 'Sl. No', value: () => String(++serial), align: 'right' },
      { header: 'Entry No', value: r => r.pass?.passNo ?? r.bill.passNoSnapshot ?? NA },
      { header: 'Entry Date', value: r => fmtDateISO(r.pass?.passDateTime ?? r.bill.purchaseDateTime) },
      { header: 'Entry Time', value: r => fmtTime(r.pass?.passDateTime ?? r.bill.purchaseDateTime) },
      { header: 'Fin. Year', value: r => finYear(r.pass?.passDateTime ?? r.bill.purchaseDateTime) },
      { header: 'Purchase No', value: r => r.bill.purchaseNo },
      { header: 'Purchase Date', value: r => fmtDateISO(r.bill.purchaseDateTime) },
      { header: 'Purchase Time', value: r => fmtTime(r.bill.purchaseDateTime) },
      { header: 'Supplier Name', value: r => r.bill.supplierNameSnapshot },
      { header: 'Vehicle No', value: r => r.bill.vehicleNoSnapshot },
      { header: 'Item Name', value: r => r.bill.itemNameSnapshot },
      { header: 'Purchase Qty', value: r => Number(r.bill.netWeight).toFixed(3), align: 'right' },
      { header: 'Consume Qty', value: r => consumeQty(r), align: 'right' },
      { header: 'Created By', value: r => r.createdByName },
    ];
  }, [rows]);

  const meta = () => ({
    title: 'Production - Purchase Wise',
    subtitle: [
      `From ${fmtDateISO(dateFrom)} to ${fmtDateISO(dateTo)}`,
      searchTerm ? `Search: ${searchTerm}` : '',
    ].filter(Boolean) as string[],
  });
  const handleDownload = () => downloadReportCSV(rows, columns, meta());
  const handlePrint = () => printReport(rows, columns, meta());

  return (
    <div className="p-6">
      <div className="mb-4 pb-3 border-b border-gray-300 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Production - Purchase Wise</h1>
          <p className="text-sm text-gray-500">Purchase entries with consumption qty</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDownload} disabled={!rows.length} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"><Download className="w-3 h-3" />Excel</button>
          <button onClick={handlePrint} disabled={!rows.length} className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"><Printer className="w-3 h-3" />Print</button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-300 p-4 mb-4">
        <div className="grid grid-cols-4 gap-3">
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
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
            <div className="relative"><Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Bill No, Entry No, Supplier, Item, Vehicle…" className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded" /></div>
          </div>
          <div className="flex items-end"><button onClick={load} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded text-sm">Apply</button></div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        {([['Records', String(rows.length)], ['Purchase Qty', totals.qty.toFixed(3) + ' T'], ['Consumed', totals.consumed.toFixed(3) + ' T']] as [string, string][]).map(([l, v]) => (
          <div key={l} className="bg-white rounded-lg border border-gray-300 p-3"><div className="text-xs text-gray-500">{l}</div><div className="text-xl font-bold text-gray-900">{v}</div></div>
        ))}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>}

      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" /><span>Loading...</span></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-300">
                <tr>{HEADERS.map(h => { const r = isNumericHeader(h); return <th key={h} className={`px-3 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap ${r?'text-right':'text-left'}`}>{h}</th>; })}</tr>
              </thead>
              <tbody>
                {rows.length === 0 ? <tr><td colSpan={COLSPAN} className="px-3 py-8 text-center text-gray-400">No records found</td></tr> : rows.map((r, i) => (
                  <tr key={r.bill.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 text-right text-xs">{i + 1}</td>
                    <td className="px-3 py-2 text-xs font-mono">{r.pass?.passNo ?? r.bill.passNoSnapshot ?? NA}</td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap">{fmtDateISO(r.pass?.passDateTime ?? r.bill.purchaseDateTime)}</td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap">{fmtTime(r.pass?.passDateTime ?? r.bill.purchaseDateTime)}</td>
                    <td className="px-3 py-2 text-xs">{finYear(r.pass?.passDateTime ?? r.bill.purchaseDateTime)}</td>
                    <td className="px-3 py-2 text-xs font-mono text-blue-600">{r.bill.purchaseNo}</td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap">{fmtDateISO(r.bill.purchaseDateTime)}</td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap">{fmtTime(r.bill.purchaseDateTime)}</td>
                    <td className="px-3 py-2 text-xs">{r.bill.supplierNameSnapshot}</td>
                    <td className="px-3 py-2 text-xs">{r.bill.vehicleNoSnapshot}</td>
                    <td className="px-3 py-2 text-xs">{r.bill.itemNameSnapshot}</td>
                    <td className="px-3 py-2 text-xs text-right">{Number(r.bill.netWeight).toFixed(3)}</td>
                    <td className="px-3 py-2 text-xs text-right">{consumeQty(r)}</td>
                    <td className="px-3 py-2 text-xs">{r.createdByName}</td>
                  </tr>
                ))}
              </tbody>
              {rows.length > 0 && (
                <tfoot className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                  <tr>
                    <td colSpan={11} className="px-3 py-2 text-right text-xs text-gray-600">GRAND TOTAL</td>
                    <td className="px-3 py-2 text-right text-xs">{totals.qty.toFixed(3)}</td>
                    <td className="px-3 py-2 text-right text-xs">{totals.consumed.toFixed(3)}</td>
                    <td></td>
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

