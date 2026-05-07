import { useState } from 'react';
import { Calendar, Package, TrendingDown } from 'lucide-react';

interface RawMaterialRecord {
  purchaseBillNo: string;
  purchaseDate: string;
  supplierName: string;
  rawMaterialItem: string;
  purchaseQty: number;
  producedItem: string;
  producedQty: number;
  consumedQty: number;
  wastage: number;
  wastagePercent: number;
  balanceQty: number;
}

const mockRawMaterialPurchaseWise: RawMaterialRecord[] = [
  {
    purchaseBillNo: 'PB-0001',
    purchaseDate: '2026-02-25',
    supplierName: 'RK Stone Suppliers',
    rawMaterialItem: 'Raw Stone',
    purchaseQty: 30000,
    producedItem: 'Blue Metal 20mm',
    producedQty: 25000,
    consumedQty: 30000,
    wastage: 5000,
    wastagePercent: 16.67,
    balanceQty: 0
  },
  {
    purchaseBillNo: 'PB-0002',
    purchaseDate: '2026-02-23',
    supplierName: 'Marble Traders Co.',
    rawMaterialItem: 'Raw Marble',
    purchaseQty: 25000,
    producedItem: 'Blue Metal 12mm',
    producedQty: 20000,
    consumedQty: 25000,
    wastage: 5000,
    wastagePercent: 20,
    balanceQty: 0
  },
  {
    purchaseBillNo: 'PB-0003',
    purchaseDate: '2026-02-20',
    supplierName: 'RK Stone Suppliers',
    rawMaterialItem: 'Raw Stone',
    purchaseQty: 35000,
    producedItem: 'Blue Metal 20mm',
    producedQty: 28000,
    consumedQty: 33000,
    wastage: 5000,
    wastagePercent: 15.15,
    balanceQty: 2000
  }
];

export const RawMaterialPurchaseWise = () => {
  const [records] = useState<RawMaterialRecord[]>(mockRawMaterialPurchaseWise);
  const [filters, setFilters] = useState({
    fromDate: '2026-02-01',
    toDate: '2026-02-28'
  });

  const totalPurchased = records.reduce((sum, r) => sum + r.purchaseQty, 0);
  const totalProduced = records.reduce((sum, r) => sum + r.producedQty, 0);
  const totalWastage = records.reduce((sum, r) => sum + r.wastage, 0);
  const totalBalance = records.reduce((sum, r) => sum + r.balanceQty, 0);
  const avgWastagePercent = (totalWastage / totalPurchased * 100).toFixed(2);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Raw Material - Purchase Wise</h1>
        <p className="text-gray-600">Track raw material consumption by purchase</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-300 p-4 mb-4">
        <div className="grid grid-cols-2 gap-4 max-w-xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4 mb-4">
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-600">Total Purchased</div>
          <div className="text-2xl font-bold text-gray-900">{totalPurchased.toLocaleString()} KG</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-600">Total Produced</div>
          <div className="text-2xl font-bold text-green-600">{totalProduced.toLocaleString()} KG</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-600">Total Wastage</div>
          <div className="text-2xl font-bold text-red-600">{totalWastage.toLocaleString()} KG</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-600">Avg Wastage %</div>
          <div className="text-2xl font-bold text-orange-600">{avgWastagePercent}%</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-600">Balance Stock</div>
          <div className="text-2xl font-bold text-blue-600">{totalBalance.toLocaleString()} KG</div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-lg border border-gray-300">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-300">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase Bill</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Raw Material</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Purchase Qty</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produced Item</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Produced Qty</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Consumed</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Wastage</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Wastage %</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {records.map((record, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">{record.purchaseBillNo}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {record.purchaseDate}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-900">{record.supplierName}</td>
                  <td className="px-4 py-3 text-gray-900">
                    <div className="flex items-center gap-1">
                      <Package className="w-3 h-3 text-gray-400" />
                      {record.rawMaterialItem}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">{record.purchaseQty.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-900">{record.producedItem}</td>
                  <td className="px-4 py-3 text-right text-green-600 font-medium">{record.producedQty.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-blue-600">{record.consumedQty.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-red-600 font-medium">
                    <div className="flex items-center justify-end gap-1">
                      <TrendingDown className="w-3 h-3" />
                      {record.wastage.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-orange-600 font-medium">{record.wastagePercent.toFixed(2)}%</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{record.balanceQty.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-300">
              <tr className="font-bold">
                <td colSpan={4} className="px-4 py-3 text-right text-gray-900">TOTALS:</td>
                <td className="px-4 py-3 text-right text-gray-900">{totalPurchased.toLocaleString()}</td>
                <td></td>
                <td className="px-4 py-3 text-right text-green-600">{totalProduced.toLocaleString()}</td>
                <td></td>
                <td className="px-4 py-3 text-right text-red-600">{totalWastage.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-orange-600">{avgWastagePercent}%</td>
                <td className="px-4 py-3 text-right text-blue-600">{totalBalance.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Purchase-Wise Tracking</h3>
        <p className="text-sm text-blue-800">
          This report shows raw material consumption tracked by purchase bill. Each purchase bill's raw material is tracked separately until fully consumed in production.
        </p>
      </div>
    </div>
  );
};
