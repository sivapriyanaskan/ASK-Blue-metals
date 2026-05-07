import { useEffect, useState } from 'react';
import { Save, ArrowLeft, AlertCircle, Printer, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { WeighbridgeDisplay } from '../components/WeighbridgeDisplay';
import { CameraCapture } from '../components/CameraCapture';
import { BarrierControl } from '../components/BarrierControl';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';
import {
  suppliersApi, type SupplierRow,
  itemsApi, type ItemRow,
  workCentresApi, type WorkCentreRow,
  describeError,
} from '../services/mastersApi';
import { purchaseEntryPassApi, type PurchaseEntryPassCreateInput } from '../services/operationsApi';

export const PurchaseEntryPassCreate = () => {
  const navigate = useNavigate();

  // ── Master data ──────────────────────────────────────────────────────────
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [workCentres, setWorkCentres] = useState<WorkCentreRow[]>([]);
  const [loadingMasters, setLoadingMasters] = useState(true);

  // ── Form fields ──────────────────────────────────────────────────────────
  const [supplierId, setSupplierId] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverMobile, setDriverMobile] = useState('');
  const [itemId, setItemId] = useState('');
  const [workCentreId, setWorkCentreId] = useState('');
  const [crRefNo, setCrRefNo] = useState('');

  // ── Hardware state ───────────────────────────────────────────────────────
  const [loadWeight, setLoadWeight] = useState<number>(0);     // in TONS
  const [weightCapturedAt, setWeightCapturedAt] = useState('');
  const [anprCaptured, setAnprCaptured] = useState(false);
  const [loadCaptured, setLoadCaptured] = useState(false);
  const [barrierStatus, setBarrierStatus] = useState<'Closed' | 'Opened' | 'Opening'>('Closed');

  // ── UI state ─────────────────────────────────────────────────────────────
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedPassId, setSavedPassId] = useState<string | null>(null);

  // ── Load masters ─────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      suppliersApi.list({ pageSize: 200, isActive: true }),
      itemsApi.list({ pageSize: 200, isActive: true }),
      workCentresApi.list({ pageSize: 200, isActive: true }),
    ])
      .then(([sup, itm, wc]) => {
        setSuppliers(sup.items);
        setItems(itm.items.filter(i => i.isRawMaterial));
        setWorkCentres(wc.items);
        // Auto-select first work centre if only one
        if (wc.items.length === 1) setWorkCentreId(wc.items[0].id);
      })
      .catch(() => {/* non-fatal, user will see empty dropdowns */})
      .finally(() => setLoadingMasters(false));
  }, []);

  // ── Derived values ───────────────────────────────────────────────────────
  const selectedSupplier = suppliers.find(s => s.id === supplierId) as (SupplierRow & { vehicles?: { vehicleNumber: string; driverName?: string | null; driverPhone?: string | null }[] }) | undefined;
  const vehicleOptions = selectedSupplier?.vehicles?.filter(v => v.isActive !== false).map(v => ({
    value: v.vehicleNumber,
    label: v.vehicleNumber,
  })) ?? [];

  const handleSupplierChange = (id: string) => {
    setSupplierId(id);
    setVehicleNo('');
    setDriverName('');
    setDriverMobile('');
    setValidationErrors(e => ({ ...e, supplierId: '', vehicleNo: '' }));
  };

  const handleVehicleChange = (vNo: string) => {
    setVehicleNo(vNo);
    const v = selectedSupplier?.vehicles?.find(x => x.vehicleNumber === vNo);
    if (v) {
      setDriverName(v.driverName ?? '');
      setDriverMobile(v.driverPhone ?? '');
    }
    setValidationErrors(e => ({ ...e, vehicleNo: '' }));
  };

  // ── Validation ───────────────────────────────────────────────────────────
  const validate = () => {
    const errors: Record<string, string> = {};
    if (!supplierId) errors.supplierId = 'Supplier is required';
    if (!vehicleNo.trim()) errors.vehicleNo = 'Vehicle No is required';
    if (!itemId) errors.itemId = 'Raw Material Item is required';
    if (!workCentreId) errors.workCentreId = 'Work Centre is required';
    if (loadWeight <= 0) errors.loadWeight = 'Capture load weight from weighbridge before saving';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaveError(null);
    if (!validate()) return;

    const input: PurchaseEntryPassCreateInput = {
      vehicleNoSnapshot: vehicleNo.trim(),
      driverNameSnapshot: driverName.trim() || null,
      driverMobile: driverMobile.trim() || null,
      supplierId,
      workCentreId,
      itemId,
      loadWeight,             // already in TONS
      crRefNo: crRefNo.trim() || null,
    };

    setIsSaving(true);
    try {
      const created = await purchaseEntryPassApi.create(input);
      setSavedPassId(created.id);
      setBarrierStatus('Opened');
      setTimeout(() => navigate(`/operations/purchase-entry-pass/${created.id}`), 2000);
    } catch (err) {
      setSaveError(describeError(err, 'Failed to create entry pass'));
    } finally {
      setIsSaving(false);
    }
  };

  const anprMismatch = false; // ANPR mismatch detection can be extended later

  if (loadingMasters) {
    return (
      <div className="p-6 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link to="/operations/purchase-entry-pass"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to List
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Create Purchase Entry Pass</h1>
      </div>

      {/* ── Hardware row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="col-span-1">
          <WeighbridgeDisplay
            onWeightCapture={(weightKg) => {
              setLoadWeight(weightKg / 1000); // KG → TON
              setWeightCapturedAt(new Date().toLocaleString('en-IN', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true,
              }));
              setValidationErrors(e => ({ ...e, loadWeight: '' }));
            }}
            externalCapturedWeight={loadWeight > 0 ? loadWeight * 1000 : null}
          />
        </div>
        <div className="col-span-1">
          <CameraCapture
            label="Front Camera"
            onCapture={() => setAnprCaptured(true)}
            externalCaptured={anprCaptured}
          />
        </div>
        <div className="col-span-1">
          <CameraCapture
            label="Top Camera"
            onCapture={() => setLoadCaptured(true)}
            externalCaptured={loadCaptured}
          />
        </div>
        <div className="col-span-1">
          <BarrierControl
            externalStatus={barrierStatus}
            onOpen={() => setBarrierStatus('Opened')}
          />
        </div>
      </div>

      {saveError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {saveError}
        </div>
      )}

      <div className="space-y-6">
        {/* ── Entry Pass Details ───────────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <h3 className="font-semibold mb-4">Entry Pass Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pass Date/Time</label>
              <input
                type="text"
                value={new Date().toLocaleString('en-IN', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit', hour12: true,
                })}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CR Reference No</label>
              <input
                type="text"
                value={crRefNo}
                onChange={e => setCrRefNo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder="CR/2026/XXX"
              />
            </div>
          </div>
        </div>

        {/* ── Supplier & Vehicle ───────────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <h3 className="font-semibold mb-4">Supplier & Vehicle Details *</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
              <SearchableDropdown
                options={suppliers.map(s => ({ value: s.id, label: `${s.code} — ${s.name}` }))}
                value={supplierId}
                onValueChange={handleSupplierChange}
                placeholder="Select Supplier"
              />
              {validationErrors.supplierId && <p className="text-xs text-red-500 mt-1">{validationErrors.supplierId}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle No *</label>
              {vehicleOptions.length > 0 ? (
                <SearchableDropdown
                  options={vehicleOptions}
                  value={vehicleNo}
                  onValueChange={handleVehicleChange}
                  placeholder="Select Vehicle"
                  disabled={!supplierId}
                />
              ) : (
                <input
                  type="text"
                  value={vehicleNo}
                  onChange={e => { setVehicleNo(e.target.value.toUpperCase()); setValidationErrors(er => ({ ...er, vehicleNo: '' })); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="e.g. MH02AB1234"
                  maxLength={20}
                  disabled={!supplierId}
                />
              )}
              {validationErrors.vehicleNo && <p className="text-xs text-red-500 mt-1">{validationErrors.vehicleNo}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name</label>
              <input
                type="text"
                value={driverName}
                onChange={e => setDriverName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter driver name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Driver Mobile</label>
              <input
                type="tel"
                value={driverMobile}
                onChange={e => setDriverMobile(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder="Enter mobile number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Raw Material Item *</label>
              <SearchableDropdown
                options={items.map(i => ({ value: i.id, label: `${i.code} — ${i.name}` }))}
                value={itemId}
                onValueChange={v => { setItemId(v); setValidationErrors(e => ({ ...e, itemId: '' })); }}
                placeholder="Select Item"
              />
              {validationErrors.itemId && <p className="text-xs text-red-500 mt-1">{validationErrors.itemId}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work Centre *</label>
              <SearchableDropdown
                options={workCentres.map(w => ({ value: w.id, label: `${w.code} — ${w.name}` }))}
                value={workCentreId}
                onValueChange={v => { setWorkCentreId(v); setValidationErrors(e => ({ ...e, workCentreId: '' })); }}
                placeholder="Select Work Centre"
              />
              {validationErrors.workCentreId && <p className="text-xs text-red-500 mt-1">{validationErrors.workCentreId}</p>}
            </div>
          </div>
        </div>

        {/* ── Load Weight ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <h3 className="font-semibold mb-4">Load Weight *</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Load Weight (TON)</label>
              <div className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 font-mono font-bold text-lg">
                {loadWeight > 0 ? loadWeight.toFixed(3) : <span className="text-gray-400">Capture from Weighbridge</span>}
              </div>
              {weightCapturedAt && <p className="text-xs text-emerald-600 mt-1">Captured at: {weightCapturedAt}</p>}
              {validationErrors.loadWeight && <p className="text-xs text-red-500 mt-1">{validationErrors.loadWeight}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weight in KG</label>
              <div className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 font-mono">
                {loadWeight > 0 ? (loadWeight * 1000).toFixed(2) : '—'}
              </div>
              <p className="text-xs text-gray-500 mt-1">Conversion: TON × 1000</p>
            </div>
          </div>
        </div>

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving || !!savedPassId}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
          >
            {isSaving ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving…</> : <><Save className="w-5 h-5" /> Save Entry Pass</>}
          </button>
          <button
            onClick={() => window.print()}
            disabled={!savedPassId}
            className="px-6 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Printer className="w-5 h-5" /> Print
          </button>
        </div>

        {savedPassId && (
          <div className="p-4 bg-green-50 border-2 border-green-500 rounded-lg flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <div className="text-lg font-bold text-green-900">Entry Pass Created — Barrier Opening</div>
              <div className="text-sm text-green-700">Redirecting to details page…</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseEntryPassCreate;
