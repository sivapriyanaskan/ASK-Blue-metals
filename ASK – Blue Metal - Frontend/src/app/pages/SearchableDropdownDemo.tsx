import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Package, Users, Truck, Printer } from 'lucide-react';
import { SearchableDropdown, SearchableDropdownOption } from '../components/ui/searchable-dropdown';
import { customers, items, vehicles } from '../data/mockData';
import { getActivePrinters } from '../data/printers';

export default function SearchableDropdownDemo() {
  // Customer dropdown
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  
  // Item dropdown
  const [selectedItem, setSelectedItem] = useState<string>('');
  
  // Vehicle dropdown
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  
  // Printer dropdown
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  
  // Status dropdown (simple options)
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Convert data to SearchableDropdownOption format
  const customerOptions: SearchableDropdownOption[] = customers
    .filter(c => c.isActive)
    .map(customer => ({
      label: customer.name,
      value: customer.id,
      description: customer.code,
    }));

  const itemOptions: SearchableDropdownOption[] = items
    .filter(item => item.isActive)
    .map(item => ({
      label: item.name,
      value: item.code,
      description: `${item.code} - ${item.itemGroup}`,
    }));

  const vehicleOptions: SearchableDropdownOption[] = vehicles.map(vehicle => ({
    label: vehicle.vehicleNo,
    value: vehicle.id,
    description: `${vehicle.vehicleType} - ${vehicle.ownerName}`,
  }));

  const printerOptions: SearchableDropdownOption[] = getActivePrinters().map(printer => ({
    label: printer.printerName,
    value: printer.id,
    description: printer.ipAddress || 'Local Printer',
  }));

  const statusOptions: SearchableDropdownOption[] = [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
    { label: 'Pending', value: 'pending', description: 'Awaiting approval' },
    { label: 'Approved', value: 'approved', description: 'Verified and approved' },
    { label: 'Rejected', value: 'rejected', description: 'Not approved' },
  ];

  // Large dataset for testing pagination
  const largeDataset: SearchableDropdownOption[] = Array.from({ length: 500 }, (_, i) => ({
    label: `Item ${i + 1}`,
    value: `item-${i + 1}`,
    description: `Description for item ${i + 1}`,
  }));
  const [selectedLargeItem, setSelectedLargeItem] = useState<string>('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-300 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Back</span>
              </Link>
              <div className="h-8 w-px bg-gray-300"></div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Searchable Dropdown Demo
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Introduction Card */}
        <div className="bg-white rounded-lg border border-blue-200 p-6 mb-8 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            New Searchable Dropdown with Pagination
          </h2>
          <p className="text-gray-700 mb-4">
            This component replaces all standard select fields across the ERP system with enhanced features:
          </p>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Instant Search:</strong> Type to filter options in real-time</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Pagination:</strong> Efficiently handles large datasets (500+ items)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Keyboard Navigation:</strong> Use arrow keys and Enter to navigate</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Clear Selection:</strong> Quickly clear the selected value</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Mobile Friendly:</strong> Responsive design with touch support</span>
            </li>
          </ul>
        </div>

        {/* Demo Examples */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Selection */}
          <div className="bg-white rounded-lg border border-gray-300 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Customer Selection</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Search from {customerOptions.length} active customers. Try typing "ABC" or "Corp".
            </p>
            <SearchableDropdown
              options={customerOptions}
              value={selectedCustomer}
              onValueChange={setSelectedCustomer}
              placeholder="Select Customer"
              searchPlaceholder="Search customers..."
              pageSize={20}
            />
            {selectedCustomer && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-900">
                  Selected: {customerOptions.find(c => c.value === selectedCustomer)?.label}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Code: {customerOptions.find(c => c.value === selectedCustomer)?.description}
                </p>
              </div>
            )}
          </div>

          {/* Item Selection */}
          <div className="bg-white rounded-lg border border-gray-300 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Item Selection</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Search from {itemOptions.length} active items. Try "Stone" or "Sand".
            </p>
            <SearchableDropdown
              options={itemOptions}
              value={selectedItem}
              onValueChange={setSelectedItem}
              placeholder="Select Item"
              searchPlaceholder="Search items..."
              pageSize={20}
            />
            {selectedItem && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-900">
                  Selected: {itemOptions.find(i => i.value === selectedItem)?.label}
                </p>
                <p className="text-xs text-green-700 mt-1">
                  {itemOptions.find(i => i.value === selectedItem)?.description}
                </p>
              </div>
            )}
          </div>

          {/* Vehicle Selection */}
          <div className="bg-white rounded-lg border border-gray-300 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Truck className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">Vehicle Selection</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Search from {vehicleOptions.length} registered vehicles. Try "MH" or "GJ".
            </p>
            <SearchableDropdown
              options={vehicleOptions}
              value={selectedVehicle}
              onValueChange={setSelectedVehicle}
              placeholder="Select Vehicle"
              searchPlaceholder="Search vehicles..."
              pageSize={20}
            />
            {selectedVehicle && (
              <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm font-medium text-purple-900">
                  Selected: {vehicleOptions.find(v => v.value === selectedVehicle)?.label}
                </p>
                <p className="text-xs text-purple-700 mt-1">
                  {vehicleOptions.find(v => v.value === selectedVehicle)?.description}
                </p>
              </div>
            )}
          </div>

          {/* Printer Selection */}
          <div className="bg-white rounded-lg border border-gray-300 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Printer className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-900">Printer Selection</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Search from {printerOptions.length} configured printers.
            </p>
            <SearchableDropdown
              options={printerOptions}
              value={selectedPrinter}
              onValueChange={setSelectedPrinter}
              placeholder="Select Printer"
              searchPlaceholder="Search printers..."
              pageSize={15}
            />
            {selectedPrinter && (
              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm font-medium text-orange-900">
                  Selected: {printerOptions.find(p => p.value === selectedPrinter)?.label}
                </p>
                <p className="text-xs text-orange-700 mt-1">
                  {printerOptions.find(p => p.value === selectedPrinter)?.description}
                </p>
              </div>
            )}
          </div>

          {/* Status Selection (Simple) */}
          <div className="bg-white rounded-lg border border-gray-300 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Simple Status Selection</h3>
            <p className="text-sm text-gray-600 mb-4">
              Dropdown with basic options and descriptions.
            </p>
            <SearchableDropdown
              options={statusOptions}
              value={selectedStatus}
              onValueChange={setSelectedStatus}
              placeholder="Select Status"
              searchPlaceholder="Search status..."
              pageSize={10}
            />
            {selectedStatus && (
              <div className="mt-4 p-3 bg-gray-50 border border-gray-300 rounded-lg">
                <p className="text-sm font-medium text-gray-900">
                  Selected: {statusOptions.find(s => s.value === selectedStatus)?.label}
                </p>
                {statusOptions.find(s => s.value === selectedStatus)?.description && (
                  <p className="text-xs text-gray-700 mt-1">
                    {statusOptions.find(s => s.value === selectedStatus)?.description}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Large Dataset Test */}
          <div className="bg-white rounded-lg border border-gray-300 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Large Dataset Test (500 Items)
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Test pagination with 500 items. Try searching "Item 250" or scroll to load more.
            </p>
            <SearchableDropdown
              options={largeDataset}
              value={selectedLargeItem}
              onValueChange={setSelectedLargeItem}
              placeholder="Select from 500 items"
              searchPlaceholder="Search items..."
              pageSize={20}
            />
            {selectedLargeItem && (
              <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                <p className="text-sm font-medium text-indigo-900">
                  Selected: {largeDataset.find(i => i.value === selectedLargeItem)?.label}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg border border-gray-300 p-6 shadow-sm">
            <h4 className="font-semibold text-gray-900 mb-2">Search & Filter</h4>
            <p className="text-sm text-gray-600">
              Instantly filter options as you type. Searches both label and description fields.
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-300 p-6 shadow-sm">
            <h4 className="font-semibold text-gray-900 mb-2">Smart Pagination</h4>
            <p className="text-sm text-gray-600">
              Loads 20 items at a time. Scroll to bottom to automatically load more results.
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-300 p-6 shadow-sm">
            <h4 className="font-semibold text-gray-900 mb-2">Keyboard Support</h4>
            <p className="text-sm text-gray-600">
              Navigate with ↑↓ arrows, select with Enter, and close with Escape key.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
