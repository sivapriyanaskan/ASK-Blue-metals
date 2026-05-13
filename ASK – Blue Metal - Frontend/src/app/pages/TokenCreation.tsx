import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Save, Loader2, Printer } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';
import { WeighbridgeDisplay } from '../components/WeighbridgeDisplay';
import { CameraCapture } from '../components/CameraCapture';
import { useAppContext } from '../context/AppContext';
import { isInvoiceBillingOnly } from '../utils/roles';
import {
  customersApi,
  itemsApi,
  describeError,
  type CustomerRow,
  type ItemRow,
} from '../services/mastersApi';
import { tokenApi, systemSettingsApi, type TokenInput } from '../services/operationsApi';
const generateTokenNo = () => {
  // Testing range requested: 7000 to 10000.
  const min = 7000;
  const max = 10000;
  const seq = Math.floor(Math.random() * (max - min + 1)) + min;
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
  vehicleSelection: '',
  customerId: '',
  itemId: '',
  anprNumberPlateText: 'Not detected',
  driverName: '',
  driverMobile: '',
};

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:4000/api/v1';

type VehicleSelection = {
  value: string;
  label: string;
  description: string;
  customerId: string;
  vehicleNumber: string;
  driverName?: string | null;
  driverPhone?: string | null;
};

export const TokenCreation = () => {
  const navigate = useNavigate();
  const { currentWeight, isWeightStable, user } = useAppContext();
  const invoiceOnly = isInvoiceBillingOnly(user.roleCodes);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // #14 — system-setting-driven: when true, External Entry No is mandatory.
  const [externalEntryRequired, setExternalEntryRequired] = useState(false);
  const vehicleSectionRef = useRef<HTMLDivElement | null>(null);
  const vehicleDropdownRef = useRef<HTMLDivElement | null>(null);
  const itemDropdownRef = useRef<HTMLDivElement | null>(null);
  const saveButtonRef = useRef<HTMLButtonElement | null>(null);
  const initialEnterHandledRef = useRef(false);

  const focusDropdownTrigger = (container: HTMLDivElement | null) => {
    const trigger = container?.querySelector('button[type="button"]') as HTMLButtonElement | null;
    trigger?.focus();
  };

  useEffect(() => {
    Promise.all([
      customersApi.list({ pageSize: 200, isActive: true }),
      itemsApi.list({ pageSize: 200, isActive: true }),
    ])
      .then(async ([c, i]) => {
        const detailedCustomers = await Promise.all(
          c.items.map(async (row) => {
            try {
              return await customersApi.get(row.id);
            } catch {
              return row;
            }
          }),
        );
        setCustomers(detailedCustomers);
        setItems(i.items);
      })
      .catch((err) => setError(describeError(err, 'Failed to load reference data')));
  }, []);

  // First Enter should scroll to Vehicle Number and open the dropdown.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || initialEnterHandledRef.current || saving) return;
      if (form.vehicleSelection) return;

      const activeTag = (document.activeElement as HTMLElement | null)?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') return;

      event.preventDefault();
      const vehicleSection = vehicleSectionRef.current;
      if (vehicleSection) {
        const mainScrollContainer = document.querySelector('main.flex-1.overflow-auto') as HTMLElement | null;
        let scrollContainer: HTMLElement | null = vehicleSection.parentElement;
        while (scrollContainer) {
          const style = window.getComputedStyle(scrollContainer);
          const isScrollable =
            (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
            scrollContainer.scrollHeight > scrollContainer.clientHeight;
          if (isScrollable) break;
          scrollContainer = scrollContainer.parentElement;
        }

        if (mainScrollContainer) {
          scrollContainer = mainScrollContainer;
        }

        const sectionRect = vehicleSection.getBoundingClientRect();
        const topOffset = 200;
        if (scrollContainer) {
          const containerRect = scrollContainer.getBoundingClientRect();
          const absoluteTop = scrollContainer.scrollTop + (sectionRect.top - containerRect.top);
          const targetTop = Math.max(Math.round(absoluteTop - topOffset), 0);
          scrollContainer.scrollTo({
            top: targetTop,
            behavior: 'smooth',
          });
        } else {
          const targetTop = Math.max(window.scrollY + sectionRect.top - topOffset, 0);
          window.scrollTo({ top: targetTop, behavior: 'smooth' });
        }
      }

      const trigger = vehicleDropdownRef.current?.querySelector('button[type="button"]') as
        | HTMLButtonElement
        | null;
      if (trigger) {
        window.setTimeout(() => {
          trigger.focus({ preventScroll: true });
          if (trigger.getAttribute('aria-expanded') !== 'true') {
            trigger.click();
          }
        }, 180);
      }

      initialEnterHandledRef.current = true;
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [form.vehicleSelection, saving]);

  // #14 — fetch the External-Entry-Required flag once on mount so the form
  // can mark the field required and validate before submit.
  useEffect(() => {
    systemSettingsApi
      .get('tokens.externalEntryRequired')
      .then((s) => setExternalEntryRequired(s?.value === true))
      .catch(() => setExternalEntryRequired(false));
  }, []);

  const vehicleOptions = useMemo<VehicleSelection[]>(() => {
    const options: VehicleSelection[] = [];
    customers.forEach((c) => {
      // Invoice Billing role only deals with GST tax-invoice customers; hide
      // every other bill type completely so they cannot be picked.
      if (invoiceOnly && c.billType !== 'TAX_INVOICE') return;
      const billTypeText = c.billType === 'TAX_INVOICE' ? 'Tax Invoice' : 'Invoice';
      (c.vehicles ?? []).forEach((v) => {
        options.push({
          value: `${c.id}::${v.vehicleNumber}`,
          label: invoiceOnly
            ? `${v.vehicleNumber} / ${c.name}`
            : `${v.vehicleNumber} / ${c.name} / ${billTypeText}`,
          description: `${v.driverName ?? '-'}${v.driverPhone ? ` · ${v.driverPhone}` : ''}`,
          customerId: c.id,
          vehicleNumber: v.vehicleNumber,
          driverName: v.driverName,
          driverPhone: v.driverPhone,
        });
      });
    });
    return options;
  }, [customers, invoiceOnly]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!form.vehicleSelection) { setError('Vehicle number is required.'); return; }
    if (!form.customerId) { setError('Customer is required.'); return; }
    if (!form.itemId) { setError('Item is required.'); return; }
    if (form.anprNumberPlateText === 'Not detected' || !form.anprNumberPlateText.trim()) { 
      setError('Vehicle number is required.'); return; 
    }
    if (!isWeightStable || currentWeight <= 0) {
      setError('Weight is not stable yet. Please wait a moment and save again.'); return;
    }

    setSaving(true);
    try {
      // New flow: images + weight are captured automatically at save time.
      const [frontImageRef, topImageRef] = await Promise.all([
        captureCameraImage('front'),
        captureCameraImage('top'),
      ]);

      const input: TokenInput = {
        customerId: form.customerId,
        itemId: form.itemId,
        vehicleNo: form.anprNumberPlateText.trim(),
        emptyWeight: Number(currentWeight),
        driverName: form.driverName.trim() || null,
        driverMobile: form.driverMobile.trim() || null,
        anprNumberPlateText: form.anprNumberPlateText.trim(),
        anprImageRef: frontImageRef,
        loadImageRef: topImageRef,
        externalEntryNo: externalEntryRequired ? `AUTO-${Date.now()}` : null,
        weightCapturedAt: new Date().toISOString(),
      };
      const created = await tokenApi.create(input);
      // Boom barrier section removed from UI; treat save as automatic open trigger.
      navigate(`/operations/token/${created.id}`);
    } catch (err) {
      setError(describeError(err, 'Failed to create token'));
    } finally {
      setSaving(false);
    }
  };

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === form.customerId),
    [customers, form.customerId],
  );
  const itemOptions = items.map((i) => ({ value: i.id, label: `${i.name}` }));

  return (
    <div className="p-6 w-full space-y-6">
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

      {/* Hardware widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
        <div className="lg:col-span-4 min-h-[420px] flex flex-col gap-4">
          <div className="flex-1 min-h-[200px]">
            <WeighbridgeDisplay hideControls />
          </div>
          <div className="flex-1 min-h-[200px]">
            <CameraCapture
              label="Top Camera"
              cameraId="top"
              hideControls
            />
          </div>
        </div>
        <div className="lg:col-span-8 min-h-[420px]">
          <CameraCapture
            label="Front Camera"
            cameraId="front"
            hideControls
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Vehicle first */}
        <div ref={vehicleSectionRef} className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">1. Vehicle</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div ref={vehicleDropdownRef}>
              <label className="text-sm font-medium block mb-1">Vehicle Number *</label>
              <SearchableDropdown
                options={vehicleOptions.map((v) => ({
                  value: v.value,
                  label: v.label,
                  description: v.description,
                }))}
                value={form.vehicleSelection}
                onValueChange={(value) => {
                  const found = vehicleOptions.find((v) => v.value === value);
                  if (!found) return;
                  setForm((f) => ({
                    ...f,
                    vehicleSelection: value,
                    customerId: found.customerId,
                    anprNumberPlateText: found.vehicleNumber,
                    driverName: found.driverName ?? '',
                    driverMobile: found.driverPhone ?? '',
                  }));
                  setTimeout(() => focusDropdownTrigger(itemDropdownRef.current), 0);
                }}
                placeholder="Search vehicle / customer / type"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Customer</label>
              <input
                value={selectedCustomer?.name ?? ''}
                readOnly
                tabIndex={-1}
                className="px-3 py-2 w-full rounded-md border border-input bg-gray-50 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Number Plate</label>
              <input
                value={form.anprNumberPlateText}
                readOnly
                tabIndex={-1}
                className="px-3 py-2 w-full rounded-md border border-input bg-gray-50 font-mono text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Driver Name</label>
              <input
                value={form.driverName}
                readOnly
                tabIndex={-1}
                className="px-3 py-2 w-full rounded-md border border-input bg-gray-50 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Driver Mobile</label>
              <input
                value={form.driverMobile}
                readOnly
                tabIndex={-1}
                className="px-3 py-2 w-full rounded-md border border-input bg-gray-50 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Live Weight (KG)</label>
              <input
                value={currentWeight > 0 ? String(currentWeight) : ''}
                readOnly
                tabIndex={-1}
                className="px-3 py-2 w-full rounded-md border border-input bg-gray-50 font-mono text-sm"
              />
              <div className={`text-xs mt-1 ${isWeightStable ? 'text-emerald-600' : 'text-amber-600'}`}>
                {isWeightStable ? 'Stable' : 'Waiting for stable weight'}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Item */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">2. Item</h2>
          <div className="grid grid-cols-1 gap-4">
            <div ref={itemDropdownRef} className="w-full">
              <label className="text-sm font-medium block mb-1">Item *</label>
              <SearchableDropdown
                options={itemOptions}
                value={form.itemId}
                onValueChange={(v) => {
                  setForm((f) => ({ ...f, itemId: v }));
                  setTimeout(() => saveButtonRef.current?.focus(), 0);
                }}
                placeholder="Select Item"
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* 3. Token Header */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">3. Token Header</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Token No *</label>
              <input
                value={form.tokenNo}
                readOnly
                className="px-3 py-2 w-full rounded-md border border-input bg-gray-50 font-mono text-sm"
              />
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
            ref={saveButtonRef}
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus-visible:bg-emerald-600 focus-visible:ring-4 focus-visible:ring-emerald-200 focus-visible:outline-none disabled:opacity-50 text-sm font-medium transition-colors"
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
