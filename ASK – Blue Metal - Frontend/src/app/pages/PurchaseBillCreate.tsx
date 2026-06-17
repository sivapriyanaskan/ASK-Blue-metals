import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Save, ArrowLeft, AlertCircle, Scale, Plus, Trash2 } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';
import { WeighbridgeDisplay } from '../components/WeighbridgeDisplay';
import { CameraCapture } from '../components/CameraCapture';
import { BarrierControl } from '../components/BarrierControl';
import {
  purchaseEntryPassApi, purchaseBillApi,
  PurchaseEntryPassRow,
} from '../services/operationsApi';
import {
  workCentresApi, banksApi, billSundriesApi, itemsApi, supplierRatesApi,
  BillSundryRow, ItemRow, describeError,
} from '../services/mastersApi';

interface BillItem {
  id: string;
  itemId: string;
  itemNameSnapshot: string;
  rate: number;
  rateSource: string;
  qty: number;
  amount: number;
  gstPercent: number;
  gstAmount: number;
  totalAmount: number;
  vehicleRent: number;
  rateOverridden: boolean;
  rateOverrideReason: string;
}

export const PurchaseBillCreate = () => {
  const navigate = useNavigate();
  const [purchaseDateTime, setPurchaseDateTime] = useState(new Date().toISOString().slice(0, 16));
  const [purchaseNo, setPurchaseNo] = useState('');
  const [entryPassId, setEntryPassId] = useState('');
  const [passNo, setPassNo] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverMobile, setDriverMobile] = useState('');
  const [workCentreId, setWorkCentreId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [supplierNameSnapshot, setSupplierNameSnapshot] = useState('');
  const [supplierAddressSnapshot, setSupplierAddressSnapshot] = useState('');
  const [supplierGstNoSnapshot, setSupplierGstNoSnapshot] = useState('');
  const [loadWeight, setLoadWeight] = useState(0);
  const [lastEmptyWeight, setLastEmptyWeight] = useState(0);
  const [emptyWeight, setEmptyWeight] = useState(0);
  const [netWeight, setNetWeight] = useState(0);
  const [weighbridgeReadingId, setWeighbridgeReadingId] = useState('');
  const [weightCapturedAt, setWeightCapturedAt] = useState('');
  const [emptyWeightOverridden, setEmptyWeightOverridden] = useState(false);
  const [emptyWeightOverrideReason, setEmptyWeightOverrideReason] = useState('');
  const [showEmptyWeightOverrideModal, setShowEmptyWeightOverrideModal] = useState(false);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [paymentMode, setPaymentMode] = useState('CREDIT');
  const [crReferenceNo, setCrReferenceNo] = useState('');
  const [cashPayment, setCashPayment] = useState(0);
  const [digitalPayment, setDigitalPayment] = useState(0);
  const [bankId, setBankId] = useState('');
  const [transactionNo, setTransactionNo] = useState('');
  
  // Denomination tracking (matching Sales Bill structure)
  const [denominationsIn, setDenominationsIn] = useState({
    '2000': 0, '500': 0, '200': 0, '100': 0, '50': 0, '20': 0, '10': 0, '5': 0, '2': 0, '1': 0
  });
  const [denominationsOut, setDenominationsOut] = useState({
    '2000': 0, '500': 0, '200': 0, '100': 0, '50': 0, '20': 0, '10': 0, '5': 0, '2': 0, '1': 0
  });
  const [cashPaymentTotal, setCashPaymentTotal] = useState(0); // Total from denominationsIn
  const [balanceGiven, setBalanceGiven] = useState(0); // Total from denominationsOut
  
  const [remarks, setRemarks] = useState('');
  const [showEntryPassSearch, setShowEntryPassSearch] = useState(false);
  const [supplierType, setSupplierType] = useState<'TON_BASED' | 'CUBIC_BASED' | ''>('');
  const [cftValue, setCftValue] = useState(0);
  const [vehicleConfig, setVehicleConfig] = useState<{ length: number; breadth: number; height: number; adjustmentValue: number; cuftTotal: number } | null>(null);

  // API-loaded data
  const [entryPasses, setEntryPasses] = useState<PurchaseEntryPassRow[]>([]);
  const [workCentres, setWorkCentres] = useState<{ id: string; name: string }[]>([]);
  const [banks, setBanks] = useState<{ id: string; name: string }[]>([]);
  const [availableSundries, setAvailableSundries] = useState<BillSundryRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      purchaseEntryPassApi.list({ status: 'OPEN', pageSize: 200 }),
      workCentresApi.list({ pageSize: 200, isActive: true }),
      banksApi.list({ pageSize: 200, isActive: true }),
      billSundriesApi.list({ pageSize: 200, isActive: true }),
      itemsApi.list({ pageSize: 200, isActive: true }),
    ]).then(([passes, wcs, bks, sunds, itms]) => {
      setEntryPasses(passes.items);
      setWorkCentres(wcs.items.map(wc => ({ id: wc.id, name: wc.name })));
      setBanks(bks.items.map(b => ({ id: b.id, name: b.name })));
      setAvailableSundries(sunds.items);
      setItems(itms.items);
      setLoadingData(false);
    }).catch(err => {
      setSaveError(describeError(err, 'Failed to load form data'));
      setLoadingData(false);
    });
  }, []);

  // Hardware state - cameras and ANPR
  const [anprImagePreview, setAnprImagePreview] = useState<string | null>(null);
  const [loadImagePreview, setLoadImagePreview] = useState<string | null>(null);
  const [anprImageRef, setAnprImageRef] = useState('');
  const [loadImageRef, setLoadImageRef] = useState('');
  const [anprPlateText, setAnprPlateText] = useState('');
  const [anprMismatchWarning, setAnprMismatchWarning] = useState('');
  const [weighbridgeOffline, setWeighbridgeOffline] = useState(false);
  const [cameraOffline, setCameraOffline] = useState(false);

  // Bill Sundries state
  const [sundryRows, setSundryRows] = useState<any[]>([]);

  // Entry pass dropdown options (loaded from API)
  const entryPassOptions = entryPasses.map(ep => ({
    label: `Pass ${ep.passNo} - ${ep.vehicleNoSnapshot}`,
    value: ep.id,
    description: `${ep.supplierNameSnapshot} | ${ep.itemNameSnapshot} | ${ep.loadWeight} TON`,
  }));

  const handleSelectEntryPass = async (passId: string) => {
    const pass = entryPasses.find(p => p.id === passId);
    if (!pass) return;

    setEntryPassId(pass.id);
    setPassNo(pass.passNo);
    setVehicleNo(pass.vehicleNoSnapshot);
    setDriverName(pass.driverNameSnapshot || '');
    setDriverMobile(pass.driverMobile || '');
    setSupplierId(pass.supplierId);
    setSupplierNameSnapshot(pass.supplierNameSnapshot);
    setSupplierAddressSnapshot('');
    setSupplierGstNoSnapshot('');
    setLoadWeight(Number(pass.loadWeight));
    setLastEmptyWeight(0);
    setWorkCentreId(pass.workCentreId);
    setSupplierType('TON_BASED');
    setVehicleConfig(null);
    setCftValue(0);

    // Fetch supplier rate for this supplier + item
    let rate = 0;
    let rateSource = 'No rate configured';
    try {
      const rateResult = await supplierRatesApi.list({ supplierId: pass.supplierId, itemId: pass.itemId, isActive: true, pageSize: 1 });
      if (rateResult.items.length > 0) {
        rate = Number(rateResult.items[0].rate);
        rateSource = 'Supplier Rate';
      }
    } catch { /* keep rate 0 */ }

    // Get item gstPercent from loaded items
    const item = items.find(i => i.id === pass.itemId);
    const gstPercent = item ? Number(item.gstPercent) : 0;

    setBillItems([{
      id: 'auto_' + Date.now(),
      itemId: pass.itemId,
      itemNameSnapshot: pass.itemNameSnapshot,
      rate,
      rateSource,
      qty: 0,
      amount: 0,
      gstPercent,
      gstAmount: 0,
      totalAmount: 0,
      vehicleRent: 0,
      rateOverridden: false,
      rateOverrideReason: '',
    }]);

    setShowEntryPassSearch(false);
  };

  const handleSupplierChange = (selectedSupplierId: string) => {
    setSupplierId(selectedSupplierId);
  };

  const handleCaptureEmptyWeight = (weightKg: number) => {
    const weightTon = weightKg / 1000;
    const netWt = Math.max(0, loadWeight - weightTon);
    setEmptyWeight(weightTon);
    setNetWeight(netWt);
    setWeighbridgeReadingId('WB_' + Date.now());
    setWeightCapturedAt(new Date().toISOString().slice(0, 16));

    if (billItems.length > 0) {
      setBillItems(billItems.map(item => {
        const qty = netWt;
        const amount = qty * item.rate;
        const gstAmount = amount * (item.gstPercent / 100);
        return { ...item, qty, amount, gstAmount, totalAmount: amount + gstAmount };
      }));
    }
  };

  const addBillItem = () => {
    const newItem: BillItem = {
      id: Date.now().toString(),
      itemId: '',
      itemNameSnapshot: '',
      rate: 0,
      rateSource: 'Fallback Getting Price',
      qty: netWeight,
      amount: 0,
      gstPercent: 18,
      gstAmount: 0,
      totalAmount: 0,
      vehicleRent: 0,
      rateOverridden: false,
      rateOverrideReason: ''
    };
    setBillItems([...billItems, newItem]);
  };

  const updateBillItem = (id: string, field: string, value: any) => {
    setBillItems(billItems.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === 'rate' || field === 'gstPercent' || field === 'qty') {
        const amount = updated.qty * updated.rate;
        const gstAmount = amount * (updated.gstPercent / 100);
        updated.amount = amount;
        updated.gstAmount = gstAmount;
        updated.totalAmount = amount + gstAmount;
      }
      return updated;
    }));
  };

  const handleDenominationInChange = (denom: string, count: number) => {
    const newDenominations = { ...denominationsIn, [denom]: count };
    setDenominationsIn(newDenominations);
    
    const total = Object.entries(newDenominations).reduce((sum, [denomination, qty]) => {
      return sum + (parseInt(denomination) * qty);
    }, 0);
    
    setCashPaymentTotal(total);
    setCashPayment(total);
  };

  const handleDenominationOutChange = (denom: string, count: number) => {
    const newDenominations = { ...denominationsOut, [denom]: count };
    setDenominationsOut(newDenominations);
    
    const total = Object.entries(newDenominations).reduce((sum, [denomination, qty]) => {
      return sum + (parseInt(denomination) * qty);
    }, 0);
    
    setBalanceGiven(total);
  };

  const grossAmount = billItems.reduce((sum, item) => sum + item.amount, 0);
  const cgstTotal = billItems.reduce((sum, item) => sum + (item.gstAmount / 2), 0);
  const sgstTotal = billItems.reduce((sum, item) => sum + (item.gstAmount / 2), 0);
  const igstTotal = 0;
  
  // Calculate sundries total (additive or deductive)
  const sundriesTotal = sundryRows.reduce((sum, s) => {
    return s.sundryTypeSnapshot === 'ADDITIVE' ? sum + s.amount : sum - s.amount;
  }, 0);
  
  const itemsTotal = grossAmount + cgstTotal + sgstTotal;
  const grandTotal = itemsTotal + sundriesTotal;
  const roundOffAmount = Math.round(grandTotal) - grandTotal;
  const grossPayable = Math.round(grandTotal);

  const paidAmount = paymentMode === 'CREDIT' ? 0 : paymentMode === 'MIXED' ? (cashPayment + digitalPayment) : paymentMode === 'CASH' ? cashPayment : digitalPayment;
  const balanceToReceive = grossPayable - paidAmount;

  const handleSave = async () => {
    if (!entryPassId || !supplierId || !vehicleNo || emptyWeight === 0 || billItems.length === 0) {
      setSaveError('Please select an entry pass and capture the empty weight first.');
      return;
    }
    const mainItem = billItems[0];
    if (!mainItem.itemId || mainItem.rate <= 0) {
      setSaveError('No supplier rate configured for this item. Please set up the rate in Supplier Master before creating a bill.');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const created = await purchaseBillApi.create({
        entryPassId,
        vehicleNoSnapshot: vehicleNo,
        driverNameSnapshot: driverName || null,
        supplierId,
        workCentreId,
        itemId: mainItem.itemId,
        loadWeight,
        emptyWeight,
        rate: mainItem.rate,
        gstPercent: mainItem.gstPercent,
        paymentMode: (paymentMode as any) || 'CREDIT',
      });
      navigate(`/operations/purchase-bill/${created.id}`);
    } catch (err) {
      setSaveError(describeError(err, 'Failed to create purchase bill'));
    } finally {
      setSaving(false);
    }
  };

  const hasValidationErrors = !entryPassId || !workCentreId || emptyWeight === 0 || billItems.length === 0;

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          to="/operations/purchase-bill"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to List
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Create Purchase Bill</h1>
      </div>

      {/* Hardware Components Row - Top Section */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="col-span-1">
          <WeighbridgeDisplay 
            onWeightCapture={handleCaptureEmptyWeight}
            externalCapturedWeight={emptyWeight * 1000}
          />
        </div>
        <div className="col-span-1">
          <CameraCapture
            label="Front Camera"
            onCapture={(img) => {
              setAnprImagePreview(img);
              setAnprImageRef('anpr_' + Date.now());
              const extractedPlateText = vehicleNo || 'MH02AB1234';
              setAnprPlateText(extractedPlateText);
              
              // Check for mismatch between ANPR and entered vehicle no
              if (vehicleNo && extractedPlateText !== vehicleNo) {
                setAnprMismatchWarning(`ANPR detected "${extractedPlateText}" but vehicle no is "${vehicleNo}". Please verify!`);
              } else {
                setAnprMismatchWarning('');
              }
            }}
          />
        </div>
        <div className="col-span-1">
          <CameraCapture
            label="Top Camera"
            onCapture={(img) => {
              setLoadImagePreview(img);
              setLoadImageRef('load_' + Date.now());
            }}
          />
        </div>
        <div className="col-span-1">
          <BarrierControl
            label="Exit Boom Barrier"
            onOpen={() => alert('✅ Exit Barrier Opened - Vehicle can leave')}
            onClose={() => alert('🚧 Exit Barrier Closed')}
          />
        </div>
      </div>

      {/* ANPR Mismatch Warning */}
      {anprMismatchWarning && (
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-500 rounded-lg flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-red-900">Vehicle Number Mismatch</h3>
            <p className="text-sm text-red-800 mt-1">{anprMismatchWarning}</p>
          </div>
        </div>
      )}

      {/* Pass Selection - First Step */}
      <div className="bg-white rounded-lg border border-gray-300 p-6 mb-6">
        <h3 className="font-semibold mb-4">Select Entry Pass *</h3>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Entry Pass (OPEN Only)
          </label>
          <SearchableDropdown
            options={entryPassOptions}
            value={entryPassId}
            onValueChange={handleSelectEntryPass}
            placeholder="Search by Pass No, Vehicle No, or Supplier..."
            className="w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pass No *
            </label>
            <input
              type="text"
              value={passNo}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 font-mono font-bold"
              placeholder="Select entry pass first"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vehicle No *
            </label>
            <input
              type="text"
              value={vehicleNo}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 font-mono font-medium"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Driver Name
            </label>
            <input
              type="text"
              value={driverName}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Driver Mobile
            </label>
            <input
              type="text"
              value={driverMobile}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Show remaining sections only after Pass is selected */}
      {entryPassId && (
        <>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <h3 className="font-semibold mb-4">Bill Header</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase No
                </label>
                <input
                  type="text"
                  value="Auto-generated"
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-400 font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Date/Time *
                </label>
                <input
                  type="datetime-local"
                  value={purchaseDateTime}
                  onChange={(e) => setPurchaseDateTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Work Centre *
                </label>
                <SearchableDropdown
                  options={workCentres.map(wc => ({ 
                    label: wc.name, 
                    value: wc.id 
                  }))}
                  value={workCentreId}
                  onValueChange={setWorkCentreId}
                  placeholder="Select Work Centre"
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <h3 className="font-semibold mb-4">Supplier Snapshot</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier Name *
                </label>
                <input
                  type="text"
                  value={supplierNameSnapshot}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 font-medium"
                  placeholder="Pre-filled from entry pass"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Empty wt
                  </label>
                  <input
                    type="text"
                    value={lastEmptyWeight || '---'}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cu.Ft
                  </label>
                  <input
                    type="text"
                    value={cftValue > 0 ? cftValue.toFixed(6) : '---'}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier Address
                </label>
                <input
                  type="text"
                  value={supplierAddressSnapshot}
                  onChange={(e) => setSupplierAddressSnapshot(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter supplier address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier GST No
                </label>
                <input
                  type="text"
                  value={supplierGstNoSnapshot}
                  onChange={(e) => setSupplierGstNoSnapshot(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="27AAAAA0000A1Z5"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Scale className="w-5 h-5 text-orange-600" />
              Weight Capture (Exit)
            </h3>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-xs text-blue-700 mb-1">Load Weight</div>
                <div className="font-mono font-bold text-xl text-blue-900">{loadWeight} TON</div>
                <div className="text-xs text-blue-600 mt-1">Entry Gate</div>
              </div>
              <div className="p-3 bg-gray-50 border border-gray-300 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">Last Empty</div>
                <div className="font-mono font-bold text-lg text-gray-700">{lastEmptyWeight} TON</div>
                <div className="text-xs text-gray-500 mt-1">Reference</div>
              </div>
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="text-xs text-orange-700 mb-1">Empty Weight *</div>
                <div className="font-mono font-bold text-xl text-orange-900">{emptyWeight || '---'} TON</div>
                <div className="text-xs text-orange-600 mt-1">Exit Gate</div>
              </div>
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-xs text-green-700 mb-1">Net Weight</div>
                <div className="font-mono font-bold text-2xl text-green-900">{netWeight.toFixed(2)} TON</div>
                <div className="text-xs text-green-600 mt-1">Computed</div>
              </div>
            </div>

            {emptyWeight === 0 && entryPassId && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700 flex items-center gap-2">
                <Scale className="w-4 h-4" />
                Use the Weighbridge widget above to capture the empty (exit) weight.
              </div>
            )}

            {emptyWeight > 0 && (
              <div className="space-y-3">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-green-700">Weighbridge Reading ID:</span>
                    <span className="font-mono font-medium text-green-900">{weighbridgeReadingId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-green-700">Captured At:</span>
                    <span className="font-medium text-green-900">
                      {new Date(weightCapturedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                </div>

                {supplierType === 'CUBIC_BASED' && vehicleConfig && (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-purple-900">CUBIC Calculation</h4>
                      <span className="px-2 py-1 bg-purple-600 text-white text-xs font-bold rounded">CUBIC_BASED</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-purple-700">Length:</span>
                        <span className="font-mono font-medium text-purple-900">{vehicleConfig.length} ft</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-purple-700">Breadth:</span>
                        <span className="font-mono font-medium text-purple-900">{vehicleConfig.breadth} ft</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-purple-700">Height:</span>
                        <span className="font-mono font-medium text-purple-900">{vehicleConfig.height} ft</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-purple-700">Adjustment:</span>
                        <span className={`font-mono font-medium ${vehicleConfig.adjustmentValue >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {vehicleConfig.adjustmentValue >= 0 ? '+' : ''}{vehicleConfig.adjustmentValue}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-purple-300">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-purple-900">CFT Value:</span>
                          <span className="font-mono font-bold text-lg text-purple-900">{cftValue} CFT</span>
                        </div>
                        <div className="text-xs text-purple-600 mt-1 text-right">
                          ({vehicleConfig.length} × {vehicleConfig.breadth} × {vehicleConfig.height}) + {vehicleConfig.adjustmentValue} = {cftValue}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {supplierType === 'TON_BASED' && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-green-900">TON Calculation</h4>
                      <span className="px-2 py-1 bg-green-600 text-white text-xs font-bold rounded">TON_BASED</span>
                    </div>
                    <div className="text-sm text-green-700">
                      Quantity defaults to Net Weight from weighbridge
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Purchase Items *</h3>
              <div className="text-xs text-blue-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Auto-loaded from Entry Pass
              </div>
            </div>

            {billItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No items loaded. Please select an Entry Pass first.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-300">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">GST %</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">V.Rent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {billItems.map((item) => (
                      <tr key={item.id} className="bg-blue-50">
                        <td className="px-3 py-2">
                          <div className="font-medium text-gray-900">{item.itemNameSnapshot}</div>
                          {item.itemId && (
                            <div className="mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                                item.rateSource === 'Supplier Rate'
                                  ? 'bg-green-100 text-green-800'
                                  : item.rateSource === 'No rate configured'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {item.rateSource}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={item.qty.toFixed(2)}
                            disabled
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-right font-mono bg-gray-100 font-medium"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={item.rate > 0 ? item.rate.toFixed(2) : '—'}
                            disabled
                            className={`w-24 px-2 py-1 border rounded text-right font-mono font-bold ${
                              item.rate > 0 ? 'border-gray-300 bg-gray-50 text-gray-900' : 'border-red-300 bg-red-50 text-red-600'
                            }`}
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-medium">₹{item.amount.toFixed(2)}</td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={item.gstPercent}
                            disabled
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-right bg-gray-100 font-medium"
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold">₹{item.totalAmount.toFixed(2)}</td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={item.vehicleRent}
                            onChange={(e) => updateBillItem(item.id, 'vehicleRent', parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-right"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                        options={availableSundries
                          .filter(s => s.isActive)
                          .filter(s => {
                            const alreadySelected = sundryRows.some((row, idx) => 
                              idx !== index && row.sundryId === s.id
                            );
                            return !alreadySelected;
                          })
                          .map(s => ({
                            label: s.name,
                            value: s.id,
                            description: s.isAddition ? '(+) Additive' : '(-) Deductive',
                          }))}
                        value={sundry.sundryId}
                        onValueChange={(value) => {
                          const selectedSundry = availableSundries.find(s => s.id === value);
                          if (selectedSundry) {
                            const updatedRows = [...sundryRows];
                            updatedRows[index].sundryId = value;
                            updatedRows[index].sundryNameSnapshot = selectedSundry.name;
                            updatedRows[index].sundryTypeSnapshot = selectedSundry.isAddition ? 'ADDITIVE' : 'DEDUCTIVE';
                            updatedRows[index].amount = 0;
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
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
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
                No sundries added. Click "Add Sundry" to add charges or deductions.
              </div>
            )}
          </div>

          {/* Save and Cancel buttons at the bottom of left column */}
          {saveError && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {saveError}
            </div>
          )}
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={saving || hasValidationErrors}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Purchase Bill'}
            </button>
            <Link
              to="/operations/purchase-bill"
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </Link>
          </div>
        </div>

        {/* Right Column - Summaries and Payment Details */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <h3 className="font-semibold mb-4">Bill Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Gross Amount</span>
                <span className="font-mono font-medium">₹{grossAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">CGST</span>
                <span className="font-mono font-medium">₹{cgstTotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">SGST</span>
                <span className="font-mono font-medium">₹{sgstTotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">IGST</span>
                <span className="font-mono font-medium">₹{igstTotal.toFixed(2)}</span>
              </div>
              
              {/* Bill Sundries Summary */}
              {sundryRows.length > 0 && (
                <div className="pt-2 border-t border-gray-300">
                  <div className="text-xs font-medium text-gray-500 uppercase mb-2">Bill Sundries</div>
                  {sundryRows.map((sundry, index) => (
                    sundry.sundryId && (
                      <div key={index} className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600 text-xs">{sundry.sundryNameSnapshot}</span>
                        <span className={`font-mono font-medium ${
                          sundry.sundryTypeSnapshot === 'ADDITIVE' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {sundry.sundryTypeSnapshot === 'ADDITIVE' ? '+' : '-'}₹{sundry.amount.toFixed(2)}
                        </span>
                      </div>
                    )
                  ))}
                  <div className="flex items-center justify-between text-sm mt-2 pt-1 border-t border-gray-100">
                    <span className="text-gray-700 font-medium">Sundries Total</span>
                    <span className={`font-mono font-bold ${
                      sundriesTotal >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {sundriesTotal >= 0 ? '+' : ''}₹{sundriesTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Round Off</span>
                <span className="font-mono font-medium">₹{roundOffAmount.toFixed(2)}</span>
              </div>
              <div className="pt-3 border-t-2 border-gray-300">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-lg text-gray-900">Gross Payable</span>
                  <span className="font-mono font-bold text-2xl text-green-600">₹{grossPayable.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <h3 className="font-semibold mb-4">Payment Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Payment Mode</span>
                <span className="font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{paymentMode}</span>
              </div>
              {paymentMode === 'CREDIT' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-xs text-blue-700 mb-1">CR Reference</div>
                  <div className="font-mono font-medium text-blue-900">{crReferenceNo || 'Not Set'}</div>
                </div>
              )}
              {(paymentMode === 'CASH' || paymentMode === 'MIXED') && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Cash Payment</span>
                  <span className="font-mono font-bold text-green-600">₹{cashPayment.toLocaleString()}</span>
                </div>
              )}
              {(paymentMode === 'ONLINE' || paymentMode === 'MIXED') && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Digital Payment</span>
                  <span className="font-mono font-bold text-blue-600">₹{digitalPayment.toLocaleString()}</span>
                </div>
              )}
              <div className="pt-3 border-t-2 border-gray-300">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-gray-900">Paid Amount</span>
                  <span className="font-mono font-bold text-lg text-blue-600">₹{paidAmount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900">Balance to Receive</span>
                  <span className={`font-mono font-bold text-lg ${balanceToReceive > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{balanceToReceive.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <h3 className="font-semibold mb-4">Payment Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Mode *
                </label>
                <SearchableDropdown
                  options={[
                    { label: 'CREDIT', value: 'CREDIT' },
                    { label: 'CASH', value: 'CASH' },
                    { label: 'ONLINE', value: 'ONLINE' },
                    { label: 'MIXED', value: 'MIXED' }
                  ]}
                  value={paymentMode}
                  onValueChange={setPaymentMode}
                  placeholder="Select Payment Mode"
                  className="w-full"
                />
              </div>
              {paymentMode === 'CREDIT' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CR Reference No *
                  </label>
                  <input
                    type="text"
                    value={crReferenceNo}
                    onChange={(e) => setCrReferenceNo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="CR/2026/XXX"
                  />
                </div>
              )}
              {paymentMode === 'CASH' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cash Payment
                  </label>
                  <input
                    type="number"
                    value={cashPayment}
                    onChange={(e) => setCashPayment(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    step="0.01"
                  />
                </div>
              )}
              {paymentMode === 'ONLINE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Digital Payment
                  </label>
                  <input
                    type="number"
                    value={digitalPayment}
                    onChange={(e) => setDigitalPayment(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    step="0.01"
                  />
                </div>
              )}
              {paymentMode === 'MIXED' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cash Payment
                    </label>
                    <input
                      type="number"
                      value={cashPayment}
                      onChange={(e) => setCashPayment(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Digital Payment
                    </label>
                    <input
                      type="number"
                      value={digitalPayment}
                      onChange={(e) => setDigitalPayment(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      step="0.01"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Online Payment Details */}
          {(paymentMode === 'ONLINE' || paymentMode === 'MIXED') && (
            <div className="bg-white rounded-lg border border-gray-300 p-6">
              <h3 className="font-semibold mb-4">Online Payment Details</h3>
              {paymentMode === 'ONLINE' && digitalPayment === 0 && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-yellow-800">
                    <AlertCircle className="w-4 h-4" />
                    <span>Digital payment is required for ONLINE mode.</span>
                  </div>
                </div>
              )}
              {!bankId && (paymentMode === 'ONLINE' || (paymentMode === 'MIXED' && digitalPayment > 0)) && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-yellow-800">
                    <AlertCircle className="w-4 h-4" />
                    <span>Bank and Transaction No are required for online payments.</span>
                  </div>
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bank *
                  </label>
                  <SearchableDropdown
                    options={banks.map(bank => ({ 
                      label: bank.name, 
                      value: bank.id 
                    }))}
                    value={bankId}
                    onValueChange={setBankId}
                    placeholder="Select Bank"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transaction No *
                  </label>
                  <input
                    type="text"
                    value={transactionNo}
                    onChange={(e) => setTransactionNo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="TXN1234567890"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Digital Payment Amount *
                  </label>
                  <input
                    type="number"
                    value={digitalPayment}
                    onChange={(e) => setDigitalPayment(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-lg"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Remarks */}
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <h3 className="font-semibold mb-3">Remarks</h3>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Enter any remarks..."
            />
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
};