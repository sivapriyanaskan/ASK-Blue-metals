import { useEffect, useMemo, useState } from 'react';
import { Download, Printer, Loader2 } from 'lucide-react';
import {
  salesBillApi,
  purchaseBillApi,
  type SalesBillRow,
  type PurchaseBillRow,
} from '../services/operationsApi';
import { describeError } from '../services/mastersApi';
import {
  downloadReportCSV,
  printReport,
  inr,
  fmtDateISO,
  isNumericHeader,
  type ReportColumn,
  currentMonthStart,
  currentMonthEnd,
} from '../utils/reportExport';

const fmt = (n: string | number) =>
  Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN');

type BataKind = 'Sales' | 'Purchase';

interface BataRow {
  id: string;
  kind: BataKind;
  billNo: string;
  date: string;
  driver: string;
  vehicle: string;
  party: string;
  item: string;
  netWeight: number;
  billAmount: number;
  bataAmount: number;
}

export const DriverBATAReport = () => {
  const [dateFrom, setDateFrom] = useState(currentMonthStart());
  const [dateTo, setDateTo] = useState(currentMonthEnd());
  const [kindFilter, setKindFilter] = useState<'ALL' | BataKind>('ALL');
  const [onlyWithBata, setOnlyWithBata] = useState(true);
  const [salesBills, setSalesBills] = useState<SalesBillRow[]>([]);
  const [purchaseBills, setPurchaseBills] = useState<PurchaseBillRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [salesRes, purchaseRes] = await Promise.all([
        salesBillApi.list({ dateFrom, dateTo, pageSize: 200, status: 'POSTED' }),
        purchaseBillApi.list({ dateFrom, dateTo, pageSize: 200, status: 'POSTED' } as any),
      ]);
      setSalesBills(salesRes.items);
      setPurchaseBills(purchaseRes.items);
    } catch (e) {
      setError(describeError(e, 'Failed to load'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo<BataRow[]>(() => {
    const sales: BataRow[] = salesBills.map((b) => ({
      id: `S-${b.id}`,
      kind: 'Sales',
      billNo: b.billNo,
      date: b.billDate,
      driver: b.driverName ?? '',
      vehicle: b.vehicleNo,
      party: b.customer?.name ?? '',
      item: b.item?.name ?? '',
      netWeight: Number(b.netWeight ?? 0),
      billAmount: Number(b.totalAmount ?? 0),
      bataAmount: Number(b.driverBata ?? 0),
    }));
    const purchases: BataRow[] = purchaseBills.map((b) => ({
      id: `P-${b.id}`,
      kind: 'Purchase',
      billNo: b.purchaseNo,
      date: b.purchaseDateTime,
      driver: b.driverNameSnapshot ?? '',
      vehicle: b.vehicleNoSnapshot,
      party: b.supplierNameSnapshot,
      item: b.itemNameSnapshot,
      netWeight: Number(b.netWeight ?? 0),
      billAmount: Number(b.grossPayable ?? 0),
      bataAmount: Number(b.driverBata ?? 0),
    }));
    let merged = [...sales, ...purchases];
    if (kindFilter !== 'ALL') merged = merged.filter((r) => r.kind === kindFilter);
    if (onlyWithBata) merged = merged.filter((r) => r.bataAmount > 0);
    merged.sort((a, b) => (a.date < b.date ? 1 : -1));
    return merged;
  }, [salesBills, purchaseBills, kindFilter, onlyWithBata]);

  const driverSummary = useMemo(() => {
    const map: Record<string, { trips: number; totalBata: number; totalBill: number }> = {};
    for (const r of rows) {
      const name = r.driver || 'Unknown Driver';
      if (!map[name]) map[name] = { trips: 0, totalBata: 0, totalBill: 0 };
      map[name].trips += 1;
      map[name].totalBata += r.bataAmount;
      map[name].totalBill += r.billAmount;
    }
    return Object.entries(map).sort((a, b) => b[1].totalBata - a[1].totalBata);
  }, [rows]);

  const totalBata = rows.reduce((s, r) => s + r.bataAmount, 0);
  const totalBill = rows.reduce((s, r) => s + r.billAmount, 0);
  const totalSalesBata = rows
    .filter((r) => r.kind === 'Sales')
    .reduce((s, r) => s + r.bataAmount, 0);
  const totalPurchaseBata = rows
    .filter((r) => r.kind === 'Purchase')
    .reduce((s, r) => s + r.bataAmount, 0);

  const columns: ReportColumn<BataRow>[] = [
    { header: 'Type', value: (r) => r.kind },
    { header: 'Bill No', value: (r) => r.billNo },
    { header: 'Date', value: (r) => fmtDateISO(r.date) },
    { header: 'Driver', value: (r) => r.driver },
    { header: 'Vehicle', value: (r) => r.vehicle },
    { header: 'Customer / Supplier', value: (r) => r.party },
    { header: 'Item', value: (r) => r.item },
    { header: 'Net Wt (T)', value: (r) => r.netWeight.toFixed(2), align: 'right' },
    { header: 'Bill Amount', value: (r) => inr(r.billAmount), align: 'right' },
    { header: 'Bata Amount', value: (r) => inr(r.bataAmount), align: 'right' },
  ];

  const meta = () => ({
    title: 'Driver BATA Report',
    subtitle: [
      `From ${fmtDateISO(dateFrom)} to ${fmtDateISO(dateTo)}`,
      `Type: ${kindFilter} | ${onlyWithBata ? 'With BATA only' : 'All bills'}`,
      `Drivers: ${driverSummary.length}`,
    ],
    totals: ['', '', '', '', '', '', '', '', 'TOTAL', inr(totalBata)],
  });
  const handleDownload = () => downloadReportCSV(rows, columns, meta());
  const handlePrint = () => printReport(rows, columns, meta());

  return (
    <div className="p-6">
      <div className="mb-4 pb-3 border-b border-gray-300 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Driver BATA Report</h1>
          <p className="text-sm text-gray-500">
            Bata amount given to drivers — per sales &amp; purchase bill
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            disabled={!rows.length}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            Excel
          </button>
          <button
            onClick={handlePrint}
            disabled={!rows.length}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"
          >
            <Printer className="w-3 h-3" />
            Print
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-300 p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value as 'ALL' | BataKind)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white"
            >
              <option value="ALL">All</option>
              <option value="Sales">Sales</option>
              <option value="Purchase">Purchase</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={onlyWithBata}
              onChange={(e) => setOnlyWithBata(e.target.checked)}
            />
            Only bills with BATA
          </label>
          <button
            onClick={load}
            className="bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded text-sm"
          >
            Apply
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
        {(
          [
            ['Total Bills', String(rows.length)],
            ['Total BATA', '₹' + fmt(totalBata)],
            ['Sales BATA', '₹' + fmt(totalSalesBata)],
            ['Purchase BATA', '₹' + fmt(totalPurchaseBata)],
          ] as [string, string][]
        ).map(([l, v]) => (
          <div key={l} className="bg-white rounded-lg border border-gray-300 p-3">
            <div className="text-xs text-gray-500">{l}</div>
            <div className="text-xl font-bold text-gray-900">{v}</div>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      {driverSummary.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-300 mb-4 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-300 font-semibold text-sm text-gray-700">
            Driver Summary
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Driver', 'Trips', 'Total BATA', 'Total Bill Amount'].map((h) => {
                  const r = isNumericHeader(h);
                  return (
                    <th
                      key={h}
                      className={`px-3 py-2 text-xs font-semibold text-gray-600 ${r ? 'text-right' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {driverSummary.map(([name, d]) => (
                <tr key={name} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{name}</td>
                  <td className="px-3 py-2 text-right">{d.trips}</td>
                  <td className="px-3 py-2 text-right font-semibold text-emerald-700">
                    ₹{fmt(d.totalBata)}
                  </td>
                  <td className="px-3 py-2 text-right">₹{fmt(d.totalBill)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-300 font-bold">
              <tr>
                <td className="px-3 py-2">TOTAL</td>
                <td className="px-3 py-2 text-right">{rows.length}</td>
                <td className="px-3 py-2 text-right text-emerald-700">₹{fmt(totalBata)}</td>
                <td className="px-3 py-2 text-right">₹{fmt(totalBill)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-300 font-semibold text-sm text-gray-700">
          Bill-wise BATA Details
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
            <span>Loading...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-300">
                <tr>
                  {[
                    'Type',
                    'Bill No',
                    'Date',
                    'Driver',
                    'Vehicle',
                    'Customer / Supplier',
                    'Item',
                    'Net Wt (T)',
                    'Bill Amount',
                    'BATA Amount',
                  ].map((h) => {
                    const r = isNumericHeader(h);
                    return (
                      <th
                        key={h}
                        className={`px-3 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap ${r ? 'text-right' : 'text-left'}`}
                      >
                        {h}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-gray-400">
                      No records found
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            r.kind === 'Sales'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          {r.kind}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-medium text-blue-600">{r.billNo}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.date)}</td>
                      <td className="px-3 py-2">{r.driver || '—'}</td>
                      <td className="px-3 py-2">{r.vehicle}</td>
                      <td className="px-3 py-2 max-w-32 truncate">{r.party}</td>
                      <td className="px-3 py-2 max-w-28 truncate">{r.item}</td>
                      <td className="px-3 py-2 text-right">{r.netWeight.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">₹{fmt(r.billAmount)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-emerald-700">
                        ₹{fmt(r.bataAmount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot className="bg-gray-50 border-t-2 border-gray-300 font-bold">
                  <tr>
                    <td className="px-3 py-2" colSpan={8}>
                      TOTAL
                    </td>
                    <td className="px-3 py-2 text-right">₹{fmt(totalBill)}</td>
                    <td className="px-3 py-2 text-right text-emerald-700">₹{fmt(totalBata)}</td>
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
