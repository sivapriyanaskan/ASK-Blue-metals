import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Save, Printer, Plus, Trash2, CheckCircle, Info, Eye, ExternalLink, AlertCircle } from 'lucide-react';
import { suppliers, items, billSundries } from '../data/mockData';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';
import { WeighbridgeDisplay } from '../components/WeighbridgeDisplay';
import { CameraCapture } from '../components/CameraCapture';
import { BarrierControl } from '../components/BarrierControl';

// Mock Purchase Entry Passes (tokens)
const mockPurchasePasses = [
  {
    passNo: 'PE-2024-0001',
    passDate: '2024-03-07',
    supplierId: 'S001',
    supplierName: 'RK Stone Suppliers',
    vehicleNo: 'MH12TR1234',
    emptyWeight: 12500,
    status: 'WEIGHED_IN'
  },
  {
    passNo: 'PE-2024-0002',
    passDate: '2024-03-07',
    supplierId: 'S002',
    supplierName: 'Marble Traders Co.',
    vehicleNo: 'MH14AB9876',
    emptyWeight: 7500,
    status: 'WEIGHED_IN'
  },
  {
    passNo: 'PE-2024-0003',
    passDate: '2024-03-06',
    supplierId: 'S001',
    supplierName: 'RK Stone Suppliers',
    vehicleNo: 'MH12TR5678',
    emptyWeight: 6000,
    status: 'BILLED' // Already billed, should not be available
  }
];

// Import from SupplierMaster mock data
const mockSuppliers = [
  {
    id: 'SUPP001',
    supplierCode: 'S001',
    supplierName: 'RK Stone Suppliers',
    supplierType: 'CUBIC_BASED' as const,
    isActive: true,
    gstNo: '27CCCCC0000C1Z5',
    paymentTerms: 'Credit 30 Days',
    supplierAddress: 'Quarry Road, Pune',
    contactPerson: 'Rajesh Kumar',
    contactNumber: '+91 98765 43210',
    vehicles: [
      { regNo: 'MH12TR1234', length: 10, breadth: 6, height: 4, adjustmentValue: 5, cuftTotal: 245, emptyWeight: 12500 },
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
    paymentTerms: 'Advance Payment',
    supplierAddress: 'Industrial Area, Mumbai',
    contactPerson: 'Suresh Patel',
    contactNumber: '+91 99887 65432',
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
    paymentTerms: '',
    supplierAddress: '',
    contactPerson: '',
    contactNumber: '',
    vehicles: []
  }
];

// Mock Supplier-Wise Item Rates
const mockSupplierWiseRates = [
  { supplierId: 'S001', itemCode: 'I001', purchaseRate: 720 },
  { supplierId: 'S001', itemCode: 'I003', purchaseRate: 650 },
  { supplierId: 'S002', itemCode: 'I002', purchaseRate: 680 },
  { supplierId: 'S002', itemCode: 'I001', purchaseRate: 700 }
];

interface ItemRow {
  itemId: string;
  itemName: string;
  hsnCode: string;
  qty: number;
  unit: string;
  rate: number;
  rateSource: 'SUPPLIER_RATE' | 'DEFAULT_RATE';
  amount: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

interface SundryRow {
  sundryId: string;
  sundryNameSnapshot: string;
  sundryTypeSnapshot: 'ADDITIVE' | 'DEDUCTIVE';
  amount: number;
}

export const PurchaseBill = () => {
  const navigate = useNavigate();
  
  // Form state
  const [billNo, setBillNo] = useState('PB-' + String(Math.floor(Math.random() * 10000) + 1).padStart(5, '0'));
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [passNo, setPassNo] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [challanNo, setChallanNo] = useState('');
  const [challanDate, setChallanDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // Weight capture
  const [emptyWeight, setEmptyWeight] = useState<number | null>(null);
  const [loadWeight, setLoadWeight] = useState<number | null>(null);
  const [netWeight, setNetWeight] = useState<number | null>(null);
  const [weightCapturedAt, setWeightCapturedAt] = useState<string>('');

  // Camera captures
  const [frontImagePreview, setFrontImagePreview] = useState<string | null>(null);
  const [frontImageRef, setFrontImageRef] = useState<string>('');
  const [topImagePreview, setTopImagePreview] = useState<string | null>(null);
  const [topImageRef, setTopImageRef] = useState<string>('');

  // Items and sundries
  const [itemRows, setItemRows] = useState<ItemRow[]>([]);
  const [sundryRows, setSundryRows] = useState<SundryRow[]>([]);

  // Calculation fields
  const [itemsSubtotal, setItemsSubtotal] = useState(0);
  const [cgstTotal, setCgstTotal] = useState(0);
  const [sgstTotal, setSgstTotal] = useState(0);
  const [igstTotal, setIgstTotal] = useState(0);
  const [payableAmount, setPayableAmount] = useState(0);

  // Selected entities
  const [selectedPass, setSelectedPass] = useState<any>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);

  // Pass selection handler
  const handlePassSelection = (selectedPassNo: string) => {
    setPassNo(selectedPassNo);
    const pass = mockPurchasePasses.find(p => p.passNo === selectedPassNo);
    
    if (pass) {
      setSelectedPass(pass);
      setSupplierId(pass.supplierId);
      setVehicleNo(pass.vehicleNo);
      setEmptyWeight(pass.emptyWeight);
      
      // Find supplier
      const supplier = mockSuppliers.find(s => s.supplierCode === pass.supplierId);
      setSelectedSupplier(supplier || null);
    }
  };

  // Weight capture handler with validation
  const handleWeightCapture = (weight: number) => {
    console.log('Weight captured:', weight);
    console.log('Empty weight:', emptyWeight);
    
    // Validation: Load weight must be greater than empty weight
    if (emptyWeight && weight <= emptyWeight) {
      alert(`⚠️ Invalid Weight!\n\nLoad Weight (${weight} KG) must be greater than Empty Weight (${emptyWeight} KG).\n\nPlease ensure the vehicle is properly loaded and capture the weight again.`);
      return;
    }
    
    setLoadWeight(weight);
    setWeightCapturedAt(new Date().toLocaleString());
    
    if (emptyWeight && emptyWeight > 0) {
      // Calculate net weight in Tons (Load Weight - Empty Weight) / 1000
      const netWeightInTons = (weight - emptyWeight) / 1000;
      console.log('Net weight calculated:', netWeightInTons, 'Tons');
      setNetWeight(netWeightInTons);
      
      // Update first item quantity with net weight if supplier is TON_BASED
      if (selectedSupplier && selectedSupplier.supplierType === 'TON_BASED') {
        const updatedRows = [...itemRows];
        if (updatedRows[0] && updatedRows[0].itemId) {
          updatedRows[0].qty = netWeightInTons;
          calculateItemRow(updatedRows, 0);
          setItemRows(updatedRows);
        }
      }
    } else {
      console.warn('Empty weight not available');
      alert('Empty weight is not available. Please select a valid pass first.');
    }
  };

  // Calculate individual item row
  const calculateItemRow = (rows: ItemRow[], index: number) => {
    const row = rows[index];
    row.amount = row.qty * row.rate;
    
    // GST calculation (18% = 9% CGST + 9% SGST)
    const gstAmount = row.amount * (row.gstRate / 100);
    row.cgst = gstAmount / 2;
    row.sgst = gstAmount / 2;
    row.igst = 0; // For intra-state, IGST is 0
    
    row.total = row.amount + row.cgst + row.sgst + row.igst;
  };

  // Calculate all totals
  const calculateTotals = (rows: ItemRow[]) => {
    const subtotal = rows.reduce((sum, row) => sum + row.amount, 0);
    setItemsSubtotal(subtotal);
    
    const cgst = rows.reduce((sum, row) => sum + row.cgst, 0);
    const sgst = rows.reduce((sum, row) => sum + row.sgst, 0);
    const igst = rows.reduce((sum, row) => sum + row.igst, 0);
    
    setCgstTotal(cgst);
    setSgstTotal(sgst);
    setIgstTotal(igst);

    // Calculate sundries total (additive or deductive)
    const sundriesTotal = sundryRows.reduce((sum, s) => {
      return s.sundryTypeSnapshot === 'ADDITIVE' ? sum + s.amount : sum - s.amount;
    }, 0);

    // Grand total = Items total + GST + Sundries
    const itemsTotal = subtotal + cgst + sgst + igst;
    const grandTotal = itemsTotal + sundriesTotal;
    
    setPayableAmount(grandTotal);
  };

  // Recalculate when sundry rows change
  useEffect(() => {
    calculateTotals(itemRows);
  }, [sundryRows]);

  // Add item row
  const addItemRow = () => {
    if (!supplierId) {
      alert('Please select a supplier first');
      return;
    }

    setItemRows([...itemRows, {
      itemId: '',
      itemName: '',
      hsnCode: '',
      qty: 0,
      unit: 'TON',
      rate: 0,
      rateSource: 'DEFAULT_RATE',
      amount: 0,
      gstRate: 18,
      cgst: 0,
      sgst: 0,
      igst: 0,
      total: 0
    }]);
  };

  // Remove item row
  const removeItemRow = (index: number) => {
    const updatedRows = itemRows.filter((_, i) => i !== index);
    setItemRows(updatedRows);
    calculateTotals(updatedRows);
  };

  // Handle item selection
  const handleItemSelection = (index: number, itemCode: string) => {
    const updatedRows = [...itemRows];
    const selectedItem = items.find(i => i.code === itemCode && i.rawMaterial && i.isActive);
    
    if (selectedItem) {
      updatedRows[index].itemId = itemCode;
      updatedRows[index].itemName = selectedItem.name;
      updatedRows[index].hsnCode = selectedItem.hsnCode;
      updatedRows[index].unit = selectedItem.unit || 'TON';
      updatedRows[index].gstRate = selectedItem.gstRate || 18;
      
      // Check supplier-wise rate first
      const supplierRate = mockSupplierWiseRates.find(
        r => r.supplierId === supplierId && r.itemCode === itemCode
      );
      
      if (supplierRate) {
        updatedRows[index].rate = supplierRate.purchaseRate;
        updatedRows[index].rateSource = 'SUPPLIER_RATE';
      } else {
        updatedRows[index].rate = selectedItem.gettingPrice || 0;
        updatedRows[index].rateSource = 'DEFAULT_RATE';
      }
      
      // If TON_BASED supplier and net weight is available, auto-populate quantity
      if (selectedSupplier && selectedSupplier.supplierType === 'TON_BASED' && netWeight && index === 0) {
        updatedRows[index].qty = netWeight;
      }
      
      calculateItemRow(updatedRows, index);
      setItemRows(updatedRows);
      calculateTotals(updatedRows);
    }
  };

  // Handle item field change
  const handleItemFieldChange = (index: number, field: keyof ItemRow, value: any) => {
    const updatedRows = [...itemRows];
    (updatedRows[index] as any)[field] = value;
    calculateItemRow(updatedRows, index);
    setItemRows(updatedRows);
    calculateTotals(updatedRows);
  };

  // Save handler
  const handleSave = () => {
    // Validation
    if (!passNo) {
      alert('⚠️ Please select a Purchase Entry Pass');
      return;
    }
    if (!supplierId) {
      alert('⚠️ Please select a supplier');
      return;
    }
    if (itemRows.length === 0 || !itemRows[0].itemId) {
      alert('⚠️ Please add at least one item');
      return;
    }
    if (!loadWeight) {
      alert('⚠️ Please capture load weight from weighbridge');
      return;
    }
    
    setIsSaved(true);
    alert(`✅ Purchase Bill Created Successfully!\n\nBill No: ${billNo}\nSupplier: ${selectedSupplier?.supplierName}\nAmount: ₹${payableAmount.toFixed(2)}`);
  };

  // Print handler
  const handlePrint = () => {
    alert(`🖨️ Printing Purchase Bill...\n\nBill No: ${billNo}\nSupplier: ${selectedSupplier?.supplierName}\nVehicle: ${vehicleNo}\nAmount: ₹${payableAmount.toFixed(2)}`);
  };

  return (
    <div className="p-6 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="mb-6 pb-4 border-b border-gray-300">
        <h1 className="text-2xl font-bold text-gray-900">Purchase Entry Bill Creation</h1>
      </div>

      {/* Success Message */}
      {isSaved && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3 mb-6">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-green-900">Purchase Bill Created Successfully</div>
            <div className="text-sm text-green-700 mt-1">
              Bill No: {billNo} | Supplier: {selectedSupplier?.supplierName} | Amount: ₹{payableAmount.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Pass Selection - First Step */}
      <div className="bg-white rounded-lg border border-gray-300 p-6 mb-6">
        <h3 className="font-semibold mb-4">Select Purchase Entry Pass</h3>
        <div className="max-w-md">
          <SearchableDropdown
            options={mockPurchasePasses
              .filter(p => p.status === 'WEIGHED_IN')
              .map(pass => ({
                value: pass.passNo,
                label: pass.passNo,
                description: `${pass.vehicleNo} | ${pass.supplierName}`
              }))}
            value={passNo}
            onValueChange={handlePassSelection}
            placeholder="Select Pass Number"
            searchPlaceholder="Search pass number..."
          />
          {selectedPass && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Pass Date:</span>
                  <span className="ml-2 font-medium text-blue-900">{selectedPass.passDate}</span>
                </div>
                <div>
                  <span className="text-gray-600">Vehicle:</span>
                  <span className="ml-2 font-medium text-blue-900">{selectedPass.vehicleNo}</span>
                </div>
                <div>
                  <span className="text-gray-600">Supplier:</span>
                  <span className="ml-2 font-medium text-blue-900">{selectedPass.supplierName}</span>
                </div>
                <div>
                  <span className="text-gray-600">Empty Weight:</span>
                  <span className="ml-2 font-medium text-blue-900">{selectedPass.emptyWeight} KG</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Show remaining sections only after Pass is selected */}
      {passNo && (
        <>
          {/* Hardware Components Row */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="col-span-1">
              <WeighbridgeDisplay 
                onWeightCapture={handleWeightCapture}
                externalCapturedWeight={loadWeight}
              />
            </div>
            <div className="col-span-1">
              <CameraCapture
                label="Front Camera"
                onCapture={(img) => {
                  setFrontImagePreview(img);
                  setFrontImageRef('front_' + Date.now());
                }}
                externalCaptured={!!frontImagePreview}
              />
            </div>
            <div className="col-span-1">
              <CameraCapture
                label="Top Camera"
                onCapture={(img) => {
                  setTopImagePreview(img);
                  setTopImageRef('top_' + Date.now());
                }}
                externalCaptured={!!topImagePreview}
              />
            </div>
            <div className="col-span-1">
              <BarrierControl />
            </div>
          </div>

          <div className="space-y-6">
            {/* Bill Header Details */}
            <div className="bg-white rounded-lg border border-gray-300 p-6">
              <h3 className="font-semibold mb-4">Bill Information</h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bill No</label>
                  <input
                    type="text"
                    value={billNo}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bill Date *</label>
                  <input
                    type="date"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Challan No</label>
                  <input
                    type="text"
                    value={challanNo}
                    onChange={(e) => setChallanNo(e.target.value)}
                    placeholder="Enter supplier challan no"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Challan Date</label>
                  <input
                    type="date"
                    value={challanDate}
                    onChange={(e) => setChallanDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Supplier Details */}
            <div className="bg-white rounded-lg border border-gray-300 p-6">
              <h3 className="font-semibold mb-4">Supplier Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                  <input
                    type="text"
                    value={selectedSupplier ? `${selectedSupplier.supplierCode} - ${selectedSupplier.supplierName}` : ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle No</label>
                  <input
                    type="text"
                    value={vehicleNo}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono"
                  />
                </div>
              </div>
              {selectedSupplier && (
                <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Type</div>
                      <div className="font-medium text-purple-900">{selectedSupplier.supplierType}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">GST No</div>
                      <div className="font-medium text-purple-900">{selectedSupplier.gstNo || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Contact Person</div>
                      <div className="font-medium text-purple-900">{selectedSupplier.contactPerson}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Payment Terms</div>
                      <div className="font-medium text-purple-900">{selectedSupplier.paymentTerms}</div>
                    </div>
                  </div>
                  {selectedSupplier.supplierType === 'TON_BASED' && (
                    <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded flex items-start gap-2">
                      <Info className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-orange-800">
                        <div className="font-semibold">TON BASED Calculation</div>
                        <div>Quantity will be calculated from Weighbridge Net Weight</div>
                      </div>
                    </div>
                  )}
                  {selectedSupplier.supplierType === 'CUBIC_BASED' && (
                    <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-blue-800">
                        <div className="font-semibold">CUBIC BASED Calculation</div>
                        <div>Quantity will be based on Vehicle CUFT Total configuration</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Weight Capture Section */}
            <div className="bg-white rounded-lg border border-gray-300 p-6">
              <h3 className="font-semibold mb-4">Weight Capture *</h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Empty Weight</label>
                  <div className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-xl font-bold text-center">
                    {emptyWeight ? `${emptyWeight} KG` : '-'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 text-center">From Pass Entry</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Load Weight</label>
                  <div className={`px-3 py-2 border rounded-lg font-mono text-xl font-bold text-center ${
                    loadWeight ? 'bg-green-50 border-green-500 text-green-900' : 'bg-gray-50 border-gray-300 text-gray-400'
                  }`}>
                    {loadWeight ? `${loadWeight} KG` : '-'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 text-center">
                    {weightCapturedAt || 'Not captured yet'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Net Weight</label>
                  <div className={`px-3 py-2 border rounded-lg font-mono text-xl font-bold text-center ${
                    netWeight ? 'bg-blue-50 border-blue-500 text-blue-900' : 'bg-gray-50 border-gray-300 text-gray-400'
                  }`}>
                    {netWeight ? `${netWeight.toFixed(3)} TON` : '-'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 text-center">
                    {netWeight ? 'Auto-calculated' : 'Pending weight capture'}
                  </div>
                </div>
              </div>
              
              {!loadWeight && emptyWeight && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <div className="font-semibold">Action Required</div>
                    <div>Please capture the load weight from the weighbridge display above</div>
                  </div>
                </div>
              )}
            </div>

            {/* Remarks */}
            <div className="bg-white rounded-lg border border-gray-300 p-6">
              <h3 className="font-semibold mb-4">Additional Information</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter any additional notes or remarks"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Purchase Items Section */}
            <div className="bg-white rounded-lg border border-gray-300 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Purchase Items *</h3>
                <button
                  onClick={addItemRow}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>

              {itemRows.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No items added yet. Click "Add Item" to start adding purchase items.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b-2 border-gray-300">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Item</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">HSN Code</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Qty</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Rate</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">CGST 9%</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">SGST 9%</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Total</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {itemRows.map((item, index) => {
                        const supplierRate = mockSupplierWiseRates.find(
                          r => r.supplierId === supplierId && r.itemCode === item.itemId
                        );
                        
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-3 py-3">
                              <SearchableDropdown
                                options={items
                                  .filter(i => i.rawMaterial && i.isActive)
                                  .map(i => ({
                                    value: i.code,
                                    label: `${i.code} - ${i.name}`,
                                    description: i.unit
                                  }))}
                                value={item.itemId}
                                onValueChange={(value) => handleItemSelection(index, value)}
                                placeholder="Select Item"
                                searchPlaceholder="Search items..."
                                className="min-w-[200px]"
                              />
                              {item.itemId && (
                                <div className="mt-1 flex items-center gap-1">
                                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                    item.rateSource === 'SUPPLIER_RATE' 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-gray-100 text-gray-700'
                                  }`}>
                                    {item.rateSource === 'SUPPLIER_RATE' ? 'Supplier Rate' : 'Default Rate'}
                                  </span>
                                  {supplierRate && (
                                    <button
                                      onClick={() => navigate('/masters/supplier-wise-item-rates')}
                                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
                                      title="View Rate Details"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              <div className="font-mono text-xs text-gray-600">{item.hsnCode || '-'}</div>
                            </td>
                            <td className="px-3 py-3">
                              <input
                                type="number"
                                value={item.qty || ''}
                                onChange={(e) => handleItemFieldChange(index, 'qty', parseFloat(e.target.value) || 0)}
                                className="w-24 px-2 py-1.5 border border-gray-300 rounded text-right font-mono focus:ring-2 focus:ring-blue-500"
                                step="0.001"
                                placeholder="0.000"
                              />
                              <div className="text-xs text-gray-500 mt-0.5 text-right">{item.unit}</div>
                            </td>
                            <td className="px-3 py-3">
                              <input
                                type="number"
                                value={item.rate || ''}
                                onChange={(e) => handleItemFieldChange(index, 'rate', parseFloat(e.target.value) || 0)}
                                className="w-28 px-2 py-1.5 border border-gray-300 rounded text-right font-mono focus:ring-2 focus:ring-blue-500"
                                step="0.01"
                                placeholder="0.00"
                              />
                            </td>
                            <td className="px-3 py-3 text-right font-mono">₹{item.amount.toFixed(2)}</td>
                            <td className="px-3 py-3 text-right font-mono text-gray-600">₹{item.cgst.toFixed(2)}</td>
                            <td className="px-3 py-3 text-right font-mono text-gray-600">₹{item.sgst.toFixed(2)}</td>
                            <td className="px-3 py-3 text-right font-mono font-semibold">₹{item.total.toFixed(2)}</td>
                            <td className="px-3 py-3">
                              <button
                                onClick={() => removeItemRow(index)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Items Summary */}
              {itemRows.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-300">
                  <div className="grid grid-cols-5 gap-4 text-sm">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">Subtotal</div>
                      <div className="font-mono font-bold text-gray-900">₹{itemsSubtotal.toFixed(2)}</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">CGST (9%)</div>
                      <div className="font-mono font-bold text-blue-900">₹{cgstTotal.toFixed(2)}</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">SGST (9%)</div>
                      <div className="font-mono font-bold text-green-900">₹{sgstTotal.toFixed(2)}</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">IGST (18%)</div>
                      <div className="font-mono font-bold text-orange-900">₹{igstTotal.toFixed(2)}</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">Items Total</div>
                      <div className="font-mono font-bold text-purple-900">₹{(itemsSubtotal + cgstTotal + sgstTotal + igstTotal).toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bill Sundries Section */}
            <div className="bg-white rounded-lg border border-gray-300 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Bill Sundries</h3>
                <button
                  onClick={() => {
                    setSundryRows([...sundryRows, {
                      sundryId: '',
                      sundryNameSnapshot: '',
                      sundryTypeSnapshot: 'ADDITIVE',
                      amount: 0
                    }]);
                  }}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Sundry
                </button>
              </div>

              {sundryRows.length > 0 && (
                <div className="space-y-2">
                  {sundryRows.map((sundry, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center p-2 bg-gray-50 rounded-lg">
                      <div className="col-span-5">
                        <SearchableDropdown
                          options={billSundries
                            .filter(s => s.isActive && s.status === 'Active')
                            .filter(s => {
                              const alreadySelected = sundryRows.some((row, idx) => 
                                idx !== index && row.sundryId === s.code
                              );
                              return !alreadySelected;
                            })
                            .map(s => ({
                              label: s.name,
                              value: s.code,
                              description: s.type === 'ADDITIVE' ? '(+) Additive' : '(-) Deductive',
                            }))}
                          value={sundry.sundryId}
                          onValueChange={(value) => {
                            const selectedSundry = billSundries.find(s => s.code === value);
                            if (selectedSundry) {
                              const updatedRows = [...sundryRows];
                              updatedRows[index].sundryId = value;
                              updatedRows[index].sundryNameSnapshot = selectedSundry.name;
                              updatedRows[index].sundryTypeSnapshot = selectedSundry.type;
                              updatedRows[index].amount = selectedSundry.defaultValue || 0;
                              setSundryRows(updatedRows);
                            }
                          }}
                          placeholder="Select Sundry"
                          searchPlaceholder="Search sundries..."
                        />
                      </div>
                      <div className="col-span-2">
                        <div className={`px-2 py-1.5 rounded text-xs font-medium text-center ${
                          sundry.sundryTypeSnapshot === 'ADDITIVE' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {sundry.sundryTypeSnapshot === 'ADDITIVE' ? '(+) Add' : '(-) Deduct'}
                        </div>
                      </div>
                      <div className="col-span-4">
                        <input
                          type="number"
                          value={sundry.amount}
                          onChange={(e) => {
                            if (!sundry.sundryId) {
                              alert('Please select a sundry type first before entering an amount.');
                              return;
                            }
                            const updatedRows = [...sundryRows];
                            updatedRows[index].amount = parseFloat(e.target.value) || 0;
                            setSundryRows(updatedRows);
                          }}
                          disabled={!sundry.sundryId}
                          className={`w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right font-mono focus:ring-2 focus:ring-blue-500 ${
                            !sundry.sundryId ? 'bg-gray-100 cursor-not-allowed' : ''
                          }`}
                          placeholder={sundry.sundryId ? "0.00" : "Select sundry first"}
                          step="0.01"
                        />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button
                          onClick={() => {
                            const updatedRows = sundryRows.filter((_, i) => i !== index);
                            setSundryRows(updatedRows);
                          }}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {sundryRows.length === 0 && (
                <div className="text-center py-6 text-gray-500 text-sm">
                  No sundries added. Use "Add Sundry" to add adjustments like rounding, freight, etc.
                </div>
              )}

              {/* Sundries Summary */}
              {sundryRows.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-300">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Sundries Total:</span>
                    <span className="font-mono">
                      ₹{sundryRows.reduce((sum, s) => {
                        return s.sundryTypeSnapshot === 'ADDITIVE' ? sum + s.amount : sum - s.amount;
                      }, 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Bill Summary - Full Width */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200 p-6">
              <h3 className="font-semibold text-lg mb-4 text-gray-900">Bill Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="text-center p-3 bg-white rounded-lg border border-gray-300">
                  <div className="text-xs text-gray-600 mb-1">Subtotal</div>
                  <div className="font-mono font-bold text-gray-900">₹{itemsSubtotal.toFixed(2)}</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
                  <div className="text-xs text-gray-600 mb-1">CGST (9%)</div>
                  <div className="font-mono font-bold text-blue-900">₹{cgstTotal.toFixed(2)}</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border border-green-200">
                  <div className="text-xs text-gray-600 mb-1">SGST (9%)</div>
                  <div className="font-mono font-bold text-green-900">₹{sgstTotal.toFixed(2)}</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border border-orange-200">
                  <div className="text-xs text-gray-600 mb-1">IGST (18%)</div>
                  <div className="font-mono font-bold text-orange-900">₹{igstTotal.toFixed(2)}</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border border-purple-200">
                  <div className="text-xs text-gray-600 mb-1">Sundries</div>
                  <div className="font-mono font-bold text-purple-900">
                    ₹{sundryRows.reduce((sum, s) => {
                      return s.sundryTypeSnapshot === 'ADDITIVE' ? sum + s.amount : sum - s.amount;
                    }, 0).toFixed(2)}
                  </div>
                </div>
                <div className="text-center p-4 bg-blue-100 rounded-lg border-2 border-blue-400">
                  <div className="text-xs text-gray-700 mb-1 font-semibold">TOTAL PAYABLE</div>
                  <div className="font-mono font-bold text-blue-900 text-xl">₹{payableAmount.toFixed(2)}</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={isSaved}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                <Save className="w-5 h-5" />
                {isSaved ? 'Bill Saved' : 'Save Purchase Bill'}
              </button>
              
              {isSaved && (
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Printer className="w-5 h-5" />
                  Print Bill
                </button>
              )}
              
              <button
                onClick={() => navigate('/purchase/entry-pass')}
                className="flex items-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
