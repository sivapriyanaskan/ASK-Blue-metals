import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, Save, Loader2, Scale, Search, Plus, Trash2 } from 'lucide-react';
import { WeighbridgeDisplay } from '../components/WeighbridgeDisplay';
import { CameraCapture } from '../components/CameraCapture';
import { BarrierControl } from '../components/BarrierControl';
import { PaymentSection } from '../components/PaymentSection';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';
import { tokenApi, salesBillApi, type TokenRow, type PaymentMode, type SalesBillFromTokenInput } from '../services/operationsApi';
import { describeError, banksApi, billSundriesApi, type BankRow, type BillSundryRow } from '../services/mastersApi';

const fmtNum = (s: string | number) => Number(s).toLocaleString(undefined, { maximumFractionDigits: 2 });
const fmtMoney = (s: string | number) =>
  Number(s).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const round2 = (n: number) => Math.round(n * 100) / 100;

interface FormState {
  billNo: string;
  billDateTime: string;
  selectedTokenId: string;
  emptyWeight: string;
  loadWeight: string;
  netWeight: string;
  grossWeight: string;
  netWeightInput: string;
  rateOverride: string;
  paymentMode: PaymentMode;
  cashAmount: string;
  onlineAmount: string;
  creditAmount: string;
  remarks: string;
  weightCaptured: boolean;
  frontCameraRef: string | null;
  topCameraRef: string | null;
  barrierOpened: boolean;
  
  // Payment section fields required by PaymentSection component
  receivableAmount: number;
  receivedAmount: number;
  balanceAmount: number;
  denominations: Record<string, number>;
  returnedDenominations: Record<string, number>;
  cashCollected: number;
  balanceToBeGiven: number;
  bankId: string;
  accountNo: string;
  transactionNo: string;
  digitalPayment: number;
  crRefNo: string;
  
  // Driver BATA
  driverBataAmount: string;
  driverBataReference: string;
  
  // Bill sundries
  billSundries: Array<{
    sundryId: string;
    sundryNameSnapshot: string;
    sundryTypeSnapshot: 'ADDITIVE' | 'DEDUCTIVE';
    amount: number;
  }>;
}

const generateBillNo = () => {
  const now = new Date();
  const year = now.getFullYear() % 100;
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const seq = Math.floor(Math.random() * 99999) + 1;
  return `INV/${month}/${seq.toString().padStart(5, '0')}/${year}`;
};

const DENOMINATIONS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 2000];
const DENOMINATION_INITIAL_STATE = Object.fromEntries(DENOMINATIONS.map(d => [String(d), 0]));

const empty: FormState = {
  billNo: generateBillNo(),
  billDateTime: new Date().toLocaleString('en-GB', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  }),
  selectedTokenId: '',
  emptyWeight: '',
  loadWeight: '',
  netWeight: '',
  grossWeight: '', 
  netWeightInput: '', 
  rateOverride: '', 
  paymentMode: 'CASH',
  cashAmount: '', 
  onlineAmount: '', 
  creditAmount: '', 
  remarks: '',
  weightCaptured: false,
  frontCameraRef: null,
  topCameraRef: null,
  barrierOpened: false,
  
  // Payment section state
  receivableAmount: 0,
  receivedAmount: 0,
  balanceAmount: 0,
  denominations: { ...DENOMINATION_INITIAL_STATE },
  returnedDenominations: { ...DENOMINATION_INITIAL_STATE },
  cashCollected: 0,
  balanceToBeGiven: 0,
  bankId: '',
  accountNo: '',
  transactionNo: '',
  digitalPayment: 0,
  crRefNo: '',
  
  driverBataAmount: '0',
  driverBataReference: '',
  billSundries: [],
};

export const SalesBill = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const tokenId = params.get('tokenId');
  const [token, setToken] = useState<TokenRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty);

  // Token picker state (used when no tokenId in URL)
  const [openTokens, setOpenTokens] = useState<TokenRow[]>([]);
  const [tokenSearch, setTokenSearch] = useState('');
  const [banks, setBanks] = useState<BankRow[]>([]);
  const [availableSundries, setAvailableSundries] = useState<BillSundryRow[]>([]);

  useEffect(() => {
    if (!tokenId) {
      // Load open tokens for picker
      tokenApi.list({ status: 'OPEN', pageSize: 200 })
        .then((res) => setOpenTokens(res.items))
        .catch((err) => setError(describeError(err, 'Failed to load tokens')))
        .finally(() => setLoading(false));
      return;
    }
    tokenApi.get(tokenId)
      .then((token) => {
        if (!token) {
          setError('Token not found or has been deleted.');
          return;
        }
        if (!token.customer || !token.item) {
          setError(`Token data is incomplete. Missing: ${[
            !token.customer && 'customer',
            !token.item && 'item',
          ].filter(Boolean).join(', ')}`);
          return;
        }
        if (token.status !== 'OPEN') {
          setError(`Cannot create bill for ${token.status} token. Only OPEN tokens can be billed.`);
          return;
        }
        
        setToken(token);
        // Pre-populate form fields from token
        setForm(prevForm => ({
          ...prevForm,
          selectedTokenId: token.id,
          emptyWeight: String(token.emptyWeight || 0),
        }));
        setError(null); // Clear any previous errors
      })
      .catch((err) => {
        console.error('Token loading error:', err);
        setError(describeError(err, 'Failed to load token'));
      })
      .finally(() => setLoading(false));
  }, [tokenId]);

  // Load banks data for payment section
  useEffect(() => {
    banksApi.list()
      .then((res) => setBanks(res.items))
      .catch((err) => console.error('Failed to load banks:', err));
  }, []);

  // Load available bill sundries (active only)
  useEffect(() => {
    billSundriesApi.list({ pageSize: 200 })
      .then((res) => setAvailableSundries(res.items.filter((s: BillSundryRow) => s.isActive !== false)))
      .catch((err) => console.error('Failed to load bill sundries:', err));
  }, []);

  // Live preview using item.sellingPrice unless an override is given.
  const preview = useMemo(() => {
    if (!token?.item || !token?.customer) return null;
    
    // Use loadWeight (gross weight from scale) for calculations
    const emptyWeight = Number(token.emptyWeight || 0);
    const loadWeight = Number(form.loadWeight || 0);
    
    if (!Number.isFinite(loadWeight) || loadWeight <= emptyWeight) {
      return null;
    }
    
    const isTax = token.customer.billType === 'TAX_INVOICE';
    // Entry screen always shows the FULL net weight & amount.
    // For non-GST customers the printed/stored bill is halved by the backend,
    // but the screen shows the full figures (with GST = 0).
    const netWeightKg = loadWeight - emptyWeight;
    const netWeightTons = round2(netWeightKg / 1000);
    
    const rate = form.rateOverride ? Number(form.rateOverride) : Number(token.item.sellingPrice || 0);
    if (!Number.isFinite(rate) || rate < 0) return null;
    
    const taxable = round2(netWeightTons * rate);
    const gstP = Number(token.item.gstPercent || 0);
    // Non-GST customers: GST is recorded on the bill at backend (computed on
    // halved taxable) but displayed as 0 on this entry screen for clarity.
    const effectiveGstPercent = 0;
    const cgst = isTax ? round2((taxable * gstP) / 200) : 0;
    const sgst = isTax ? round2((taxable * gstP) / 200) : 0;
    const tcsP = token.customer.tcsApplicable ? 0.1 : 0;
    const tcs = round2(((taxable + cgst + sgst) * tcsP) / 100);
    const sundriesTotal = form.billSundries.reduce((sum, s) => {
      return s.sundryTypeSnapshot === 'ADDITIVE' ? sum + Number(s.amount || 0) : sum - Number(s.amount || 0);
    }, 0);
    const subtotal = taxable + cgst + sgst + tcs + sundriesTotal;
    const total = Math.round(subtotal);
    const roundOff = round2(total - subtotal);
    
    return { 
      net: netWeightTons, 
      netKg: netWeightKg,
      rate, 
      taxable, 
      cgst, 
      sgst, 
      tcs, 
      sundriesTotal,
      total, 
      roundOff,
      effectiveGstPercent,
      isTax,
    };
  }, [token, form.loadWeight, form.rateOverride, form.billSundries]);

  // Update receivable amount when preview changes
  useEffect(() => {
    if (preview?.total) {
      setForm(f => ({ 
        ...f, 
        receivableAmount: preview.total,
        // Reset payment calculations when amount changes
        receivedAmount: 0,
        balanceAmount: preview.total
      }));
    }
  }, [preview]);

  const captureWeight = () => {
    if (!form.loadWeight) {
      setError('Please enter load weight before capturing');
      return;
    }
    const weight = Number(form.loadWeight);
    const emptyWeight = Number(token?.emptyWeight || 0);
    
    if (weight <= emptyWeight) {
      setError('Load weight must be greater than empty weight');
      return;
    }
    
    setForm((f) => ({ ...f, weightCaptured: true }));
    setError(null); // Clear any previous errors
  };

  // Hardware capture functions
  const handleWeightCapture = (weight: number) => {
    if (!token) {
      console.error('Cannot capture weight: no token loaded');
      return;
    }
    
    const emptyWeight = Number(token.emptyWeight || 0);
    const netKg = Math.max(0, weight - emptyWeight);
    const netTons = round2(netKg / 1000);
    
    setForm((f) => ({ 
      ...f, 
      loadWeight: String(weight),
      grossWeight: String(weight), // Keep both for compatibility
      netWeight: String(netTons),
      weightCaptured: true // Automatically capture when from hardware
    }));
    
    // Clear any weight-related errors
    if (error && error.includes('weight')) {
      setError(null);
    }
  };

  const handleFrontCameraCapture = (imageRef: string) => {
    setForm((f) => ({ ...f, frontCameraRef: imageRef }));
  };

  const handleTopCameraCapture = (imageRef: string) => {
    setForm((f) => ({ ...f, topCameraRef: imageRef }));
  };

  const addBillSundry = () => {
    const newSundry = {
      sundryId: '',
      sundryNameSnapshot: '',
      sundryTypeSnapshot: 'ADDITIVE' as const,
      amount: 0,
    };
    setForm((f) => ({ ...f, billSundries: [...f.billSundries, newSundry] }));
  };

  const sundriesTotal = preview?.sundriesTotal ?? 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!token || !tokenId) {
      setError('No token selected'); 
      return;
    }
    
    const loadWeight = Number(form.loadWeight || 0);
    const emptyWeight = Number(token.emptyWeight || 0);
    
    // Validation
    if (!Number.isFinite(loadWeight) || loadWeight <= emptyWeight) {
      setError('Load weight must be greater than empty weight.');
      return;
    }
    
    if (!form.weightCaptured) {
      setError('Please capture the weight before saving.');
      return;
    }
    
    if (!preview) {
      setError('Unable to calculate bill totals. Please check weight and rate.');
      return;
    }
    
    const denominationsArr = Object.entries(form.denominations || {})
      .map(([denom, nos]) => ({
        denomination: Number(denom),
        nos: Number(nos) || 0,
        amount: Number(denom) * (Number(nos) || 0),
      }))
      .filter((d) => d.nos > 0);

    const input: SalesBillFromTokenInput = {
      grossWeight: loadWeight,
      rateOverride: form.rateOverride ? Number(form.rateOverride) : undefined,
      paymentMode: form.paymentMode,
      cashAmount: form.cashAmount ? Number(form.cashAmount) : 0,
      onlineAmount: form.onlineAmount ? Number(form.onlineAmount) : 0,
      creditAmount: form.creditAmount ? Number(form.creditAmount) : 0,
      denominations: denominationsArr,
      remarks: form.remarks.trim() || null,
    };

    setSaving(true);
    try {
      const created = await salesBillApi.createFromToken(tokenId, input);
      navigate(`/operations/sales-bill/${created.id}`);
    } catch (err) {
      setError(describeError(err, 'Failed to create sales bill'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="p-6 flex items-center gap-2 text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
    </div>
  );

  // No tokenId — show token picker
  if (!tokenId) {
    const filtered = openTokens.filter((t) => {
      if (!tokenSearch.trim()) return true;
      const q = tokenSearch.toLowerCase();
      return (
        t.tokenNo.toLowerCase().includes(q) ||
        t.vehicleNo.toLowerCase().includes(q) ||
        t.customer?.name?.toLowerCase().includes(q) ||
        t.item?.name?.toLowerCase().includes(q)
      );
    });

    return (
      <div className="p-6 max-w-4xl mx-auto space-y-5">
        <button onClick={() => navigate('/operations/sales-bill')} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Sales Bills
        </button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New Sales Bill</h1>
          <p className="text-sm text-muted-foreground">Select an open token to convert into a sales bill.</p>
        </div>
        {error && <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</div>}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={tokenSearch}
            onChange={(e) => setTokenSearch(e.target.value)}
            placeholder="Search token / vehicle / customer / item"
            className="pl-9 pr-3 py-2 w-full rounded-md border border-input bg-background"
          />
        </div>
        {filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground">No open tokens found.</div>
        ) : (
          <div className="border rounded-md overflow-hidden bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Token #</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Customer</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Item</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Vehicle</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2 font-mono font-medium">{t.tokenNo}</td>
                    <td className="px-4 py-2 text-muted-foreground">{new Date(t.tokenDateTime).toLocaleDateString()}</td>
                    <td className="px-4 py-2">{t.customer?.name || 'N/A'}</td>
                    <td className="px-4 py-2">{t.item?.name || 'N/A'}</td>
                    <td className="px-4 py-2 font-mono">{t.vehicleNo}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => navigate(`/operations/sales-bill/create?tokenId=${t.id}`)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700"
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // TokenId present but token not loaded or invalid
  if (tokenId && !token) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-3">
        <button onClick={() => navigate('/operations/sales-bill')} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to sales bills
        </button>
        {error ? (
          <div>
            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md mb-3">{error}</div>
            <button 
              onClick={() => window.location.reload()}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading token details…
          </div>
        )}
      </div>
    );
  }

  // Check if token status is valid for billing
  if (token && token.status !== 'OPEN') {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-3">
        <button onClick={() => navigate('/operations/sales-bill')} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to sales bills
        </button>
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-md px-3 py-2 text-sm">
          Token #{token.tokenNo} is {token.status}. Only OPEN tokens can be billed.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/operations/sales-bill')} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to sales bills
          </button>
          <h1 className="text-2xl font-semibold tracking-tight">Create Sales Bill</h1>
        </div>
        <div className="text-sm text-muted-foreground">
          Payment: <span className="font-medium text-orange-600">PENDING</span> No items added
        </div>
      </div>

      {error && <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</div>}

      {/* Token Information */}
      {token && (
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Selected Token Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="border rounded-md bg-card p-4 space-y-1">
              <div className="text-xs uppercase font-medium text-muted-foreground tracking-wider mb-1">Token Details</div>
              <div className="font-mono font-medium">Token #{token.tokenNo}</div>
              <div className="text-muted-foreground">Entry #{token.entryNo}</div>
              <div className="text-muted-foreground">{new Date(token.tokenDateTime).toLocaleString()}</div>
              <div className={`text-xs px-2 py-1 rounded inline-block ${
                token.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {token.status}
              </div>
            </div>
            <div className="border rounded-md bg-card p-4 space-y-1">
              <div className="text-xs uppercase font-medium text-muted-foreground tracking-wider mb-1">Customer</div>
              <div>{token.customer?.name || 'N/A'}</div>
              <div className="text-muted-foreground">
                {token.customer?.billType === 'TAX_INVOICE' ? 'Tax Invoice' : 'Non-GST'}
                {token.customer?.gstNumber ? ` · GSTIN ${token.customer.gstNumber}` : ''}
              </div>
            </div>
            <div className="border rounded-md bg-card p-4 space-y-1">
              <div className="text-xs uppercase font-medium text-muted-foreground tracking-wider mb-1">Item & Vehicle</div>
              <div>{token.item?.code} — {token.item?.name || 'N/A'}</div>
              <div className="text-muted-foreground font-mono">{token.vehicleNo}</div>
              <div className="text-xs text-muted-foreground">
                Rate: ₹{token.item?.sellingPrice || 0}/ton | GST: {token.item?.gstPercent || 0}%
              </div>
            </div>
            <div className="border rounded-md bg-card p-4 space-y-1">
              <div className="text-xs uppercase font-medium text-muted-foreground tracking-wider mb-1">Driver</div>
              <div>{token.driverName || 'N/A'}</div>
              <div className="text-muted-foreground font-mono">{token.driverMobile || 'N/A'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Hardware Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="min-h-[280px]">
          <WeighbridgeDisplay onWeightCapture={handleWeightCapture} />
        </div>
        <div className="min-h-[280px]">
          <CameraCapture
            label="Front Camera"
            onCapture={handleFrontCameraCapture}
          />
        </div>
        <div className="min-h-[280px]">
          <CameraCapture
            label="Top Camera"
            onCapture={handleTopCameraCapture}
          />
        </div>
        <div className="min-h-[280px]">
          <BarrierControl onOpen={() => setForm(f => ({ ...f, barrierOpened: true }))} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Bill Header */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Bill Header</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Bill No</label>
              <input
                value={form.billNo}
                readOnly
                className="px-3 py-2 w-full rounded-md border border-input bg-gray-50 font-mono text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Bill Date & Time</label>
              <input
                value={form.billDateTime}
                readOnly
                className="px-3 py-2 w-full rounded-md border border-input bg-gray-50 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Customer Snapshot */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold">Customer Snapshot</h2>
            <span className="text-red-500">*</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">Customer Code</label>
              <input
                value={token?.customer.code || ''}
                readOnly
                className="px-3 py-2 w-full rounded-md border border-input bg-gray-50 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Customer Name *</label>
              <div className="flex items-center gap-2">
                <input
                  value={token ? `${token.customer?.name || 'N/A'} (Code: ${token.customer?.code || 'N/A'})` : ''}
                  readOnly
                  className="px-3 py-2 flex-1 rounded-md border border-input bg-gray-50 text-sm"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-muted-foreground">Address</label>
              <textarea
                value={token?.customer.address || ''}
                readOnly
                className="px-3 py-2 w-full rounded-md border border-input bg-gray-50 text-sm"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Place of Supply *</label>
              <input
                value={token?.customer.placeOfSupply || ''}
                readOnly
                className="px-3 py-2 w-full rounded-md border border-input bg-gray-50 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Weight Capture */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold">Weight Capture</h2>
            <span className="text-red-500">*</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Empty Weight</label>
              <div className="flex items-center">
                <input
                  value={token?.emptyWeight || form.emptyWeight}
                  readOnly
                  className="px-3 py-2 flex-1 rounded-md border border-input bg-gray-50 font-mono text-sm"
                />
                <span className="ml-2 text-sm text-muted-foreground">KG</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Load Weight *</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={form.loadWeight}
                  onChange={(e) => {
                    const loadWeight = e.target.value;
                    const emptyWeight = Number(token?.emptyWeight || 0);
                    const netKg = loadWeight ? Math.max(0, Number(loadWeight) - emptyWeight) : 0;
                    const netTons = round2(netKg / 1000);
                    
                    setForm(f => ({ 
                      ...f, 
                      loadWeight,
                      grossWeight: loadWeight, // Keep synced
                      netWeight: String(netTons),
                      weightCaptured: false // Reset capture status when weight changes
                    }));
                  }}
                  placeholder="Enter gross weight"
                  className="px-3 py-2 flex-1 rounded-md border border-input bg-background font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={captureWeight}
                  disabled={!form.loadWeight || form.weightCaptured}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    form.weightCaptured
                      ? 'bg-green-100 text-green-700 border border-green-300 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                  }`}
                >
                  {form.weightCaptured ? '✓ Captured' : 'Capture'}
                </button>
                <span className="text-sm text-muted-foreground">KG</span>
              </div>
              {form.weightCaptured && (
                <div className="text-xs text-green-600 mt-1">✓ Weight captured and verified</div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Net Weight</label>
              <div className="flex items-center">
                <input
                  value={form.netWeight}
                  readOnly
                  placeholder="———"
                  className="px-3 py-2 flex-1 rounded-md border border-input bg-gray-50 font-mono text-sm"
                />
                <span className="ml-2 text-sm text-muted-foreground">TON</span>
              </div>
            </div>
          </div>
        </div>

        {/* Items Section */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold">Items</h2>
            <span className="text-red-500">*</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">ITEM *</th>
                  <th className="px-3 py-2 text-left font-medium">HSN</th>
                  <th className="px-3 py-2 text-left font-medium">RATE *</th>
                  <th className="px-3 py-2 text-left font-medium">QTY *</th>
                  <th className="px-3 py-2 text-left font-medium">AMOUNT</th>
                  <th className="px-3 py-2 text-left font-medium">GST%</th>
                  <th className="px-3 py-2 text-left font-medium">GST AMT</th>
                  <th className="px-3 py-2 text-left font-medium">TOTAL</th>
                  <th className="px-3 py-2 text-left font-medium">V SENT</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="px-3 py-2">
                    <input 
                      value={token?.item.name || ''}
                      readOnly
                      className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-50 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input 
                      value={token?.item.hsnCode || ''}
                      readOnly
                      className="w-20 px-2 py-1 border border-gray-300 rounded bg-gray-50 text-sm font-mono"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="relative">
                      <input 
                        value={form.rateOverride || token?.item.sellingPrice || ''}
                        onChange={(e) => setForm(f => ({ ...f, rateOverride: e.target.value }))}
                        className="w-20 px-2 py-1 border border-green-400 rounded text-sm font-mono font-medium"
                      />
                      <div className="text-xs text-green-600 mt-1">✓ {form.rateOverride ? 'Override' : 'Item'} Rate</div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <input 
                      value={form.netWeight}
                      readOnly
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm font-mono bg-gray-50"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-mono text-sm">₹{(preview?.taxable || 0).toFixed(2)}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-mono text-sm">{(preview?.effectiveGstPercent ?? (token?.item?.gstPercent || 0))}%</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-mono text-sm">₹{((preview?.cgst || 0) + (preview?.sgst || 0)).toFixed(2)}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-mono text-sm">₹{(preview?.total || 0).toFixed(2)}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-mono text-sm">{(preview?.net || 0).toFixed(3)}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* GST Breakdown */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">GST Breakdown</h2>
            <span className={`text-xs px-2 py-1 rounded ${
              token?.customer?.billType === 'TAX_INVOICE'
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {token?.customer?.billType === 'TAX_INVOICE'
                ? `Tax Invoice — GST ${token?.item?.gstPercent || 0}% applicable`
                : `Non-GST customer — GST not applied (Item GST: ${token?.item?.gstPercent || 0}%)`}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-4 text-center">
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xs text-muted-foreground">GST Total</div>
              <div className="font-mono font-medium">₹{((preview?.cgst || 0) + (preview?.sgst || 0)).toFixed(2)}</div>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <div className="text-xs text-muted-foreground">CGST</div>
              <div className="font-mono font-medium">₹{(preview?.cgst || 0).toFixed(2)}</div>
            </div>
            <div className="bg-purple-50 p-3 rounded">
              <div className="text-xs text-muted-foreground">SGST</div>
              <div className="font-mono font-medium">₹{(preview?.sgst || 0).toFixed(2)}</div>
            </div>
            <div className="bg-blue-50 p-3 rounded">
              <div className="text-xs text-muted-foreground">TCS {token?.customer?.tcsApplicable ? '(0.1%)' : '(N/A)'}</div>
              <div className="font-mono font-medium">₹{(preview?.tcs || 0).toFixed(2)}</div>
            </div>
            <div className="bg-amber-50 p-3 rounded">
              <div className="text-xs text-muted-foreground">Round Off</div>
              <div className="font-mono font-medium">₹{(preview?.roundOff || 0).toFixed(2)}</div>
            </div>
          </div>
          <div className="mt-4 p-4 bg-gray-100 rounded-lg">
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Grand Total:</span>
              <span className="font-mono">₹{(preview?.total || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Bill Sundries */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Bill Sundries</h2>
            <button
              type="button"
              onClick={addBillSundry}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              <Plus className="h-4 w-4" />
              Add Sundry
            </button>
          </div>

          {form.billSundries.length > 0 && (
            <div className="space-y-2">
              {form.billSundries.map((sundry, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center p-2 bg-gray-50 rounded-lg">
                  <div className="col-span-5">
                    <SearchableDropdown
                      options={availableSundries
                        .filter((s) => {
                          const alreadySelected = form.billSundries.some((row, idx) =>
                            idx !== index && row.sundryId === s.id
                          );
                          return !alreadySelected;
                        })
                        .map((s) => ({
                          label: s.name,
                          value: s.id,
                          description: s.isAddition ? '(+) Additive' : '(-) Deductive',
                        }))}
                      value={sundry.sundryId}
                      onValueChange={(value) => {
                        const selected = availableSundries.find((s) => s.id === value);
                        if (!selected) return;
                        setForm((f) => {
                          const rows = [...f.billSundries];
                          rows[index] = {
                            ...rows[index],
                            sundryId: value,
                            sundryNameSnapshot: selected.name,
                            sundryTypeSnapshot: selected.isAddition ? 'ADDITIVE' : 'DEDUCTIVE',
                            amount: 0,
                          };
                          return { ...f, billSundries: rows };
                        });
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
                        const amount = parseFloat(e.target.value) || 0;
                        setForm((f) => {
                          const rows = [...f.billSundries];
                          rows[index] = { ...rows[index], amount };
                          return { ...f, billSundries: rows };
                        });
                      }}
                      disabled={!sundry.sundryId}
                      className={`w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right font-mono focus:ring-2 focus:ring-blue-500 ${
                        !sundry.sundryId ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                      placeholder={sundry.sundryId ? '0.00' : 'Select sundry first'}
                      step="0.01"
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setForm((f) => ({
                          ...f,
                          billSundries: f.billSundries.filter((_, i) => i !== index),
                        }));
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

          {form.billSundries.length === 0 && (
            <div className="text-center py-6 text-gray-500 text-sm">
              No sundries added. Click "Add Sundry" to add charges or deductions.
            </div>
          )}

          {form.billSundries.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-300">
              <div className="flex justify-between text-sm font-medium">
                <span>Sundries Total:</span>
                <span className={`font-mono ${sundriesTotal >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {sundriesTotal >= 0 ? '+' : ''}₹{sundriesTotal.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Driver BATA */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Driver BATA</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">BATA Amount</label>
              <input
                type="number"
                value={form.driverBataAmount}
                onChange={(e) => setForm(f => ({ ...f, driverBataAmount: e.target.value }))}
                className="px-3 py-2 w-full rounded-md border border-input bg-background font-mono text-sm"
                placeholder="0"
              />
              <div className="text-xs text-muted-foreground mt-1">
                Note: This amount does NOT affect bill total. Tracked separately for cash management.
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Cr. Reference</label>
              <input
                value={form.driverBataReference}
                onChange={(e) => setForm(f => ({ ...f, driverBataReference: e.target.value }))}
                className="px-3 py-2 w-full rounded-md border border-input bg-background text-sm"
                placeholder="Reference number"
              />
            </div>
          </div>
        </div>

        {/* Payment Details */}
        <PaymentSection
          paymentMode={form.paymentMode}
          setPaymentMode={(mode) => setForm(f => ({ ...f, paymentMode: mode }))}
          receivableAmount={form.receivableAmount}
          receivedAmount={form.receivedAmount}
          setReceivedAmount={(amount) => setForm(f => ({ ...f, receivedAmount: amount }))}
          balanceAmount={form.balanceAmount}
          setBalanceAmount={(amount) => setForm(f => ({ ...f, balanceAmount: amount }))}
          
          denominations={form.denominations}
          setDenominations={(denom) => setForm(f => ({ ...f, denominations: denom }))}
          returnedDenominations={form.returnedDenominations}
          setReturnedDenominations={(denom) => setForm(f => ({ ...f, returnedDenominations: denom }))}
          cashCollected={form.cashCollected}
          setCashCollected={(amount) => setForm(f => ({ ...f, cashCollected: amount }))}
          balanceToBeGiven={form.balanceToBeGiven}
          setBalanceToBeGiven={(amount) => setForm(f => ({ ...f, balanceToBeGiven: amount }))}
          
          bankId={form.bankId}
          setBankId={(id) => setForm(f => ({ ...f, bankId: id }))}
          accountNo={form.accountNo}
          setAccountNo={(no) => setForm(f => ({ ...f, accountNo: no }))}
          transactionNo={form.transactionNo}
          setTransactionNo={(no) => setForm(f => ({ ...f, transactionNo: no }))}
          digitalPayment={form.digitalPayment}
          setDigitalPayment={(amount) => setForm(f => ({ ...f, digitalPayment: amount }))}
          banks={banks}
          
          crRefNo={form.crRefNo}
          setCrRefNo={(ref) => setForm(f => ({ ...f, crRefNo: ref }))}
        />

        {/* Remarks */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Remarks</h2>
          <textarea
            value={form.remarks}
            onChange={(e) => setForm(f => ({ ...f, remarks: e.target.value }))}
            placeholder="Enter any additional remarks..."
            className="px-3 py-2 w-full rounded-md border border-input bg-background text-sm"
            rows={4}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/operations/sales-bill')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm"
          >
            Cancel
          </button>
          
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving || !form.weightCaptured || !preview}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Creating...' : 'Save & Print'}
            </button>
            
            <button
              type="button"
              disabled={!preview}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md border border-input hover:bg-muted disabled:opacity-50 text-sm"
            >
              Preview
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SalesBill;

