import { useState } from 'react';
import { Calendar, Fuel, Download, TrendingUp } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';

interface FuelRecord {
  id: string;
  date: string;
  vehicleNo: string;
  driverName: string;
  quantity: number;
  rate: number;
  amount: number;
  odometerReading: number;
  pumpName: string;
  billNo: string;
}

const mockFuelRecords: FuelRecord[] = [
  {
    id: 'FE-001',
    date: '2026-02-28',
    vehicleNo: 'MH-12-AB-1234',
    driverName: 'Ramesh Kumar',
    quantity: 50,
    rate: 105,
    amount: 5250,
    odometerReading: 45230,
    pumpName: 'HP Petrol Pump',
    billNo: 'HP-12345'
  },
  {
    id: 'FE-002',
    date: '2026-02-27',
    vehicleNo: 'MH-12-CD-5678',
    driverName: 'Suresh Patil',
    quantity: 65,
    rate: 105,
    amount: 6825,
    odometerReading: 58200,
    pumpName: 'Bharat Petroleum',
    billNo: 'BP-67890'
  },
  {
    id: 'FE-003',
    date: '2026-02-26',
    vehicleNo: 'MH-12-AB-1234',
    driverName: 'Ramesh Kumar',
    quantity: 45,
    rate: 104,
    amount: 4680,
    odometerReading: 44850,
    pumpName: 'HP Petrol Pump',
    billNo: 'HP-12340'
  }
];

export const FuelRegister = () => {
  const [records] = useState<FuelRecord[]>(mockFuelRecords);
  const [filters, setFilters] = useState({
    fromDate: '2026-02-01',
    toDate: '2026-02-28',
    vehicleNo: ''
  });

  const totalQuantity = records.reduce((sum, r) => sum + r.quantity, 0);
  const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);
  const avgRate = totalAmount / totalQuantity;
  const uniqueVehicles = [...new Set(records.map(r => r.vehicleNo))].length;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fuel Register</h1>
        <p className="text-gray-600">View fuel consumption records for all vehicles</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-300 p-4 mb-4">
        <div className="grid grid-cols-4 gap-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle</label>
            <SearchableDropdown
              options={[
                { label: 'All Vehicles', value: '' },
                ...[...new Set(records.map(r => r.vehicleNo))].map(v => ({ label: v, value: v }))
              ]}
              value={filters.vehicleNo}
              onValueChange={(val) => setFilters({ ...filters, vehicleNo: val })}
              placeholder="All Vehicles"
              className="w-full"
            />
          </div>
          <div className="flex items-end">
            <button className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Fuel className="w-5 h-5 text-blue-600" />
            <div className="text-sm text-gray-600">Total Fuel</div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{totalQuantity} L</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <div className="text-sm text-gray-600">Total Amount</div>
          </div>
          <div className="text-2xl font-bold text-green-600">₹{totalAmount.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-600 mb-2">Average Rate</div>
          <div className="text-2xl font-bold text-blue-600">₹{avgRate.toFixed(2)}/L</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-600 mb-2">Vehicles</div>
          <div className="text-2xl font-bold text-gray-900">{uniqueVehicles}</div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-lg border border-gray-300">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-300">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty (L)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Odometer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pump</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bill No</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">{record.id}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {record.date}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-900">{record.vehicleNo}</td>
                  <td className="px-4 py-3 text-gray-600">{record.driverName}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{record.quantity}</td>
                  <td className="px-4 py-3 text-right text-gray-600">₹{record.rate}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">₹{record.amount}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{record.odometerReading} KM</td>
                  <td className="px-4 py-3 text-gray-600">{record.pumpName}</td>
                  <td className="px-4 py-3 text-gray-600">{record.billNo}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-300">
              <tr className="font-bold">
                <td colSpan={4} className="px-4 py-3 text-right text-gray-900">TOTALS:</td>
                <td className="px-4 py-3 text-right text-gray-900">{totalQuantity} L</td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 text-right text-green-600">₹{totalAmount}</td>
                <td colSpan={3} className="px-4 py-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};