import { useState } from 'react';
import { WeighbridgeDisplay } from '../components/WeighbridgeDisplay';
import { CameraCapture } from '../components/CameraCapture';
import { BarrierControl } from '../components/BarrierControl';
import { Save, Printer, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { suppliers as mockDataSuppliers, items } from '../data/mockData';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';

// Import from SupplierMaster mock data
const mockSuppliers = [
  {
    id: 'SUPP001',
    supplierCode: 'S001',
    supplierName: 'RK Stone Suppliers',
    supplierType: 'CUBIC_BASED' as const,
    isActive: true,
    gstNo: '27CCCCC0000C1Z5',
    vehicles: [
      { regNo: 'MH12TR1234', length: 10, breadth: 6, height: 4, adjustmentValue: 5, cuftTotal: 245, emptyWeight: 5000 },
      { regNo: 'MH12TR5678', length: 12, breadth: 6, height: 5, adjustmentValue: -10, cuftTotal: 350, emptyWeight: 6000 }
    ]
  },
  {
    id: 'SUPP002',
    supplierCode: 'S002',
    supplierName: 'Marble Traders Co.',
    supplierType: 'TON_BASED' as const,
    isActive: true,
    gstNo: '27DDDDD0000D1Z5',
    vehicles: [
      { regNo: 'MH14AB9876', length: 0, breadth: 0, height: 0, adjustmentValue: 0, cuftTotal: 0, emptyWeight: 7500 }
    ]
  },
  {
    id: 'SUPP003',
    supplierCode: 'S003',
    supplierName: 'Old Supplier (Inactive)',
    supplierType: 'TON_BASED' as const,
    isActive: false,
    gstNo: '',
    vehicles: []
  }
];

export const PurchaseEntryPass = () => {
  const [formData, setFormData] = useState({
    passNo: 'PE-' + String(Math.floor(Math.random() * 1000) + 1).padStart(4, '0'),
    vehicleNo: '',
    supplierCode: '',
    itemCode: '',
    loadedWeight: null as number | null,
    challanNo: '',
    challanDate: new Date().toISOString().split('T')[0],
    remarks: ''
  });

  const [selectedSupplier, setSelectedSupplier] = useState<typeof mockSuppliers[0] | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<typeof mockSuppliers[0]['vehicles'][0] | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [topImage, setTopImage] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const handleSupplierChange = (code: string) => {
    const supplier = mockSuppliers.find(s => s.supplierCode === code);
    setSelectedSupplier(supplier || null);
    setSelectedVehicle(null);
    setFormData({ ...formData, supplierCode: code, vehicleNo: '' });

    // Auto-select vehicle if only one
    if (supplier && supplier.vehicles.length === 1) {
      setSelectedVehicle(supplier.vehicles[0]);
      setFormData({ ...formData, supplierCode: code, vehicleNo: supplier.vehicles[0].regNo });
    }
  };

  const handleVehicleChange = (regNo: string) => {
    const vehicle = selectedSupplier?.vehicles.find(v => v.regNo === regNo);
    setSelectedVehicle(vehicle || null);
    setFormData({ ...formData, vehicleNo: regNo });
  };

  const handleItemChange = (code: string) => {
    const item = items.find(i => i.code === code);
    setSelectedItem(item || null);
    setFormData({ ...formData, itemCode: code });
  };

  const handleWeightCapture = (weight: number) => {
    setFormData({ ...formData, loadedWeight: weight });
  };

  const handleSave = () => {
    if (!formData.loadedWeight || !frontImage || !topImage) {
      alert('Please capture weight and both camera images');
      return;
    }
    
    if (!formData.supplierCode || !formData.itemCode || !formData.challanNo || !formData.vehicleNo) {
      alert('Please fill all required fields');
      return;
    }
    
    setIsSaved(true);
    alert('Purchase Entry Pass created successfully!');
  };

  const handlePrint = () => {
    alert('Printing Entry Pass...\nPass No: ' + formData.passNo + '\nVehicle: ' + formData.vehicleNo);
  };

  return (
    <div className="p-6">
      <div className="mb-4 pb-3 border-b border-gray-300">
        <h1 className="text-xl font-bold text-gray-900">Purchase Entry Pass</h1>
        <p className="text-gray-600 text-sm">Create entry pass for loaded supplier vehicles</p>
      </div>

      {isSaved && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3 mb-6">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-green-900">Entry Pass Created</div>
            <div className="text-sm text-green-700">Pass No: {formData.passNo}</div>
          </div>
        </div>
      )}

      {/* Hardware Components Row - Top Section */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="col-span-1">
          <WeighbridgeDisplay 
            onWeightCapture={handleWeightCapture} 
            externalCapturedWeight={formData.loadedWeight}
          />
        </div>
        <div className="col-span-1">
          <CameraCapture 
            label="Front Camera" 
            onCapture={setFrontImage} 
            externalCaptured={!!frontImage}
          />
        </div>
        <div className="col-span-1">
          <CameraCapture 
            label="Top Camera" 
            onCapture={setTopImage}
            externalCaptured={!!topImage}
          />
        </div>
        <div className="col-span-1">
          <BarrierControl />
        </div>
      </div>

      {/* Main Form Content */}
      <div className="space-y-4">
        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <h2 className="font-semibold mb-4">Vehicle & Supplier Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pass No <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.passNo}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={formData.challanDate}
                onChange={(e) => setFormData({ ...formData, challanDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier <span className="text-red-500">*</span>
              </label>
              <SearchableDropdown
                options={[
                  { value: '', label: 'Select Supplier' },
                  ...mockSuppliers.filter(s => s.isActive).map(supplier => ({
                    value: supplier.supplierCode,
                    label: `${supplier.supplierCode} - ${supplier.supplierName}`
                  }))
                ]}
                value={formData.supplierCode}
                onValueChange={handleSupplierChange}
                placeholder="Select Supplier"
              />
              {selectedSupplier && (
                <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                  <div className="font-medium text-blue-900">Supplier Type: {selectedSupplier.supplierType}</div>
                  <div className="text-blue-700">GST: {selectedSupplier.gstNo || 'N/A'}</div>
                </div>
              )}
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vehicle No <span className="text-red-500">*</span>
              </label>
              <SearchableDropdown
                options={[
                  { value: '', label: 'Select Vehicle' },
                  ...(selectedSupplier?.vehicles.map(vehicle => ({
                    value: vehicle.regNo,
                    label: `${vehicle.regNo} (Empty Weight: ${vehicle.emptyWeight} kg)`
                  })) || [])
                ]}
                value={formData.vehicleNo}
                onValueChange={handleVehicleChange}
                placeholder="Select Vehicle"
                disabled={!selectedSupplier}
              />
            </div>

            {selectedSupplier?.supplierType === 'CUBIC_BASED' && selectedVehicle && (
              <div className="col-span-2">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4 text-purple-600" />
                    <span className="font-semibold text-purple-900">Cubic Calculation Preview</span>
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-sm">
                    <div>
                      <div className="text-purple-700 font-medium">Length</div>
                      <div className="text-purple-900 font-semibold">{selectedVehicle.length}</div>
                    </div>
                    <div>
                      <div className="text-purple-700 font-medium">Breadth</div>
                      <div className="text-purple-900 font-semibold">{selectedVehicle.breadth}</div>
                    </div>
                    <div>
                      <div className="text-purple-700 font-medium">Height</div>
                      <div className="text-purple-900 font-semibold">{selectedVehicle.height}</div>
                    </div>
                    <div>
                      <div className="text-purple-700 font-medium">Adjustment</div>
                      <div className="text-purple-900 font-semibold">{selectedVehicle.adjustmentValue > 0 ? '+' : ''}{selectedVehicle.adjustmentValue}</div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-purple-200">
                    <div className="text-purple-700 font-medium text-sm">CUFT Total (Calculated)</div>
                    <div className="text-2xl font-bold text-purple-900">{selectedVehicle.cuftTotal}</div>
                    <div className="text-xs text-purple-600 mt-1">
                      Formula: (L × B × H) + Adjustment = ({selectedVehicle.length} × {selectedVehicle.breadth} × {selectedVehicle.height}) + {selectedVehicle.adjustmentValue}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item <span className="text-red-500">*</span>
              </label>
              <SearchableDropdown
                options={[
                  { value: '', label: 'Select Item' },
                  ...items.filter(item => item.rawMaterial && item.isActive).map(item => ({
                    value: item.code,
                    label: `${item.code} - ${item.name}`
                  }))
                ]}
                value={formData.itemCode}
                onValueChange={handleItemChange}
                placeholder="Select Item"
              />
              {selectedItem && (
                <div className="mt-2 flex gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                    HSN: {selectedItem.hsnCode}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                    Unit: KG
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded">
                    Raw Material
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Challan No <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.challanNo}
                onChange={(e) => setFormData({ ...formData, challanNo: e.target.value })}
                placeholder="Enter challan number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Challan Date
              </label>
              <input
                type="date"
                value={formData.challanDate}
                onChange={(e) => setFormData({ ...formData, challanDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remarks
              </label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={2}
                placeholder="Optional remarks"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Weight Display */}
        {formData.loadedWeight && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="font-semibold text-blue-900 mb-2">Weight Summary</div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-600">Loaded Weight</div>
                <div className="text-lg font-bold text-gray-900">{formData.loadedWeight} KG</div>
              </div>
              {selectedVehicle && (
                <div>
                  <div className="text-gray-600">Empty Weight (Vehicle)</div>
                  <div className="text-lg font-bold text-gray-900">{selectedVehicle.emptyWeight} KG</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={isSaved}
            className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            {isSaved ? 'Saved' : 'Save Entry Pass'}
          </button>
          {isSaved && (
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print Pass
            </button>
          )}
        </div>
      </div>
    </div>
  );
};