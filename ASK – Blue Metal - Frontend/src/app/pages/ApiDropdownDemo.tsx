import { useState } from 'react';
import { ApiDropdown } from '../components/ui/api-dropdown';
import {
  fetchCustomers,
  fetchItems,
  fetchDrivers,
  fetchVehicles,
  fetchBanks,
  fetchPrinters,
  fetchAccounts,
  type Customer,
  type Item,
  type Driver,
  type Vehicle,
  type Bank,
  type Printer,
  type Account,
} from '../services/api-dropdown-service';
import { Card } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { 
  Users, 
  Package, 
  UserCircle, 
  Truck, 
  Building2, 
  Printer as PrinterIcon,
  FileText,
  ArrowLeft,
  CheckCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router';

export default function ApiDropdownDemo() {
  const navigate = useNavigate();
  
  // State for each dropdown
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');

  // Store selected objects for display
  const [customerObj, setCustomerObj] = useState<Customer | null>(null);
  const [itemObj, setItemObj] = useState<Item | null>(null);
  const [driverObj, setDriverObj] = useState<Driver | null>(null);
  const [vehicleObj, setVehicleObj] = useState<Vehicle | null>(null);
  const [bankObj, setBankObj] = useState<Bank | null>(null);
  const [printerObj, setPrinterObj] = useState<Printer | null>(null);
  const [accountObj, setAccountObj] = useState<Account | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="mb-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <h1 className="text-2xl font-semibold text-gray-900">
              API Dropdown Component Demo
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Reusable dropdown with server-side search and pagination for the entire ERP system
            </p>
          </div>
        </div>

        {/* Features */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-medium text-blue-900">Component Features</h3>
              <ul className="mt-2 space-y-1 text-sm text-blue-800">
                <li>• Server-side search with debouncing (300ms)</li>
                <li>• Infinite scroll pagination (loads 20 items at a time)</li>
                <li>• Loading, empty, and error states</li>
                <li>• Clear selection button</li>
                <li>• Keyboard accessible</li>
                <li>• Fully typed with TypeScript</li>
                <li>• Customizable rendering</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Dropdowns Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Customer Dropdown */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-medium">Customer Dropdown</h2>
              </div>
              
              <div className="space-y-2">
                <Label>Select Customer</Label>
                <ApiDropdown<Customer>
                  fetchData={fetchCustomers}
                  getItemLabel={(customer) => customer.name}
                  getItemValue={(customer) => customer.code}
                  getItemDescription={(customer) => customer.code}
                  value={selectedCustomer}
                  onValueChange={(value, customer) => {
                    setSelectedCustomer(value);
                    setCustomerObj(customer);
                  }}
                  placeholder="Search customers..."
                  searchPlaceholder="Search by name, code, phone, GST..."
                  pageSize={15}
                />
              </div>

              {customerObj && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md space-y-1 text-sm">
                  <p><strong>Name:</strong> {customerObj.name}</p>
                  <p><strong>Code:</strong> {customerObj.code}</p>
                  <p><strong>Phone:</strong> {customerObj.phone}</p>
                  <p><strong>GST:</strong> {customerObj.gstNumber || 'N/A'}</p>
                  <p><strong>Address:</strong> {customerObj.address}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Item Dropdown */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-green-600" />
                <h2 className="text-lg font-medium">Item Dropdown</h2>
              </div>
              
              <div className="space-y-2">
                <Label>Select Item</Label>
                <ApiDropdown<Item>
                  fetchData={fetchItems}
                  getItemLabel={(item) => item.name}
                  getItemValue={(item) => item.code}
                  getItemDescription={(item) => item.code}
                  value={selectedItem}
                  onValueChange={(value, item) => {
                    setSelectedItem(value);
                    setItemObj(item);
                  }}
                  placeholder="Search items..."
                  searchPlaceholder="Search by name, code, HSN..."
                  pageSize={15}
                />
              </div>

              {itemObj && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md space-y-1 text-sm">
                  <p><strong>Name:</strong> {itemObj.name}</p>
                  <p><strong>Code:</strong> {itemObj.code}</p>
                  <p><strong>HSN:</strong> {itemObj.hsnCode || 'N/A'}</p>
                  <p><strong>Price:</strong> ₹{itemObj.sellingPrice.toFixed(2)}</p>
                  <p><strong>Group:</strong> {itemObj.itemGroup}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Driver Dropdown */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-purple-600" />
                <h2 className="text-lg font-medium">Driver Dropdown</h2>
              </div>
              
              <div className="space-y-2">
                <Label>Select Driver</Label>
                <ApiDropdown<Driver>
                  fetchData={fetchDrivers}
                  getItemLabel={(driver) => driver.driverName}
                  getItemValue={(driver) => driver.id}
                  getItemDescription={(driver) => driver.driverCode}
                  value={selectedDriver}
                  onValueChange={(value, driver) => {
                    setSelectedDriver(value);
                    setDriverObj(driver);
                  }}
                  placeholder="Search drivers..."
                  searchPlaceholder="Search by name, code, phone, license..."
                  pageSize={15}
                />
              </div>

              {driverObj && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md space-y-1 text-sm">
                  <p><strong>Name:</strong> {driverObj.driverName}</p>
                  <p><strong>Code:</strong> {driverObj.driverCode}</p>
                  <p><strong>License:</strong> {driverObj.licenseNumber}</p>
                  <p><strong>Phone:</strong> {driverObj.phoneNumber}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={driverObj.isActive ? 'default' : 'secondary'}>
                      {driverObj.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Vehicle Dropdown */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-orange-600" />
                <h2 className="text-lg font-medium">Vehicle Dropdown</h2>
              </div>
              
              <div className="space-y-2">
                <Label>Select Vehicle</Label>
                <ApiDropdown<Vehicle>
                  fetchData={fetchVehicles}
                  getItemLabel={(vehicle) => vehicle.regNo}
                  getItemValue={(vehicle) => vehicle.id}
                  getItemDescription={(vehicle) => vehicle.vehicleName}
                  value={selectedVehicle}
                  onValueChange={(value, vehicle) => {
                    setSelectedVehicle(value);
                    setVehicleObj(vehicle);
                  }}
                  placeholder="Search vehicles..."
                  searchPlaceholder="Search by number, name, work centre..."
                  pageSize={15}
                />
              </div>

              {vehicleObj && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md space-y-1 text-sm">
                  <p><strong>Number:</strong> {vehicleObj.regNo}</p>
                  <p><strong>Name:</strong> {vehicleObj.vehicleName}</p>
                  <p><strong>Work Centre:</strong> {vehicleObj.workCentre}</p>
                  <p><strong>Tank Capacity:</strong> {vehicleObj.tankCapacity}L</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={vehicleObj.isActive ? 'default' : 'secondary'}>
                      {vehicleObj.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Bank Dropdown */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-600" />
                <h2 className="text-lg font-medium">Bank Dropdown</h2>
              </div>
              
              <div className="space-y-2">
                <Label>Select Bank</Label>
                <ApiDropdown<Bank>
                  fetchData={fetchBanks}
                  getItemLabel={(bank) => bank.bankName}
                  getItemValue={(bank) => bank.id}
                  getItemDescription={(bank) => bank.accountNumber}
                  value={selectedBank}
                  onValueChange={(value, bank) => {
                    setSelectedBank(value);
                    setBankObj(bank);
                  }}
                  placeholder="Search banks..."
                  searchPlaceholder="Search by name, code, account, IFSC..."
                  pageSize={10}
                />
              </div>

              {bankObj && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md space-y-1 text-sm">
                  <p><strong>Bank:</strong> {bankObj.bankName}</p>
                  <p><strong>Code:</strong> {bankObj.bankCode}</p>
                  <p><strong>Account:</strong> {bankObj.accountNumber}</p>
                  <p><strong>IFSC:</strong> {bankObj.ifscCode}</p>
                  <p><strong>Branch:</strong> {bankObj.branch}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Printer Dropdown */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <PrinterIcon className="h-5 w-5 text-cyan-600" />
                <h2 className="text-lg font-medium">Printer Dropdown</h2>
              </div>
              
              <div className="space-y-2">
                <Label>Select Printer</Label>
                <ApiDropdown<Printer>
                  fetchData={fetchPrinters}
                  getItemLabel={(printer) => printer.printerName}
                  getItemValue={(printer) => printer.id}
                  getItemDescription={(printer) => printer.printerType}
                  value={selectedPrinter}
                  onValueChange={(value, printer) => {
                    setSelectedPrinter(value);
                    setPrinterObj(printer);
                  }}
                  placeholder="Search printers..."
                  searchPlaceholder="Search by name, type, IP..."
                  pageSize={10}
                />
              </div>

              {printerObj && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md space-y-1 text-sm">
                  <p><strong>Name:</strong> {printerObj.printerName}</p>
                  <p><strong>Type:</strong> {printerObj.printerType}</p>
                  <p><strong>IP:</strong> {printerObj.ipAddress}</p>
                  <p><strong>Port:</strong> {printerObj.port}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={printerObj.isDefault ? 'default' : 'secondary'}>
                      {printerObj.isDefault ? 'Default' : 'Secondary'}
                    </Badge>
                    <Badge variant={printerObj.isActive ? 'default' : 'secondary'}>
                      {printerObj.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Account Dropdown */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-teal-600" />
                <h2 className="text-lg font-medium">Account Dropdown</h2>
              </div>
              
              <div className="space-y-2">
                <Label>Select Account</Label>
                <ApiDropdown<Account>
                  fetchData={fetchAccounts}
                  getItemLabel={(account) => account.accountName}
                  getItemValue={(account) => account.accountId}
                  getItemDescription={(account) => account.accountCode}
                  value={selectedAccount}
                  onValueChange={(value, account) => {
                    setSelectedAccount(value);
                    setAccountObj(account);
                  }}
                  placeholder="Search accounts..."
                  searchPlaceholder="Search by name, code, group, type..."
                  pageSize={10}
                />
              </div>

              {accountObj && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md space-y-1 text-sm">
                  <p><strong>Name:</strong> {accountObj.accountName}</p>
                  <p><strong>Code:</strong> {accountObj.accountCode}</p>
                  <p><strong>Group:</strong> {accountObj.accountGroup}</p>
                  <p><strong>Type:</strong> {accountObj.accountType}</p>
                  <p><strong>Opening:</strong> ₹{accountObj.openingBalance.toFixed(2)}</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Code Example */}
        <Card className="p-6 bg-gray-900 text-gray-100">
          <h3 className="text-lg font-medium mb-4">Usage Example</h3>
          <pre className="text-xs overflow-x-auto">
            <code>{`import { ApiDropdown } from '../components/ui/api-dropdown';
import { fetchCustomers, type Customer } from '../services/api-dropdown-service';

function MyComponent() {
  const [customerId, setCustomerId] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);

  return (
    <ApiDropdown<Customer>
      fetchData={fetchCustomers}
      getItemLabel={(customer) => customer.name}
      getItemValue={(customer) => customer.code}
      getItemDescription={(customer) => customer.code}
      value={customerId}
      onValueChange={(value, customer) => {
        setCustomerId(value);
        setCustomer(customer);
      }}
      placeholder="Search customers..."
      searchPlaceholder="Search by name, code, phone..."
      pageSize={20}
      debounceMs={300}
      allowClear={true}
    />
  );
}`}</code>
          </pre>
        </Card>
      </div>
    </div>
  );
}