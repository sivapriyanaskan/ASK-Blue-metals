import { useEffect, useMemo, useState } from 'react';
import { Save, ArrowLeft, AlertCircle, Printer, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { WeighbridgeDisplay } from '../components/WeighbridgeDisplay';
import { CameraCapture } from '../components/CameraCapture';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';
import { useAppContext } from '../context/AppContext';
import {
  suppliersApi, type SupplierRow,
  itemsApi, type ItemRow,
  supplierRatesApi,
  workCentresApi, type WorkCentreRow,
  describeError,
} from '../services/mastersApi';
import { purchaseEntryPassApi, type PurchaseEntryPassCreateInput } from '../services/operationsApi';

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:4000/api/v1';

export const PurchaseEntryPassCreate = () => {
  const navigate = useNavigate();
  const { currentWeight, isWeightStable } = useAppContext();

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
  const [anprImageRef, setAnprImageRef] = useState<string | null>(null);
  const [loadImageRef, setLoadImageRef] = useState<string | null>(null);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedPassId, setSavedPassId] = useState<string | null>(null);
  const [itemAutofillHint, setItemAutofillHint] = useState('');

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
  const selectedSupplier = suppliers.find(s => s.id === supplierId);
  const vehicleOptions = useMemo(() =>
    suppliers.flatMap((s) =>
      (s.vehicles ?? [])
        .filter((v) => v.isActive !== false)
        .map((v) => ({
          value: v.vehicleNumber,
          label: `${v.vehicleNumber} / ${s.name}`,
          description: `${v.driverName ?? '-'}${v.driverPhone ? ` · ${v.driverPhone}` : ''}`,
          supplierId: s.id,
          driverName: v.driverName ?? '',
          driverPhone: v.driverPhone ?? '',
        })),
    ),
  [suppliers]);
  const selectedVehicle = selectedSupplier?.vehicles?.find(v => v.vehicleNumber === vehicleNo) as ({ emptyWeight?: number } | undefined);
  const selectedVehicleEmptyWeight = Number(selectedVehicle?.emptyWeight ?? 7000);

  const handleSupplierChange = (id: string) => {
    setSupplierId(id);
    setVehicleNo('');
    setDriverName('');
    setDriverMobile('');
    setItemId('');
    setItemAutofillHint('');
    setValidationErrors(e => ({ ...e, supplierId: '', vehicleNo: '' }));
  };

  const handleVehicleChange = async (vNo: string) => {
    setVehicleNo(vNo);
    const selected = vehicleOptions.find((v) => v.value === vNo);
    if (selected) {
      setSupplierId(selected.supplierId);
      setDriverName(selected.driverName);
      setDriverMobile(selected.driverPhone);

      // Auto-fill item from latest entry-pass history for this vehicle+supplier,
      // fallback to first active supplier rate item.
      let nextItemId = '';
      let hint = '';
      try {
        const recent = await purchaseEntryPassApi.list({ pageSize: 100, search: vNo });
        const match = recent.items.find(
          (p) =>
            p.supplierId === selected.supplierId &&
            p.vehicleNoSnapshot.toUpperCase() === vNo.toUpperCase(),
        );
        if (match?.itemId) {
          nextItemId = match.itemId;
          hint = 'Item auto-filled from last pass for this vehicle.';
        }
      } catch {
        // Non-blocking; fallback below.
      }

      if (!nextItemId) {
        try {
          const rates = await supplierRatesApi.list({ supplierId: selected.supplierId, isActive: true, pageSize: 1 });
          if (rates.items[0]?.itemId) {
            nextItemId = rates.items[0].itemId;
            hint = 'Item auto-filled from supplier rate.';
          }
        } catch {
          // Non-blocking.
        }
      }

      if (nextItemId) {
        setItemId(nextItemId);
        setValidationErrors((e) => ({ ...e, itemId: '' }));
      }
      setItemAutofillHint(hint);
    }
    setValidationErrors(e => ({ ...e, vehicleNo: '', supplierId: '' }));
  };

  const captureCameraImage = async (cameraId: 'front' | 'top'): Promise<string | null> => {
    try {
      const res = await fetch(
        `${API_BASE}/cameras/${encodeURIComponent(cameraId)}/capture`,
        { method: 'POST', credentials: 'include' },
      );
      if (!res.ok) return null;
      const json = (await res.json()) as { url?: string };
      return json.url ?? null;
    } catch {
      return null;
    }
  };

  // ── Validation ───────────────────────────────────────────────────────────
  const validate = () => {
    const errors: Record<string, string> = {};
    if (!supplierId) errors.supplierId = 'Supplier is required';
    if (!vehicleNo.trim()) errors.vehicleNo = 'Vehicle No is required';
    if (!itemId) errors.itemId = 'Raw Material Item is required';
    // #30 — Work Centre no longer required.
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaveError(null);
    if (!validate()) return;

    let effectiveLoadWeight = loadWeight;
    if (effectiveLoadWeight <= 0) {
      if (!isWeightStable || currentWeight <= 0) {
        setValidationErrors((e) => ({ ...e, loadWeight: 'Waiting for stable weighbridge reading. Try save again in a moment.' }));
        return;
      }
      effectiveLoadWeight = currentWeight / 1000;
      setLoadWeight(effectiveLoadWeight);
      setWeightCapturedAt(new Date().toLocaleString('en-IN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      }));
      setValidationErrors((e) => ({ ...e, loadWeight: '' }));
    }

    const [frontImageRef, topImageRef] = await Promise.all([
      captureCameraImage('front'),
      captureCameraImage('top'),
    ]);

    setAnprImageRef(frontImageRef);
    setLoadImageRef(topImageRef);
    setAnprCaptured(!!frontImageRef);
    setLoadCaptured(!!topImageRef);

    const input: PurchaseEntryPassCreateInput = {
      vehicleNoSnapshot: vehicleNo.trim(),
      driverNameSnapshot: driverName.trim() || null,
      driverMobile: driverMobile.trim() || null,
      supplierId,
      workCentreId: workCentreId || null,
      itemId,
      loadWeight: effectiveLoadWeight,             // in TONS
      crRefNo: crRefNo.trim() || null,
      anprImageRef: frontImageRef ?? anprImageRef ?? null,
      loadImageRef: topImageRef ?? loadImageRef ?? null,
    };

    setIsSaving(true);
    try {
      const created = await purchaseEntryPassApi.create(input);
      setSavedPassId(created.id);
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
        <div className="lg:col-span-4 min-h-[420px] flex flex-col gap-4">
          <div className="flex-1 min-h-[200px]">
          <WeighbridgeDisplay
            onWeightCapture={(weightKg) => {
              setLoadWeight(weightKg / 1000); // KG → TON
              setWeightCapturedAt(new Date().toLocaleString('en-IN', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true,
              }));
              setValidationErrors(e => ({ ...e, loadWeight: '' }));
            }}
            autoCapture
            hideControls
            externalCapturedWeight={loadWeight > 0 ? loadWeight * 1000 : null}
            simulationMinWeight={selectedVehicleEmptyWeight + 10000}
            simulationMaxWeight={selectedVehicleEmptyWeight + 15000}
          />
          </div>
          <div className="flex-1 min-h-[200px]">
            <CameraCapture
              label="Top Camera"
              cameraId="top"
              onCapture={(ref) => {
                setLoadImageRef(ref);
                setLoadCaptured(true);
              }}
              autoCapture
              externalCaptured={loadCaptured}
              hideControls
            />
          </div>
        </div>
        <div className="lg:col-span-8 min-h-[420px]">
          <CameraCapture
            label="Front Camera"
            cameraId="front"
            onCapture={(ref) => {
              setAnprImageRef(ref);
              setAnprCaptured(true);
            }}
            autoCapture
            externalCaptured={anprCaptured}
            hideControls
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

        {/* ── Vehicle First Flow ───────────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <h3 className="font-semibold mb-4">Vehicle & Supplier Details *</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle No *</label>
              <SearchableDropdown
                options={vehicleOptions}
                value={vehicleNo}
                onValueChange={(v) => { void handleVehicleChange(v); }}
                placeholder={vehicleOptions.length ? 'Search Vehicle (auto-fills supplier & driver)' : 'No vehicles available'}
                disabled={vehicleOptions.length === 0}
              />
              {validationErrors.vehicleNo && <p className="text-xs text-red-500 mt-1">{validationErrors.vehicleNo}</p>}
              {itemAutofillHint && <p className="text-xs text-emerald-600 mt-1">{itemAutofillHint}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
              <input
                type="text"
                value={selectedSupplier ? `${selectedSupplier.code} — ${selectedSupplier.name}` : ''}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                placeholder="Auto-filled from vehicle"
              />
              {validationErrors.supplierId && <p className="text-xs text-red-500 mt-1">{validationErrors.supplierId}</p>}
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
            {/* #30 — Work Centre field removed from new entry passes */}
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
                {loadWeight > 0 ? (loadWeight * 1000).toFixed(3) : '—'}
              </div>
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
