import { useState } from 'react';
import { Plus, Edit, Eye, X, Save, Truck, Fuel, CheckCircle, AlertTriangle } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';

interface Vehicle {
  code: string;
  vehicleNo: string;
  vehicleType: string;
  ownershipType: 'Owned' | 'Leased' | 'Rented';
  capacity: number;
  fuelTankCapacity: number;
  driverName: string;
  driverPhone: string;
  driverLicense: string;
  registrationDate: string;
  insuranceExpiry: string;
  pollutionExpiry: string;
  fitnessExpiry: string;
  notes: string;
  status: 'Active' | 'Maintenance' | 'Inactive';
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
}

const mockVehicles: Vehicle[] = [
  {
    code: 'VEH001',
    vehicleNo: 'MH-12-AB-1234',
    vehicleType: 'Tata 407',
    ownershipType: 'Owned',
    capacity: 5000,
    fuelTankCapacity: 80,
    driverName: 'Ramesh Kumar',
    driverPhone: '9876543210',
    driverLicense: 'MH1234567890',
    registrationDate: '2020-05-15',
    insuranceExpiry: '2027-05-15',
    pollutionExpiry: '2026-11-20',
    fitnessExpiry: '2028-05-15',
    notes: 'Primary delivery vehicle',
    status: 'Active',
    createdBy: 'admin',
    createdAt: '2020-05-15 10:30:00',
    updatedBy: 'admin',
    updatedAt: '2026-02-10 14:20:00'
  },
  {
    code: 'VEH002',
    vehicleNo: 'MH-12-CD-5678',
    vehicleType: 'Ashok Leyland',
    ownershipType: 'Owned',
    capacity: 10000,
    fuelTankCapacity: 120,
    driverName: 'Suresh Patil',
    driverPhone: '9876543211',
    driverLicense: 'MH9876543210',
    registrationDate: '2021-08-20',
    insuranceExpiry: '2027-08-20',
    pollutionExpiry: '2026-08-15',
    fitnessExpiry: '2029-08-20',
    notes: 'Heavy load vehicle',
    status: 'Active',
    createdBy: 'admin',
    createdAt: '2021-08-20 09:15:00'
  },
  {
    code: 'VEH003',
    vehicleNo: 'MH-14-EF-9012',
    vehicleType: 'Eicher Pro 1095',
    ownershipType: 'Leased',
    capacity: 7500,
    fuelTankCapacity: 100,
    driverName: 'Vijay Sharma',
    driverPhone: '9876543212',
    driverLicense: 'MH1122334455',
    registrationDate: '2022-03-10',
    insuranceExpiry: '2027-03-10',
    pollutionExpiry: '2026-03-05',
    fitnessExpiry: '2030-03-10',
    notes: 'Leased vehicle - Contract until 2027',
    status: 'Maintenance',
    createdBy: 'admin',
    createdAt: '2022-03-10 11:00:00'
  }
];

export const VehicleMaster = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>(mockVehicles);
  const [mode, setMode] = useState<'list' | 'create' | 'edit' | 'view'>('list');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState<Omit<Vehicle, 'createdBy' | 'createdAt' | 'updatedBy' | 'updatedAt'>>({
    code: '',
    vehicleNo: '',
    vehicleType: '',
    ownershipType: 'Owned',
    capacity: 0,
    fuelTankCapacity: 0,
    driverName: '',
    driverPhone: '',
    driverLicense: '',
    registrationDate: '',
    insuranceExpiry: '',
    pollutionExpiry: '',
    fitnessExpiry: '',
    notes: '',
    status: 'Active'
  });
  const [validationError, setValidationError] = useState('');

  // Transform options for SearchableDropdown
  const statusOptions = [
    { label: 'Active', value: 'Active' },
    { label: 'Maintenance', value: 'Maintenance' },
    { label: 'Inactive', value: 'Inactive' }
  ];

  const ownershipOptions = [
    { label: 'Owned', value: 'Owned' },
    { label: 'Leased', value: 'Leased' },
    { label: 'Rented', value: 'Rented' }
  ];

  const validateForm = () => {
    if (!formData.vehicleNo.trim()) return 'Vehicle Number is required';
    if (!formData.vehicleType.trim()) return 'Vehicle Type is required';
    if (!formData.driverName.trim()) return 'Driver Name is required';
    if (!formData.driverPhone.trim()) return 'Driver Phone is required';
    if (!formData.driverLicense.trim()) return 'Driver License is required';
    if (!formData.registrationDate) return 'Registration Date is required';
    if (!formData.insuranceExpiry) return 'Insurance Expiry is required';
    if (!formData.pollutionExpiry) return 'Pollution Certificate Expiry is required';
    if (!formData.fitnessExpiry) return 'Fitness Certificate Expiry is required';
    if (formData.capacity <= 0) return 'Capacity must be greater than 0';
    if (formData.fuelTankCapacity <= 0) return 'Fuel Tank Capacity must be greater than 0';
    return '';
  };

  const handleSave = () => {
    const error = validateForm();
    if (error) {
      setValidationError(error);
      return;
    }

    if (mode === 'create') {
      const newVehicle: Vehicle = {
        ...formData,
        createdBy: 'admin',
        createdAt: new Date().toISOString().replace('T', ' ').split('.')[0]
      };
      setVehicles([...vehicles, newVehicle]);
      alert('Vehicle created successfully!');
    } else if (mode === 'edit' && selectedVehicle) {
      const updated = vehicles.map(v =>
        v.code === selectedVehicle.code
          ? {
              ...formData,
              createdBy: selectedVehicle.createdBy,
              createdAt: selectedVehicle.createdAt,
              updatedBy: 'admin',
              updatedAt: new Date().toISOString().replace('T', ' ').split('.')[0]
            }
          : v
      );
      setVehicles(updated);
      alert('Vehicle updated successfully!');
    }

    setMode('list');
    setSelectedVehicle(null);
    setValidationError('');
  };

  const handleCreate = () => {
    const newCode = 'VEH' + String(vehicles.length + 1).padStart(3, '0');
    setFormData({
      code: newCode,
      vehicleNo: '',
      vehicleType: '',
      ownershipType: 'Owned',
      capacity: 0,
      fuelTankCapacity: 0,
      driverName: '',
      driverPhone: '',
      driverLicense: '',
      registrationDate: '',
      insuranceExpiry: '',
      pollutionExpiry: '',
      fitnessExpiry: '',
      notes: '',
      status: 'Active'
    });
    setValidationError('');
    setMode('create');
  };

  const handleEdit = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setFormData({
      code: vehicle.code,
      vehicleNo: vehicle.vehicleNo,
      vehicleType: vehicle.vehicleType,
      ownershipType: vehicle.ownershipType,
      capacity: vehicle.capacity,
      fuelTankCapacity: vehicle.fuelTankCapacity,
      driverName: vehicle.driverName,
      driverPhone: vehicle.driverPhone,
      driverLicense: vehicle.driverLicense,
      registrationDate: vehicle.registrationDate,
      insuranceExpiry: vehicle.insuranceExpiry,
      pollutionExpiry: vehicle.pollutionExpiry,
      fitnessExpiry: vehicle.fitnessExpiry,
      notes: vehicle.notes,
      status: vehicle.status
    });
    setValidationError('');
    setMode('edit');
  };

  const handleView = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setMode('view');
  };

  const handleCancel = () => {
    setMode('list');
    setSelectedVehicle(null);
    setValidationError('');
  };

  // View Details Screen
  if (mode === 'view' && selectedVehicle) {
    return (
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vehicle Details</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleEdit(selectedVehicle)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium"
            >
              <X className="w-4 h-4" />
              Close
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-300 p-6 max-w-4xl mx-auto">
          {/* Basic Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Code</label>
                <input
                  type="text"
                  value={selectedVehicle.code}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number</label>
                <input
                  type="text"
                  value={selectedVehicle.vehicleNo}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                <input
                  type="text"
                  value={selectedVehicle.vehicleType}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ownership Type</label>
                <input
                  type="text"
                  value={selectedVehicle.ownershipType}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (KG)</label>
                <input
                  type="text"
                  value={selectedVehicle.capacity}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Tank Capacity (Liters)</label>
                <input
                  type="text"
                  value={selectedVehicle.fuelTankCapacity}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <div>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded ${
                    selectedVehicle.status === 'Active' ? 'bg-green-100 text-green-800' :
                    selectedVehicle.status === 'Maintenance' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedVehicle.status === 'Active' && <CheckCircle className="w-4 h-4" />}
                    {selectedVehicle.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Driver Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Driver Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name</label>
                <input
                  type="text"
                  value={selectedVehicle.driverName}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Driver Phone</label>
                <input
                  type="text"
                  value={selectedVehicle.driverPhone}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Driver License Number</label>
                <input
                  type="text"
                  value={selectedVehicle.driverLicense}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
            </div>
          </div>

          {/* Registration & Compliance */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Registration & Compliance</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Registration Date</label>
                <input
                  type="text"
                  value={selectedVehicle.registrationDate}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Expiry</label>
                <input
                  type="text"
                  value={selectedVehicle.insuranceExpiry}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pollution Certificate Expiry</label>
                <input
                  type="text"
                  value={selectedVehicle.pollutionExpiry}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fitness Certificate Expiry</label>
                <input
                  type="text"
                  value={selectedVehicle.fitnessExpiry}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Additional Information</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={selectedVehicle.notes}
                disabled
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Create/Edit Form
  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="p-6">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {mode === 'create' ? 'Create Vehicle' : 'Edit Vehicle'}
          </h1>
        </div>

        {validationError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 max-w-3xl mx-auto">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-red-900">Validation Error</div>
              <div className="text-sm text-red-700">{validationError}</div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-300 p-6 max-w-3xl mx-auto">
          {/* Section 1: Basic Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Code</label>
                <input
                  type="text"
                  value={formData.code}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.vehicleNo}
                  onChange={(e) => setFormData({ ...formData, vehicleNo: e.target.value.toUpperCase() })}
                  placeholder="MH-12-AB-1234"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Type <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.vehicleType}
                  onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                  placeholder="Tata 407, Ashok Leyland, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ownership Type <span className="text-red-500">*</span>
                </label>
                <SearchableDropdown
                  options={ownershipOptions}
                  value={formData.ownershipType}
                  onValueChange={(value) => setFormData({ ...formData, ownershipType: value as any })}
                  placeholder="Select Ownership Type"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacity (KG) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseFloat(e.target.value) || 0 })}
                  placeholder="5000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fuel Tank Capacity (Liters) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.fuelTankCapacity}
                  onChange={(e) => setFormData({ ...formData, fuelTankCapacity: parseFloat(e.target.value) || 0 })}
                  placeholder="80"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status <span className="text-red-500">*</span>
                </label>
                <SearchableDropdown
                  options={statusOptions}
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as any })}
                  placeholder="Select Status"
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Driver Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Driver Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Driver Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.driverName}
                  onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                  placeholder="Ramesh Kumar"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Driver Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.driverPhone}
                  onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
                  placeholder="9876543210"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Driver License Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.driverLicense}
                  onChange={(e) => setFormData({ ...formData, driverLicense: e.target.value.toUpperCase() })}
                  placeholder="MH1234567890"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Registration & Compliance */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Registration & Compliance</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Registration Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.registrationDate}
                  onChange={(e) => setFormData({ ...formData, registrationDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Insurance Expiry <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.insuranceExpiry}
                  onChange={(e) => setFormData({ ...formData, insuranceExpiry: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pollution Certificate Expiry <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.pollutionExpiry}
                  onChange={(e) => setFormData({ ...formData, pollutionExpiry: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fitness Certificate Expiry <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.fitnessExpiry}
                  onChange={(e) => setFormData({ ...formData, fitnessExpiry: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Additional Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Additional Information</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Additional notes about the vehicle..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-8 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
            >
              <Save className="w-4 h-4" />
              {mode === 'create' ? 'Create Vehicle' : 'Update Vehicle'}
            </button>
            <button
              onClick={handleCancel}
              className="px-8 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // List Screen
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehicle Master</h1>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Vehicle
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-300">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-300">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ownership</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Capacity</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tank Cap.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {vehicles.map((vehicle) => (
                <tr key={vehicle.code} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{vehicle.code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-gray-400" />
                      {vehicle.vehicleNo}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{vehicle.vehicleType}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{vehicle.ownershipType}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-right">{vehicle.capacity} KG</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Fuel className="w-3 h-3" />
                      {vehicle.fuelTankCapacity}L
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div>{vehicle.driverName}</div>
                    <div className="text-xs text-gray-500">{vehicle.driverPhone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${
                      vehicle.status === 'Active' ? 'bg-green-100 text-green-800' :
                      vehicle.status === 'Maintenance' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {vehicle.status === 'Active' && <CheckCircle className="w-3 h-3" />}
                      {vehicle.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleView(vehicle)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(vehicle)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
