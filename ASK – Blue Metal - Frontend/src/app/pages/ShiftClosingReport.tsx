import { useEffect, useMemo, useState } from 'react';
import { Calendar, User, Download, Printer, FileDown } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';
import { shiftApi, type ShiftRow } from '../services/operationsApi';
import { describeError } from '../services/mastersApi';
import { downloadReportCSV, printReport, inr, type ReportColumn } from '../utils/reportExport';

interface ShiftRecord {
  id: string;
  shiftNo: string;
  date: string;
  shiftType: 'Day' | 'Night';
  operator: string;
  openingCash: number;
  salesCash: number;
  salesCard: number;
  salesUPI: number;
  totalSales: number;
  expenses: number;
  closingCash: number;
  difference: number;
  status: 'Balanced' | 'Short' | 'Excess';
}

const toRecord = (s: ShiftRow): ShiftRecord => {
  const opening = Number(s.openingAmount) || 0;
  const cashSales = Number(s.billingTotal) || 0;
  const totalCashReceived = Number(s.totalCashReceived) || 0;
  const closing = Number(s.closingAmount) || 0;
  const expenses = Number(s.paymentTotal) || 0;
  const purchase = Number(s.purchaseTotal) || 0;
  const expectedClose = totalCashReceived + opening - expenses - purchase;
  const diff = Math.round((closing - expectedClose) * 100) / 100;
  const dateStr = s.shiftDate ? new Date(s.shiftDate).toISOString().slice(0, 10) : '';
  const hour = s.openedAt ? new Date(s.openedAt).getHours() : 8;
  return {
    id: s.id,
    shiftNo: s.shiftNo,
    date: dateStr,
    shiftType: hour >= 18 || hour < 6 ? 'Night' : 'Day',
    operator: s.openedBySnapshot,
    openingCash: opening,
    salesCash: cashSales,
    salesCard: 0,
    salesUPI: 0,
    totalSales: totalCashReceived || cashSales,
    expenses: expenses + purchase,
    closingCash: closing,
    difference: diff,
    status: diff === 0 ? 'Balanced' : diff < 0 ? 'Short' : 'Excess',
  };
};

export const ShiftClosingReport = () => {
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    operator: '',
    status: '',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await shiftApi.list({
          status: 'CLOSED',
          pageSize: 100,
          dateFrom: filters.fromDate || undefined,
          dateTo: filters.toDate || undefined,
        });
        if (!cancelled) setShifts(res.items);
      } catch (err) {
        if (!cancelled) setError(describeError(err, 'Failed to load shift report'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters.fromDate, filters.toDate]);

  const operatorList = useMemo(
    () => Array.from(new Set(shifts.map((s) => s.openedBySnapshot).filter(Boolean))),
    [shifts],
  );

  const records: ShiftRecord[] = useMemo(() => {
    let arr = shifts.map(toRecord);
    if (filters.operator) arr = arr.filter((r) => r.operator === filters.operator);
    if (filters.status) arr = arr.filter((r) => r.status === filters.status);
    return arr;
  }, [shifts, filters.operator, filters.status]);

  const totalSales = records.reduce((sum, r) => sum + r.totalSales, 0);
  const totalCashSales = records.reduce((sum, r) => sum + r.salesCash, 0);
  const totalExpenses = records.reduce((sum, r) => sum + r.expenses, 0);
  const totalDifference = records.reduce((sum, r) => sum + r.difference, 0);

  const columns: ReportColumn<ShiftRecord>[] = [
    { header: 'Shift No', value: r => r.shiftNo },
    { header: 'Date', value: r => r.date },
    { header: 'Type', value: r => r.shiftType },
    { header: 'Operator', value: r => r.operator },
    { header: 'Opening', value: r => inr(r.openingCash), align: 'right' },
    { header: 'Cash Sales', value: r => inr(r.salesCash), align: 'right' },
    { header: 'Total Sales', value: r => inr(r.totalSales), align: 'right' },
    { header: 'Expenses', value: r => inr(r.expenses), align: 'right' },
    { header: 'Closing', value: r => inr(r.closingCash), align: 'right' },
    { header: 'Difference', value: r => r.difference, align: 'right' },
    { header: 'Status', value: r => r.status },
  ];
  const meta = () => ({
    title: 'Shift Closing Report',
    subtitle: [
      filters.fromDate || filters.toDate ? `From ${filters.fromDate || '—'} to ${filters.toDate || '—'}` : 'All Dates',
      filters.operator ? `Operator: ${filters.operator}` : '',
      filters.status ? `Status: ${filters.status}` : '',
    ].filter(Boolean) as string[],
    totals: ['', '', '', 'TOTALS', '', inr(totalCashSales), inr(totalSales), inr(totalExpenses), '', totalDifference, ''],
  });
  const handleDownload = () => downloadReportCSV(records, columns, meta());
  const handlePrint = () => printReport(records, columns, meta());

  const handleDownloadOne = async (id: string) => {
    try {
      await shiftApi.downloadReport(id);
    } catch (err) {
      alert(describeError(err, 'Failed to download shift report'));
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shift Closing Report</h1>
          <p className="text-gray-600">View historical shift closing reports</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDownload} disabled={!records.length} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"><Download className="w-3 h-3" />Excel</button>
          <button onClick={handlePrint} disabled={!records.length} className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"><Printer className="w-3 h-3" />Print</button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {loading && (
        <div className="mb-4 rounded-md bg-blue-50 border border-blue-200 px-4 py-2 text-sm text-blue-700">
          Loading…
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-300 p-4 mb-4">
        <div className="grid grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
            <SearchableDropdown
              options={[
                { label: 'All Operators', value: '' },
                ...operatorList.map((op) => ({ label: op, value: op })),
              ]}
              value={filters.operator}
              onValueChange={(val) => setFilters({ ...filters, operator: val })}
              placeholder="All Operators"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <SearchableDropdown
              options={[
                { label: 'All Status', value: '' },
                { label: 'Balanced', value: 'Balanced' },
                { label: 'Short', value: 'Short' },
                { label: 'Excess', value: 'Excess' }
              ]}
              value={filters.status}
              onValueChange={(val) => setFilters({ ...filters, status: val })}
              placeholder="All Status"
              className="w-full"
            />
          </div>
          <div className="flex items-end"></div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-600">Total Shifts</div>
          <div className="text-2xl font-bold text-gray-900">{records.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-600">Total Sales</div>
          <div className="text-2xl font-bold text-blue-600">₹{totalSales.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-600">Cash Sales</div>
          <div className="text-2xl font-bold text-green-600">₹{totalCashSales.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-600">Total Difference</div>
          <div className={`text-2xl font-bold ${totalDifference < 0 ? 'text-red-600' : totalDifference > 0 ? 'text-green-600' : 'text-gray-900'}`}>
            ₹{Math.abs(totalDifference).toLocaleString()}
            {totalDifference < 0 && ' Short'}
            {totalDifference > 0 && ' Excess'}
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-lg border border-gray-300">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-300">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shift No</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operator</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Opening</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cash Sales</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Card/UPI</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Sales</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Expenses</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Closing</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Diff</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {records.map((record) => (
                <tr key={record.shiftNo} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">{record.shiftNo}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {record.date}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                      record.shiftType === 'Day' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {record.shiftType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {record.operator}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">₹{record.openingCash.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-gray-900">₹{record.salesCash.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-gray-600">₹{(record.salesCard + record.salesUPI).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-medium text-blue-600">₹{record.totalSales.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-red-600">₹{record.expenses.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">₹{record.closingCash.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${record.difference < 0 ? 'text-red-600' : record.difference > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                      {record.difference === 0 ? '0' : (record.difference > 0 ? '+' : '') + record.difference}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                      record.status === 'Balanced' ? 'bg-green-100 text-green-800' :
                      record.status === 'Short' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleDownloadOne(record.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 border border-blue-200 rounded"
                      title="Download shift closing report"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-300">
              <tr className="font-bold">
                <td colSpan={5} className="px-4 py-3 text-right text-gray-900">TOTALS:</td>
                <td className="px-4 py-3 text-right text-gray-900">₹{totalCashSales.toLocaleString()}</td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 text-right text-blue-600">₹{totalSales.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-red-600">₹{totalExpenses.toLocaleString()}</td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-bold ${totalDifference < 0 ? 'text-red-600' : totalDifference > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                    {totalDifference === 0 ? '0' : (totalDifference > 0 ? '+' : '') + totalDifference}
                  </span>
                </td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};