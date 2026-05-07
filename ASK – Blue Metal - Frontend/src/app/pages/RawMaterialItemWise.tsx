import { useState } from 'react';
import { Package, TrendingUp, TrendingDown } from 'lucide-react';

interface ItemConsumption {
  itemName: string;
  openingStock: number;
  totalPurchased: number;
  totalConsumed: number;
  totalProduced: number;
  totalWastage: number;
  wastagePercent: number;
  closingStock: number;
}

const mockItemConsumption: ItemConsumption[] = [
  {
    itemName: 'Raw Stone',
    openingStock: 15000,
    totalPurchased: 95000,
    totalConsumed: 88000,
    totalProduced: 73000,
    totalWastage: 15000,
    wastagePercent: 17.05,
    closingStock: 22000
  },
  {
    itemName: 'Raw Marble',
    openingStock: 10000,
    totalPurchased: 50000,
    totalConsumed: 45000,
    totalProduced: 36000,
    wastagePercent: 20,
    totalWastage: 9000,
    closingStock: 15000
  },
  {
    itemName: 'Granite Raw',
    openingStock: 8000,
    totalPurchased: 40000,
    totalConsumed: 35000,
    totalProduced: 29000,
    totalWastage: 6000,
    wastagePercent: 17.14,
    closingStock: 13000
  }
];

export const RawMaterialItemWise = () => {
  const [records] = useState<ItemConsumption[]>(mockItemConsumption);

  const totalPurchased = records.reduce((sum, r) => sum + r.totalPurchased, 0);
  const totalConsumed = records.reduce((sum, r) => sum + r.totalConsumed, 0);
  const totalProduced = records.reduce((sum, r) => sum + r.totalProduced, 0);
  const totalWastage = records.reduce((sum, r) => sum + r.totalWastage, 0);
  const avgWastagePercent = (totalWastage / totalConsumed * 100).toFixed(2);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Raw Material - Item Wise</h1>
        <p className="text-gray-600">Track raw material consumption by item</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-600">Total Purchased</div>
          <div className="text-2xl font-bold text-gray-900">{totalPurchased.toLocaleString()} KG</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-600">Total Consumed</div>
          <div className="text-2xl font-bold text-blue-600">{totalConsumed.toLocaleString()} KG</div>
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
      </div>

      {/* Item-wise Summary */}
      <div className="bg-white rounded-lg border border-gray-300">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-300">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Opening Stock</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Purchased</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Consumed</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Produced</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Wastage</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Wastage %</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Closing Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {records.map((record, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{record.itemName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-600">
                    {record.openingStock.toLocaleString()} KG
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-900">
                    <div className="flex items-center justify-end gap-1">
                      <TrendingUp className="w-3 h-3 text-green-500" />
                      {record.totalPurchased.toLocaleString()} KG
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-blue-600 font-medium">
                    {record.totalConsumed.toLocaleString()} KG
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-green-600 font-medium">
                    {record.totalProduced.toLocaleString()} KG
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-red-600 font-medium">
                    <div className="flex items-center justify-end gap-1">
                      <TrendingDown className="w-3 h-3" />
                      {record.totalWastage.toLocaleString()} KG
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-orange-600 font-medium">
                    {record.wastagePercent.toFixed(2)}%
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-bold text-gray-900">
                    {record.closingStock.toLocaleString()} KG
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-300">
              <tr className="font-bold">
                <td className="px-6 py-3 text-right text-gray-900">TOTALS:</td>
                <td className="px-6 py-3 text-right text-gray-900">
                  {records.reduce((sum, r) => sum + r.openingStock, 0).toLocaleString()} KG
                </td>
                <td className="px-6 py-3 text-right text-gray-900">{totalPurchased.toLocaleString()} KG</td>
                <td className="px-6 py-3 text-right text-blue-600">{totalConsumed.toLocaleString()} KG</td>
                <td className="px-6 py-3 text-right text-green-600">{totalProduced.toLocaleString()} KG</td>
                <td className="px-6 py-3 text-right text-red-600">{totalWastage.toLocaleString()} KG</td>
                <td className="px-6 py-3 text-right text-orange-600">{avgWastagePercent}%</td>
                <td className="px-6 py-3 text-right text-gray-900">
                  {records.reduce((sum, r) => sum + r.closingStock, 0).toLocaleString()} KG
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        {records.map((record, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-300 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">{record.itemName}</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Conversion Rate:</span>
                <span className="font-medium text-gray-900">
                  {((record.totalProduced / record.totalConsumed) * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Wastage Rate:</span>
                <span className="font-medium text-red-600">{record.wastagePercent.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Available Stock:</span>
                <span className="font-medium text-blue-600">{record.closingStock.toLocaleString()} KG</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Item-Wise Tracking</h3>
        <p className="text-sm text-blue-800">
          This report provides an aggregated view of raw material consumption by item type. 
          It helps analyze overall efficiency, wastage patterns, and stock levels for each raw material.
        </p>
      </div>
    </div>
  );
};
