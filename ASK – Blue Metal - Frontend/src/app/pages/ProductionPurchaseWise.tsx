import { useState } from 'react';
import { Search, Download, Calendar, Printer, ChevronDown, ChevronRight } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';

export const ProductionPurchaseWise = () => {
  const [dateFrom, setDateFrom] = useState('2026-02-01');
  const [dateTo, setDateTo] = useState('2026-02-28');
  const [filterPurchase, setFilterPurchase] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPurchases, setExpandedPurchases] = useState<Set<string>>(new Set());

  const purchaseProduction = [
    {
      purchaseBillNo: 'PUR/02/001/26',
      purchaseDate: '2026-02-05',
      supplier: 'Quarry Supplies Ltd.',
      rawMaterial: 'Raw Stone - 20mm',
      purchasedQty: 50.000,
      totalUsed: 48.500,
      balance: 1.500,
      productions: [
        { entryNo: 'PROD/02/001', date: '2026-02-06', outputItem: '20mm Blue Metal', inputQty: 18.000, outputQty: 13.950 },
        { entryNo: 'PROD/02/005', date: '2026-02-12', outputItem: '20mm Blue Metal', inputQty: 15.500, outputQty: 12.015 },
        { entryNo: 'PROD/02/009', date: '2026-02-18', outputItem: '20mm Blue Metal', inputQty: 15.000, outputQty: 11.625 }
      ]
    },
    {
      purchaseBillNo: 'PUR/02/003/26',
      purchaseDate: '2026-02-08',
      supplier: 'Stone Masters',
      rawMaterial: 'Raw Stone - 10mm',
      purchasedQty: 40.000,
      totalUsed: 40.000,
      balance: 0,
      productions: [
        { entryNo: 'PROD/02/003', date: '2026-02-08', outputItem: '10mm Blue Metal', inputQty: 20.000, outputQty: 15.200 },
        { entryNo: 'PROD/02/010', date: '2026-02-16', outputItem: '10mm Blue Metal', inputQty: 20.000, outputQty: 15.200 }
      ]
    },
    {
      purchaseBillNo: 'PUR/02/002/26',
      purchaseDate: '2026-02-06',
      supplier: 'Quarry Supplies Ltd.',
      rawMaterial: 'Raw Stone - 40mm',
      purchasedQty: 45.000,
      totalUsed: 42.500,
      balance: 2.500,
      productions: [
        { entryNo: 'PROD/02/002', date: '2026-02-07', outputItem: '40mm Blue Metal', inputQty: 25.000, outputQty: 19.500 },
        { entryNo: 'PROD/02/007', date: '2026-02-14', outputItem: '40mm Blue Metal', inputQty: 17.500, outputQty: 13.650 }
      ]
    },
    {
      purchaseBillNo: 'PUR/02/005/26',
      purchaseDate: '2026-02-12',
      supplier: 'Stone Masters',
      rawMaterial: 'Raw Stone - 20mm',
      purchasedQty: 48.500,
      totalUsed: 48.500,
      balance: 0,
      productions: [
        { entryNo: 'PROD/02/013', date: '2026-02-22', outputItem: '20mm Blue Metal', inputQty: 22.000, outputQty: 17.050 },
        { entryNo: 'PROD/02/017', date: '2026-02-25', outputItem: '20mm Blue Metal', inputQty: 26.500, outputQty: 20.537 }
      ]
    }
  ];

  const filteredData = purchaseProduction.filter(purchase => {
    const matchesSearch = 
      purchase.purchaseBillNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.rawMaterial.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPurchase = filterPurchase === 'All' || purchase.purchaseBillNo === filterPurchase;
    
    return matchesSearch && matchesPurchase;
  });

  const totals = filteredData.reduce((acc, purchase) => ({
    purchasedQty: acc.purchasedQty + purchase.purchasedQty,
    usedQty: acc.usedQty + purchase.totalUsed,
    balance: acc.balance + purchase.balance
  }), { purchasedQty: 0, usedQty: 0, balance: 0 });

  const togglePurchase = (purchaseBillNo: string) => {
    const newExpanded = new Set(expandedPurchases);
    if (newExpanded.has(purchaseBillNo)) {
      newExpanded.delete(purchaseBillNo);
    } else {
      newExpanded.add(purchaseBillNo);
    }
    setExpandedPurchases(newExpanded);
  };

  return (
    <div className="p-6">
      <div className="mb-4 pb-3 border-b border-gray-300">
        <h1 className="text-xl font-bold text-gray-900">Production Purchase Wise</h1>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Bill</label>
            <SearchableDropdown
              options={[
                { value: 'All', label: 'All' },
                { value: 'PUR/02/001/26', label: 'PUR/02/001/26' },
                { value: 'PUR/02/002/26', label: 'PUR/02/002/26' },
                { value: 'PUR/02/003/26', label: 'PUR/02/003/26' },
              ]}
              value={filterPurchase} onChange={setFilterPurchase} placeholder="Select Purchase" searchPlaceholder="Search purchase bills..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Bill No, Supplier..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
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

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-600 mb-1">Total Purchased</div>
          <div className="text-2xl font-bold text-blue-600">{totals.purchasedQty.toFixed(2)} T</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-600 mb-1">Total Used</div>
          <div className="text-2xl font-bold text-green-600">{totals.usedQty.toFixed(2)} T</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-600 mb-1">Balance</div>
          <div className="text-2xl font-bold text-orange-600">{totals.balance.toFixed(2)} T</div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-300">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase w-8"></th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Purchase Bill</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Supplier</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Raw Material</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Purchased (T)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Used (T)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Balance (T)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.flatMap((purchase) => [
                <tr key={purchase.purchaseBillNo} className="hover:bg-gray-50 cursor-pointer" onClick={() => togglePurchase(purchase.purchaseBillNo)}>
                  <td className="px-4 py-3 text-sm">
                    {expandedPurchases.has(purchase.purchaseBillNo) ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono font-medium text-blue-600">{purchase.purchaseBillNo}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{purchase.purchaseDate}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{purchase.supplier}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{purchase.rawMaterial}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-blue-600">{purchase.purchasedQty.toFixed(3)}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-green-600">{purchase.totalUsed.toFixed(3)}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-orange-600">{purchase.balance.toFixed(3)}</td>
                </tr>,
                ...(expandedPurchases.has(purchase.purchaseBillNo) ? purchase.productions.map((prod) => (
                  <tr key={`${purchase.purchaseBillNo}-${prod.entryNo}`} className="bg-blue-50">
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2 text-xs font-mono text-blue-600">{prod.entryNo}</td>
                    <td className="px-4 py-2 text-xs text-gray-700">{prod.date}</td>
                    <td colSpan={2} className="px-4 py-2 text-xs text-gray-700">{prod.outputItem}</td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2 text-xs text-right text-gray-700">Input: {prod.inputQty.toFixed(3)}</td>
                    <td className="px-4 py-2 text-xs text-right text-gray-700">Output: {prod.outputQty.toFixed(3)}</td>
                  </tr>
                )) : [])
              ])}
            </tbody>
            <tfoot className="bg-gray-900 text-white font-bold">
              <tr>
                <td colSpan={5} className="px-4 py-3 text-sm text-right">GRAND TOTAL:</td>
                <td className="px-4 py-3 text-sm text-right">{totals.purchasedQty.toFixed(3)}</td>
                <td className="px-4 py-3 text-sm text-right">{totals.usedQty.toFixed(3)}</td>
                <td className="px-4 py-3 text-sm text-right">{totals.balance.toFixed(3)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        {filteredData.length === 0 && (<div className="p-8 text-center text-gray-500">No purchase-wise production data found for the selected criteria</div>)}
      </div>
    </div>
  );
};