import { useState } from 'react';
import { Save, Fuel, Calendar } from 'lucide-react';
import { getActiveWorkCentres } from '../data/workCentres';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';

interface FuelEntry {
  id: string;
  date: string;
  vehicleId: string;
  vehicleNo: string;
  driverName: string;
  quantity: number;
  rate: number;
  amount: number;
  odometerReading: number;
  pumpName: string;
  billNo: string;
}

const mockFuelEntries: FuelEntry[] = [
  {
    id: 'FE-001',
    date: '2026-02-28',
    vehicleId: '1',
    vehicleNo: 'MH-12-AB-1234',
    driverName: 'Ramesh Kumar',
    quantity: 50,
    rate: 105,
    amount: 5250,
    odometerReading: 45230,
    pumpName: 'HP Petrol Pump',
    billNo: 'HP-12345'
  }
];

export const FuelConsumption = () => {
  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>(mockFuelEntries);
  const [showForm, setShowForm] = useState(false);
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    vehicleId: '',
    vehicleNo: '',
    driverName: '',
    quantity: 0,
    rate: 105,
    odometerReading: 0,
    pumpName: '',
    billNo: ''
  });
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);

  const mockVehicles = [
    { id: '1', regNo: 'MH12AB1234', vehicleName: 'Tata 407 Truck', emptyWeight: 2.5, lastFuelFilledMeter: 12500.50, workCentre: 'Main Processing Unit', isActive: true },
    { id: '2', regNo: 'MH02XY5678', vehicleName: 'Mahindra Bolero Pickup', emptyWeight: 1.8, lastFuelFilledMeter: 8900.00, workCentre: 'Secondary Processing', isActive: true },
    { id: '3', regNo: 'MH14CD9012', vehicleName: 'Ashok Leyland Dumper', emptyWeight: 3.2, lastFuelFilledMeter: 5400.20, workCentre: 'Main Processing Unit', isActive: false }
  ];

  const activeVehicles = mockVehicles.filter(v => v.isActive);

  const handleVehicleSelect = (vehicleId: string) => {
    const vehicle = mockVehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      setSelectedVehicle(vehicle);
      setFormData({
        ...formData,
        vehicleId: vehicle.id,
        vehicleNo: vehicle.regNo
      });
    }
  };

  const handleSave = () => {
    if (!formData.vehicleNo || !formData.quantity) {
      alert('Please fill required fields');
      return;
    }

    const newEntry: FuelEntry = {
      id: 'FE-' + String(fuelEntries.length + 1).padStart(3, '0'),
      ...formData,
      amount: formData.quantity * formData.rate
    };

    setFuelEntries([newEntry, ...fuelEntries]);
    alert('Fuel consumption recorded!');
    setShowForm(false);
  };

  if (showForm) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Add Fuel Consumption</h1>
        </div>

        <div className="bg-white rounded-lg border border-gray-300 p-6 max-w-3xl">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date <span className="text-red-500">*</span></label>
              <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle <span className="text-red-500">*</span></label>
              <SearchableDropdown
                options={activeVehicles.map(v => ({
                  label: `${v.regNo} - ${v.vehicleName}`,
                  value: v.id
                }))}
                value={formData.vehicleId}
                onValueChange={(val) => handleVehicleSelect(val)}
                placeholder="Select Vehicle"
                className="w-full"
              />
            </div>
            {selectedVehicle && (
              <div className="col-span-2 grid grid-cols-3 gap-4 p-4 bg-gray-50 border border-gray-300 rounded-lg">
                <div>
                  <label className="block text-xs text-gray-500 mb-1 uppercase">Empty Weight (Reference)</label>
                  <div className="font-mono font-bold text-gray-900">{selectedVehicle.emptyWeight} TON</div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 uppercase">Last Fuel Filled Meter (Reference)</label>
                  <div className="font-mono font-bold text-blue-900">{selectedVehicle.lastFuelFilledMeter.toFixed(2)} KM</div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 uppercase">Work Centre</label>
                  <div className="text-sm text-gray-700">{selectedVehicle.workCentre}</div>
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name</label>
              <input type="text" value={formData.driverName} onChange={(e) => setFormData({ ...formData, driverName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Odometer Reading (KM)</label>
              <input type="number" value={formData.odometerReading} onChange={(e) => setFormData({ ...formData, odometerReading: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (Liters) <span className="text-red-500">*</span></label>
              <input type="number" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rate per Liter (₹)</label>
              <input type="number" value={formData.rate} onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pump Name</label>
              <input type="text" value={formData.pumpName} onChange={(e) => setFormData({ ...formData, pumpName: e.target.value })} placeholder="HP Petrol Pump" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bill No</label>
              <input type="text" value={formData.billNo} onChange={(e) => setFormData({ ...formData, billNo: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div className="col-span-2 bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">Total Amount</div>
              <div className="text-2xl font-bold text-gray-900">₹{(formData.quantity * formData.rate).toFixed(2)}</div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={handleSave} className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium">
              <Save className="w-4 h-4 inline mr-2" />
              Save
            </button>
            <button onClick={() => setShowForm(false)} className="px-6 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium">Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fuel Consumption</h1>
          <p className="text-gray-600">Track fuel consumption for owned vehicles</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
          <Fuel className="w-4 h-4" />
          Add Entry
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-300 mb-6 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Vehicle</label>
            <SearchableDropdown
              options={[
                { label: 'All Vehicles', value: '' },
                ...activeVehicles.map(v => ({
                  label: `${v.regNo} - ${v.vehicleName}`,
                  value: v.id
                }))
              ]}
              value={vehicleFilter}
              onValueChange={(val) => setVehicleFilter(val)}
              placeholder="All Vehicles"
              className="w-full"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-300">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-300">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity (L)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Odometer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pump</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {fuelEntries.filter(entry => vehicleFilter === '' || entry.vehicleId === vehicleFilter).map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{entry.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {entry.date}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.vehicleNo}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{entry.driverName}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">{entry.quantity}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-right">₹{entry.rate}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">₹{entry.amount}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-right">{entry.odometerReading} KM</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{entry.pumpName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-600">Total Fuel Consumed</div>
          <div className="text-2xl font-bold text-gray-900">{fuelEntries.reduce((sum, e) => sum + e.quantity, 0)} L</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-600">Total Amount</div>
          <div className="text-2xl font-bold text-gray-900">₹{fuelEntries.reduce((sum, e) => sum + e.amount, 0)}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-600">Average Rate</div>
          <div className="text-2xl font-bold text-gray-900">₹{(fuelEntries.reduce((sum, e) => sum + e.rate, 0) / fuelEntries.length).toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
};