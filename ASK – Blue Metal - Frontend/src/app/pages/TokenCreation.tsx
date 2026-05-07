import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Save, Loader2, Printer } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';
import { WeighbridgeDisplay } from '../components/WeighbridgeDisplay';
import { CameraCapture } from '../components/CameraCapture';
import { BarrierControl } from '../components/BarrierControl';
import {
  customersApi,
  itemsApi,
  describeError,
  type CustomerRow,
  type ItemRow,
} from '../services/mastersApi';
import { tokenApi, type TokenInput } from '../services/operationsApi';

interface FormState {
  tokenNo: string;
  entryNo: string;
  tokenDateTime: string;
  customerId: string;
  itemId: string;
  anprNumberPlateText: string;
  emptyWeight: string;
  driverName: string;
  driverMobile: string;
  weightCaptured: boolean;
  frontCameraRef: string | null;
  topCameraRef: string | null;
  barrierOpened: boolean;
}

const generateTokenNo = () => {
  const now = new Date();
  const seq = String(Math.floor(Math.random() * 9999)).padStart(4, '0');
  return `TKN-${seq}`;
};

const generateEntryNo = () => {
  const now = new Date();
  const year = now.getFullYear();
  const seq = Math.floor(Math.random() * 999999) + 1;
  return String(seq);
};

const emptyForm: FormState = {
  tokenNo: generateTokenNo(),
  entryNo: generateEntryNo(),
  tokenDateTime: new Date().toLocaleString('en-GB', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  }),
  customerId: '',
  itemId: '',
  anprNumberPlateText: 'Not detected',
  emptyWeight: '———',
  driverName: '',
  driverMobile: '',
  weightCaptured: false,
  frontCameraRef: null,
  topCameraRef: null,
  barrierOpened: false,
};

export const TokenCreation = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      customersApi.list({ pageSize: 200, isActive: true }),
      itemsApi.list({ pageSize: 200, isActive: true }),
    ])
      .then(([c, i]) => { setCustomers(c.items); setItems(i.items); })
      .catch((err) => setError(describeError(err, 'Failed to load reference data')));
  }, []);

  const customer = useMemo(() => customers.find((c) => c.id === form.customerId), [customers, form.customerId]);
  const customerVehicles = customer?.vehicles ?? [];

  const onPickVehicle = (vehicleNo: string) => {
    const match = customerVehicles.find((v) => v.vehicleNumber === vehicleNo);
    setForm((f) => ({
      ...f,
      anprNumberPlateText: vehicleNo,
      driverName: match?.driverName ?? f.driverName,
      driverMobile: match?.driverPhone ?? f.driverMobile,
    }));
  };

  // Hardware capture functions
  const handleWeightCapture = (weightKg: number) => {
    setForm((f) => ({ ...f, emptyWeight: String(weightKg), weightCaptured: true }));
  };

  const handleFrontCameraCapture = (imageRef: string) => {
    setForm((f) => ({ ...f, frontCameraRef: imageRef }));
  };

  const handleTopCameraCapture = (imageRef: string) => {
    setForm((f) => ({ ...f, topCameraRef: imageRef }));
  };

  const handleBarrierOpen = () => {
    setForm((f) => ({ ...f, barrierOpened: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!form.customerId) { setError('Customer is required.'); return; }
    if (!form.itemId) { setError('Item is required.'); return; }
    if (form.anprNumberPlateText === 'Not detected' || !form.anprNumberPlateText.trim()) { 
      setError('Vehicle number is required.'); return; 
    }
    if (form.emptyWeight === '———' || !form.emptyWeight || isNaN(Number(form.emptyWeight))) { 
      setError('Empty weight is required.'); return; 
    }
    if (!form.weightCaptured) {
      setError('Please capture the weight from weighbridge before saving.'); return;
    }

    setSaving(true);
    try {
      const input: TokenInput = {
        customerId: form.customerId,
        itemId: form.itemId,
        vehicleNo: form.anprNumberPlateText.trim(),
        emptyWeight: Number(form.emptyWeight),
        driverName: form.driverName.trim() || null,
        driverMobile: form.driverMobile.trim() || null,
        anprNumberPlateText: form.anprNumberPlateText.trim(),
        anprImageRef: form.frontCameraRef,
        loadImageRef: form.topCameraRef,
        weightCapturedAt: new Date().toISOString(),
      };
      const created = await tokenApi.create(input);
      setForm((f) => ({ ...f, barrierOpened: true }));
      // Delay navigation to show barrier opening
      setTimeout(() => navigate(`/operations/token/${created.id}`), 2000);
    } catch (err) {
      setError(describeError(err, 'Failed to create token'));
    } finally {
      setSaving(false);
    }
  };

  const customerOptions = customers.map((c) => ({ value: c.id, label: `${c.name}` }));
  const itemOptions = items.map((i) => ({ value: i.id, label: `${i.name}` }));

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <button
        type="button"
        onClick={() => navigate('/operations/token')}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to tokens
      </button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Token Creation</h1>
      </div>

      {error && <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</div>}

      {/* Hardware Widgets Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="min-h-[280px]">
          <WeighbridgeDisplay onWeightCapture={handleWeightCapture} />
        </div>
        <div className="min-h-[280px]">
          <CameraCapture
            label="Front Camera"
            cameraId="front"
            onCapture={handleFrontCameraCapture}
          />
        </div>
        <div className="min-h-[280px]">
          <CameraCapture
            label="Top Camera"
            cameraId="top"
            onCapture={handleTopCameraCapture}
          />
        </div>
        <div className="min-h-[280px]">
          <BarrierControl 
            onOpen={handleBarrierOpen}
            autoOpen={form.barrierOpened}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Token Header */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">1. Token Header</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Token No *</label>
              <input
                value={form.tokenNo}
                readOnly
                className="px-3 py-2 w-full rounded-md border border-input bg-gray-50 font-mono text-sm"
              />
              <div className="text-xs text-muted-foreground mt-1">Daily reset at 12:00 AM</div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Entry No</label>
              <input
                value={form.entryNo}
                readOnly
                className="px-3 py-2 w-full rounded-md border border-input bg-gray-50 font-mono text-sm"
              />
              <div className="text-xs text-muted-foreground mt-1">Item-based yearly running number</div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Token Date/Time *</label>
              <input
                value={form.tokenDateTime}
                readOnly
                className="px-3 py-2 w-full rounded-md border border-input bg-gray-50 text-sm"
              />
            </div>
          </div>
        </div>

        {/* 2. Customer & Vehicle */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">2. Customer & Vehicle</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Customer *</label>
              <SearchableDropdown
                options={customerOptions}
                value={form.customerId}
                onValueChange={(v) => setForm((f) => ({ ...f, customerId: v }))}
                placeholder="Select Customer"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Item *</label>
              <SearchableDropdown
                options={itemOptions}
                value={form.itemId}
                onValueChange={(v) => setForm((f) => ({ ...f, itemId: v }))}
                placeholder="Select Item"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">ANPR Number Plate</label>
              <input
                value={form.anprNumberPlateText}
                onChange={(e) => setForm((f) => ({ ...f, anprNumberPlateText: e.target.value.toUpperCase() }))}
                placeholder="Not detected"
                className="px-3 py-2 w-full rounded-md border border-input bg-background font-mono text-sm"
                maxLength={32}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Empty Weight (KG)</label>
              <input
                type="number"
                step="0.01"
                value={form.emptyWeight === '———' ? '' : form.emptyWeight}
                onChange={(e) => setForm((f) => ({ ...f, emptyWeight: e.target.value, weightCaptured: false }))}
                placeholder="———"
                className="px-3 py-2 w-full rounded-md border border-input bg-background font-mono text-sm text-center"
              />
              {form.weightCaptured && (
                <div className="text-xs text-emerald-600 mt-1">✓ Weight captured from weighbridge</div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Driver Name</label>
              <input
                value={form.driverName}
                onChange={(e) => setForm((f) => ({ ...f, driverName: e.target.value }))}
                placeholder="Enter driver name"
                className="px-3 py-2 w-full rounded-md border border-input bg-background text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Driver Mobile</label>
              <input
                value={form.driverMobile}
                onChange={(e) => setForm((f) => ({ ...f, driverMobile: e.target.value }))}
                placeholder="Enter mobile number"
                className="px-3 py-2 w-full rounded-md border border-input bg-background text-sm"
                maxLength={20}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md border border-input hover:bg-muted text-sm"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
          
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Token
          </button>
        </div>
      </form>
    </div>
  );
};

export default TokenCreation;
