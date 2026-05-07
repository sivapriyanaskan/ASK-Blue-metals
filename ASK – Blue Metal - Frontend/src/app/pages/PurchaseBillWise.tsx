import { useState } from 'react';
import { Search, Download, Calendar, Printer } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';

export const PurchaseBillWise = () => {
  const [dateFrom, setDateFrom] = useState('2026-02-01');
  const [dateTo, setDateTo] = useState('2026-02-28');
  const [filterSupplier, setFilterSupplier] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const purchaseBills = [
    { billNo: 'PUR/02/001/26', date: '2026-02-05T10:30:00', supplier: 'Quarry Supplies Ltd.', itemName: 'Raw Stone - 20mm', qty: 50.000, rate: 5000, amount: 250000, gst: 12500, total: 262500, paymentMode: 'Credit' },
    { billNo: 'PUR/02/002/26', date: '2026-02-06T11:15:00', supplier: 'Quarry Supplies Ltd.', itemName: 'Raw Stone - 40mm', qty: 45.000, rate: 4900, amount: 220500, gst: 11025, total: 231525, paymentMode: 'Credit' },
    { billNo: 'PUR/02/003/26', date: '2026-02-08T09:45:00', supplier: 'Stone Masters', itemName: 'Raw Stone - 10mm', qty: 40.000, rate: 5100, amount: 204000, gst: 10200, total: 214200, paymentMode: 'Cash' },
    { billNo: 'PUR/02/005/26', date: '2026-02-12T14:20:00', supplier: 'Stone Masters', itemName: 'Raw Stone - 20mm', qty: 48.500, rate: 5100, amount: 247350, gst: 12367.50, total: 259717.50, paymentMode: 'Credit' },
    { billNo: 'PUR/02/007/26', date: '2026-02-14T08:30:00', supplier: 'Rock Aggregates Pvt Ltd', itemName: 'Raw Stone - 40mm', qty: 48.200, rate: 4880, amount: 235216, gst: 11760.80, total: 246976.80, paymentMode: 'Cash' },
    { billNo: 'PUR/02/010/26', date: '2026-02-18T10:00:00', supplier: 'Quarry Supplies Ltd.', itemName: 'Raw Stone - 20mm', qty: 52.000, rate: 4950, amount: 257400, gst: 12870, total: 270270, paymentMode: 'Credit' },
    { billNo: 'PUR/02/011/26', date: '2026-02-16T13:45:00', supplier: 'Rock Aggregates Pvt Ltd', itemName: 'Raw Stone - 10mm', qty: 38.750, rate: 5050, amount: 195687.50, gst: 9784.38, total: 205471.88, paymentMode: 'Cash' },
    { billNo: 'PUR/02/013/26', date: '2026-02-20T11:30:00', supplier: 'Stone Masters', itemName: 'Raw Stone - 40mm', qty: 42.000, rate: 4920, amount: 206640, gst: 10332, total: 216972, paymentMode: 'Credit' }
  ];

  const filteredData = purchaseBills.filter(bill => {
    const matchesSearch = 
      bill.billNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.itemName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSupplier = filterSupplier === 'All' || bill.supplier === filterSupplier;
    
    return matchesSearch && matchesSupplier;
  });

  const totals = filteredData.reduce((acc, bill) => ({
    quantity: acc.quantity + bill.qty,
    amount: acc.amount + bill.amount,
    gst: acc.gst + bill.gst,
    total: acc.total + bill.total
  }), { quantity: 0, amount: 0, gst: 0, total: 0 });

  return (
    <div className="p-6">
      <div className="mb-4 pb-3 border-b border-gray-300">
        <h1 className="text-xl font-bold text-gray-900">Purchase Bill Wise</h1>
      </div>

      <div className="bg-white rounded-lg border border-gray-300 p-4 mb-6">
        <div className="grid grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
            <SearchableDropdown
              options={[
                { value: 'All', label: 'All' },
                { value: 'Quarry Supplies Ltd.', label: 'Quarry Supplies Ltd.' },
                { value: 'Stone Masters', label: 'Stone Masters' },
                { value: 'Rock Aggregates Pvt Ltd', label: 'Rock Aggregates Pvt Ltd' },
              ]}
              value={filterSupplier} onChange={setFilterSupplier} placeholder="Select Supplier" searchPlaceholder="Search suppliers..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Bill No, Supplier, Item..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <button className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors">
              <Download className="w-4 h-4" /> Excel
            </button>
            <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors">
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-600 mb-1">Total Bills</div>
          <div className="text-2xl font-bold text-gray-900">{filteredData.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-600 mb-1">Total Quantity</div>
          <div className="text-2xl font-bold text-gray-900">{totals.quantity.toFixed(2)} T</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-600 mb-1">Total GST</div>
          <div className="text-2xl font-bold text-orange-600">₹{totals.gst.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-600 mb-1">Grand Total</div>
          <div className="text-2xl font-bold text-green-600">₹{totals.total.toLocaleString()}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-300">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Bill No</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Supplier</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Item</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Qty (T)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Rate</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Amount</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">GST</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Total</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.map((bill) => (
                <tr key={bill.billNo} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{new Date(bill.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' })}</td>
                  <td className="px-4 py-3 text-sm font-mono font-medium text-blue-600">{bill.billNo}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{bill.supplier}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{bill.itemName}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{bill.qty.toFixed(3)}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900">₹{bill.rate}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900">₹{bill.amount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900">₹{bill.gst.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-green-600">₹{bill.total.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${bill.paymentMode === 'Cash' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{bill.paymentMode}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-900 text-white font-bold">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-sm text-right">TOTAL:</td>
                <td className="px-4 py-3 text-sm text-right">{totals.quantity.toFixed(3)}</td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 text-sm text-right">₹{totals.amount.toFixed(2)}</td>
                <td className="px-4 py-3 text-sm text-right">₹{totals.gst.toFixed(2)}</td>
                <td className="px-4 py-3 text-sm text-right">₹{totals.total.toFixed(2)}</td>
                <td className="px-4 py-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
        {filteredData.length === 0 && (<div className="p-8 text-center text-gray-500">No purchase bills found for the selected criteria</div>)}
      </div>
    </div>
  );
};
