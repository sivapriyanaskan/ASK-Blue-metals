import { useState } from 'react';
import { Search, Download, Calendar, Printer, ChevronDown, ChevronRight } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';

export const ProductionItemWise = () => {
  const [dateFrom, setDateFrom] = useState('2026-02-01');
  const [dateTo, setDateTo] = useState('2026-02-28');
  const [filterItem, setFilterItem] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const itemProduction = [
    {
      itemCode: 'FG001',
      itemName: '20mm Blue Metal',
      totalProductions: 6,
      totalQuantity: 325.500,
      totalRawMaterialUsed: 420.650,
      productions: [
        { entryNo: 'PROD/02/001', date: '2026-02-06', rawMaterial: 'Raw Stone - 20mm', inputQty: 70.000, outputQty: 54.250, wastage: 15.750 },
        { entryNo: 'PROD/02/005', date: '2026-02-12', rawMaterial: 'Raw Stone - 20mm', inputQty: 68.500, outputQty: 53.100, wastage: 15.400 },
        { entryNo: 'PROD/02/009', date: '2026-02-18', rawMaterial: 'Raw Stone - 20mm', inputQty: 72.000, outputQty: 55.800, wastage: 16.200 },
        { entryNo: 'PROD/02/013', date: '2026-02-22', rawMaterial: 'Raw Stone - 20mm', inputQty: 65.000, outputQty: 50.050, wastage: 14.950 },
        { entryNo: 'PROD/02/017', date: '2026-02-25', rawMaterial: 'Raw Stone - 20mm', inputQty: 70.150, outputQty: 54.300, wastage: 15.850 },
        { entryNo: 'PROD/02/020', date: '2026-02-27', rawMaterial: 'Raw Stone - 20mm', inputQty: 75.000, outputQty: 58.000, wastage: 17.000 }
      ]
    },
    {
      itemCode: 'FG002',
      itemName: '10mm Blue Metal',
      totalProductions: 4,
      totalQuantity: 195.800,
      totalRawMaterialUsed: 258.400,
      productions: [
        { entryNo: 'PROD/02/003', date: '2026-02-08', rawMaterial: 'Raw Stone - 10mm', inputQty: 65.000, outputQty: 49.200, wastage: 15.800 },
        { entryNo: 'PROD/02/010', date: '2026-02-16', rawMaterial: 'Raw Stone - 10mm', inputQty: 63.500, outputQty: 48.000, wastage: 15.500 },
        { entryNo: 'PROD/02/015', date: '2026-02-23', rawMaterial: 'Raw Stone - 10mm', inputQty: 68.900, outputQty: 52.100, wastage: 16.800 },
        { entryNo: 'PROD/02/019', date: '2026-02-26', rawMaterial: 'Raw Stone - 10mm', inputQty: 61.000, outputQty: 46.500, wastage: 14.500 }
      ]
    },
    {
      itemCode: 'FG003',
      itemName: '40mm Blue Metal',
      totalProductions: 5,
      totalQuantity: 268.650,
      totalRawMaterialUsed: 345.000,
      productions: [
        { entryNo: 'PROD/02/002', date: '2026-02-07', rawMaterial: 'Raw Stone - 40mm', inputQty: 70.000, outputQty: 54.600, wastage: 15.400 },
        { entryNo: 'PROD/02/007', date: '2026-02-14', rawMaterial: 'Raw Stone - 40mm', inputQty: 68.000, outputQty: 53.000, wastage: 15.000 },
        { entryNo: 'PROD/02/011', date: '2026-02-19', rawMaterial: 'Raw Stone - 40mm', inputQty: 72.500, outputQty: 56.550, wastage: 15.950 },
        { entryNo: 'PROD/02/014', date: '2026-02-21', rawMaterial: 'Raw Stone - 40mm', inputQty: 66.500, outputQty: 51.900, wastage: 14.600 },
        { entryNo: 'PROD/02/018', date: '2026-02-24', rawMaterial: 'Raw Stone - 40mm', inputQty: 68.000, outputQty: 52.600, wastage: 15.400 }
      ]
    }
  ];

  const filteredData = itemProduction.filter(item => {
    const matchesSearch = 
      item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.itemCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesItem = filterItem === 'All' || item.itemName === filterItem;
    
    return matchesSearch && matchesItem;
  });

  const totals = filteredData.reduce((acc, item) => ({
    productions: acc.productions + item.totalProductions,
    inputQty: acc.inputQty + item.totalRawMaterialUsed,
    outputQty: acc.outputQty + item.totalQuantity
  }), { productions: 0, inputQty: 0, outputQty: 0 });

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
        <h1 className="text-xl font-bold text-gray-900">Production Item Wise</h1>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Item</label>
            <SearchableDropdown
              options={[
                { value: 'All', label: 'All' },
                { value: '20mm Blue Metal', label: '20mm Blue Metal' },
                { value: '10mm Blue Metal', label: '10mm Blue Metal' },
                { value: '40mm Blue Metal', label: '40mm Blue Metal' },
              ]}
              value={filterItem} onChange={setFilterItem} placeholder="Select Item" searchPlaceholder="Search items..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Item name or code..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
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
          <div className="text-sm text-gray-600 mb-1">Total Items</div>
          <div className="text-2xl font-bold text-gray-900">{filteredData.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-600 mb-1">Productions</div>
          <div className="text-2xl font-bold text-gray-900">{totals.productions}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-600 mb-1">Input Qty</div>
          <div className="text-2xl font-bold text-orange-600">{totals.inputQty.toFixed(2)} T</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-600 mb-1">Output Qty</div>
          <div className="text-2xl font-bold text-green-600">{totals.outputQty.toFixed(2)} T</div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-300">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase w-8"></th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Item Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Item Name</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Productions</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Input Qty (T)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Output Qty (T)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Wastage %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.flatMap((item) => [
                <tr key={item.itemCode} className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleItem(item.itemCode)}>
                  <td className="px-4 py-3 text-sm">
                    {expandedItems.has(item.itemCode) ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-900">{item.itemCode}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.itemName}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900">{item.totalProductions}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-orange-600">{item.totalRawMaterialUsed.toFixed(3)}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-green-600">{item.totalQuantity.toFixed(3)}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900">{((1 - item.totalQuantity / item.totalRawMaterialUsed) * 100).toFixed(2)}%</td>
                </tr>,
                ...(expandedItems.has(item.itemCode) ? item.productions.map((prod) => (
                  <tr key={`${item.itemCode}-${prod.entryNo}`} className="bg-blue-50">
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2 text-xs font-mono text-blue-600">{prod.entryNo}</td>
                    <td className="px-4 py-2 text-xs text-gray-700">{prod.date} | {prod.rawMaterial}</td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2 text-xs text-right text-gray-700">{prod.inputQty.toFixed(3)}</td>
                    <td className="px-4 py-2 text-xs text-right text-gray-700">{prod.outputQty.toFixed(3)}</td>
                    <td className="px-4 py-2 text-xs text-right text-gray-700">{prod.wastage.toFixed(3)}</td>
                  </tr>
                )) : [])
              ])}
            </tbody>
            <tfoot className="bg-gray-900 text-white font-bold">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-sm text-right">GRAND TOTAL:</td>
                <td className="px-4 py-3 text-sm text-right">{totals.productions}</td>
                <td className="px-4 py-3 text-sm text-right">{totals.inputQty.toFixed(3)}</td>
                <td className="px-4 py-3 text-sm text-right">{totals.outputQty.toFixed(3)}</td>
                <td className="px-4 py-3 text-sm text-right">{((1 - totals.outputQty / totals.inputQty) * 100).toFixed(2)}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
        {filteredData.length === 0 && (<div className="p-8 text-center text-gray-500">No item-wise production data found for the selected criteria</div>)}
      </div>
    </div>
  );
};