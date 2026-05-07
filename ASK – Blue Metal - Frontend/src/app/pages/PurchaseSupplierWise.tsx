import { useState } from 'react';
import { Search, Download, Calendar, Printer, ChevronDown, ChevronRight } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';

export const PurchaseSupplierWise = () => {
  const [dateFrom, setDateFrom] = useState('2026-02-01');
  const [dateTo, setDateTo] = useState('2026-02-28');
  const [filterSupplier, setFilterSupplier] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<string>>(new Set());

  const supplierPurchases = [
    {
      supplierCode: 'SUP001',
      supplierName: 'Quarry Supplies Ltd.',
      totalPurchases: 6,
      totalQuantity: 287.000,
      totalAmount: 1418420.00,
      purchases: [
        { billNo: 'PUR/02/001/26', date: '2026-02-05', itemName: 'Raw Stone - 20mm', qty: 50.000, rate: 5000, amount: 250000 },
        { billNo: 'PUR/02/002/26', date: '2026-02-06', itemName: 'Raw Stone - 40mm', qty: 45.000, rate: 4900, amount: 220500 },
        { billNo: 'PUR/02/010/26', date: '2026-02-18', itemName: 'Raw Stone - 20mm', qty: 52.000, rate: 4950, amount: 257400 },
        { billNo: 'PUR/02/019/26', date: '2026-02-25', itemName: 'Raw Stone - 40mm', qty: 45.000, rate: 4896, amount: 220320 },
        { billNo: 'PUR/02/020/26', date: '2026-02-26', itemName: 'Raw Stone - 20mm', qty: 50.000, rate: 4900, amount: 245000 },
        { billNo: 'PUR/02/021/26', date: '2026-02-28', itemName: 'Raw Stone - 10mm', qty: 45.000, rate: 5050, amount: 227250 }
      ]
    },
    {
      supplierCode: 'SUP002',
      supplierName: 'Stone Masters',
      totalPurchases: 4,
      totalQuantity: 178.500,
      totalAmount: 907164.00,
      purchases: [
        { billNo: 'PUR/02/003/26', date: '2026-02-08', itemName: 'Raw Stone - 10mm', qty: 40.000, rate: 5100, amount: 204000 },
        { billNo: 'PUR/02/005/26', date: '2026-02-12', itemName: 'Raw Stone - 20mm', qty: 48.500, rate: 5100, amount: 247350 },
        { billNo: 'PUR/02/013/26', date: '2026-02-20', itemName: 'Raw Stone - 40mm', qty: 42.000, rate: 4920, amount: 206640 },
        { billNo: 'PUR/02/018/26', date: '2026-02-24', itemName: 'Raw Stone - 10mm', qty: 48.000, rate: 5186, amount: 248928 }
      ]
    },
    {
      supplierCode: 'SUP003',
      supplierName: 'Rock Aggregates Pvt Ltd',
      totalPurchases: 3,
      totalQuantity: 131.950,
      totalAmount: 658153.50,
      purchases: [
        { billNo: 'PUR/02/007/26', date: '2026-02-14', itemName: 'Raw Stone - 40mm', qty: 48.200, rate: 4880, amount: 235216 },
        { billNo: 'PUR/02/011/26', date: '2026-02-16', itemName: 'Raw Stone - 10mm', qty: 38.750, rate: 5050, amount: 195687.50 },
        { billNo: 'PUR/02/015/26', date: '2026-02-22', itemName: 'Raw Stone - 20mm', qty: 45.000, rate: 5050, amount: 227250 }
      ]
    }
  ];

  const filteredData = supplierPurchases.filter(supplier => {
    const matchesSearch = 
      supplier.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.supplierCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSupplier = filterSupplier === 'All' || supplier.supplierName === filterSupplier;
    
    return matchesSearch && matchesSupplier;
  });

  const totals = filteredData.reduce((acc, supplier) => ({
    purchases: acc.purchases + supplier.totalPurchases,
    quantity: acc.quantity + supplier.totalQuantity,
    amount: acc.amount + supplier.totalAmount
  }), { purchases: 0, quantity: 0, amount: 0 });

  const toggleSupplier = (supplierCode: string) => {
    const newExpanded = new Set(expandedSuppliers);
    if (newExpanded.has(supplierCode)) {
      newExpanded.delete(supplierCode);
    } else {
      newExpanded.add(supplierCode);
    }
    setExpandedSuppliers(newExpanded);
  };

  return (
    <div className="p-6">
      <div className="mb-4 pb-3 border-b border-gray-300">
        <h1 className="text-xl font-bold text-gray-900">Purchase Supplier Wise</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-300 p-4 mb-6">
        <div className="grid grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
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
              value={filterSupplier}
              onChange={setFilterSupplier}
              placeholder="Select Supplier"
              searchPlaceholder="Search suppliers..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Supplier name or code..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-end gap-2">
            <button className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors">
              <Download className="w-4 h-4" />
              Excel
            </button>
            <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors">
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-600 mb-1">Total Suppliers</div>
          <div className="text-2xl font-bold text-gray-900">{filteredData.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-600 mb-1">Total Purchases</div>
          <div className="text-2xl font-bold text-gray-900">{totals.purchases}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-600 mb-1">Total Quantity</div>
          <div className="text-2xl font-bold text-gray-900">{totals.quantity.toFixed(2)} T</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-600 mb-1">Total Amount</div>
          <div className="text-2xl font-bold text-green-600">₹{totals.amount.toLocaleString()}</div>
        </div>
      </div>

      {/* Supplier-wise Table */}
      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-300">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase w-8"></th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Supplier Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Supplier Name</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Purchases</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Qty (T)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.flatMap((supplier) => [
                <tr key={supplier.supplierCode} className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleSupplier(supplier.supplierCode)}>
                  <td className="px-4 py-3 text-sm">
                    {expandedSuppliers.has(supplier.supplierCode) ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-900">{supplier.supplierCode}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{supplier.supplierName}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900">{supplier.totalPurchases}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{supplier.totalQuantity.toFixed(3)}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-green-600">₹{supplier.totalAmount.toFixed(2)}</td>
                </tr>,
                ...(expandedSuppliers.has(supplier.supplierCode) ? supplier.purchases.map((purchase) => (
                  <tr key={`${supplier.supplierCode}-${purchase.billNo}`} className="bg-blue-50">
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2 text-xs font-mono text-blue-600">{purchase.billNo}</td>
                    <td className="px-4 py-2 text-xs text-gray-700">{purchase.date} | {purchase.itemName}</td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2 text-xs text-right text-gray-700">{purchase.qty.toFixed(3)}</td>
                    <td className="px-4 py-2 text-xs text-right text-gray-700">₹{purchase.amount.toFixed(2)}</td>
                  </tr>
                )) : [])
              ])}
            </tbody>
            <tfoot className="bg-gray-900 text-white font-bold">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-sm text-right">GRAND TOTAL:</td>
                <td className="px-4 py-3 text-sm text-right">{totals.purchases}</td>
                <td className="px-4 py-3 text-sm text-right">{totals.quantity.toFixed(3)}</td>
                <td className="px-4 py-3 text-sm text-right">₹{totals.amount.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {filteredData.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No supplier-wise purchase data found for the selected criteria
          </div>
        )}
      </div>
    </div>
  );
};