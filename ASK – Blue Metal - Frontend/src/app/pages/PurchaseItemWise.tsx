import { useState } from 'react';
import { Search, Download, Calendar, Printer, ChevronDown, ChevronRight } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';

export const PurchaseItemWise = () => {
  const [dateFrom, setDateFrom] = useState('2026-02-01');
  const [dateTo, setDateTo] = useState('2026-02-28');
  const [filterItem, setFilterItem] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const itemPurchases = [
    {
      itemCode: 'RM001',
      itemName: 'Raw Stone - 20mm',
      totalPurchases: 5,
      totalQuantity: 245.500,
      totalAmount: 1227500.00,
      avgRate: 5000,
      purchases: [
        { billNo: 'PUR/02/001/26', date: '2026-02-05', supplier: 'Quarry Supplies Ltd', qty: 50.000, rate: 5000, amount: 250000 },
        { billNo: 'PUR/02/005/26', date: '2026-02-12', supplier: 'Stone Masters', qty: 48.500, rate: 5100, amount: 247350 },
        { billNo: 'PUR/02/010/26', date: '2026-02-18', supplier: 'Quarry Supplies Ltd', qty: 52.000, rate: 4950, amount: 257400 },
        { billNo: 'PUR/02/015/26', date: '2026-02-22', supplier: 'Rock Aggregates Pvt', qty: 45.000, rate: 5050, amount: 227250 },
        { billNo: 'PUR/02/020/26', date: '2026-02-26', supplier: 'Quarry Supplies Ltd', qty: 50.000, rate: 4900, amount: 245000 }
      ]
    },
    {
      itemCode: 'RM002',
      itemName: 'Raw Stone - 10mm',
      totalPurchases: 3,
      totalQuantity: 120.750,
      totalAmount: 610800.00,
      avgRate: 5060,
      purchases: [
        { billNo: 'PUR/02/003/26', date: '2026-02-08', supplier: 'Stone Masters', qty: 40.000, rate: 5100, amount: 204000 },
        { billNo: 'PUR/02/011/26', date: '2026-02-16', supplier: 'Rock Aggregates Pvt', qty: 38.750, rate: 5050, amount: 195687.50 },
        { billNo: 'PUR/02/018/26', date: '2026-02-24', supplier: 'Stone Masters', qty: 42.000, rate: 5027, amount: 211134 }
      ]
    },
    {
      itemCode: 'RM003',
      itemName: 'Raw Stone - 40mm',
      totalPurchases: 4,
      totalQuantity: 180.200,
      totalAmount: 882180.00,
      avgRate: 4896,
      purchases: [
        { billNo: 'PUR/02/002/26', date: '2026-02-06', supplier: 'Quarry Supplies Ltd', qty: 45.000, rate: 4900, amount: 220500 },
        { billNo: 'PUR/02/007/26', date: '2026-02-14', supplier: 'Rock Aggregates Pvt', qty: 48.200, rate: 4880, amount: 235216 },
        { billNo: 'PUR/02/013/26', date: '2026-02-20', supplier: 'Stone Masters', qty: 42.000, rate: 4920, amount: 206640 },
        { billNo: 'PUR/02/019/26', date: '2026-02-25', supplier: 'Quarry Supplies Ltd', qty: 45.000, rate: 4896, amount: 220320 }
      ]
    }
  ];

  const filteredData = itemPurchases.filter(item => {
    const matchesSearch = 
      item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.itemCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesItem = filterItem === 'All' || item.itemName === filterItem;
    
    return matchesSearch && matchesItem;
  });

  const totals = filteredData.reduce((acc, item) => ({
    purchases: acc.purchases + item.totalPurchases,
    quantity: acc.quantity + item.totalQuantity,
    amount: acc.amount + item.totalAmount
  }), { purchases: 0, quantity: 0, amount: 0 });

  const toggleItem = (itemCode: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemCode)) {
      newExpanded.delete(itemCode);
    } else {
      newExpanded.add(itemCode);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <div className="p-6">
      <div className="mb-4 pb-3 border-b border-gray-300">
        <h1 className="text-xl font-bold text-gray-900">Purchase Item Wise</h1>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Item</label>
            <SearchableDropdown
              options={[
                { value: 'All', label: 'All' },
                { value: 'Raw Stone - 20mm', label: 'Raw Stone - 20mm' },
                { value: 'Raw Stone - 10mm', label: 'Raw Stone - 10mm' },
                { value: 'Raw Stone - 40mm', label: 'Raw Stone - 40mm' },
              ]}
              value={filterItem}
              onChange={setFilterItem}
              placeholder="Select Item"
              searchPlaceholder="Search items..."
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
                placeholder="Item name or code..."
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
          <div className="text-sm text-gray-600 mb-1">Total Items</div>
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

      {/* Item-wise Table */}
      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-300">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase w-8"></th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Item Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Item Name</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Purchases</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Qty (T)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Avg Rate</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.flatMap((item) => [
                <tr key={item.itemCode} className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleItem(item.itemCode)}>
                  <td className="px-4 py-3 text-sm">
                    {expandedItems.has(item.itemCode) ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-900">{item.itemCode}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.itemName}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900">{item.totalPurchases}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{item.totalQuantity.toFixed(3)}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900">₹{item.avgRate}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-green-600">₹{item.totalAmount.toFixed(2)}</td>
                </tr>,
                ...(expandedItems.has(item.itemCode) ? item.purchases.map((purchase) => (
                  <tr key={`${item.itemCode}-${purchase.billNo}`} className="bg-blue-50">
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2 text-xs font-mono text-blue-600">{purchase.billNo}</td>
                    <td className="px-4 py-2 text-xs text-gray-700">{purchase.date} | {purchase.supplier}</td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2 text-xs text-right text-gray-700">{purchase.qty.toFixed(3)}</td>
                    <td className="px-4 py-2 text-xs text-right text-gray-700">₹{purchase.rate}</td>
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
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 text-sm text-right">₹{totals.amount.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {filteredData.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No item-wise purchase data found for the selected criteria
          </div>
        )}
      </div>
    </div>
  );
};