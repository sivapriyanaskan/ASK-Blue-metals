import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, Save, Loader2, Scale, Search, Plus, Trash2 } from 'lucide-react';
import { WeighbridgeDisplay } from '../components/WeighbridgeDisplay';
import { CameraCapture } from '../components/CameraCapture';
import { PaymentSection } from '../components/PaymentSection';
import { PartialPaymentModal } from '../components/PartialPaymentModal';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';
import { tokenApi, salesBillApi, systemSettingsApi, companyProfileApi, shiftApi, type TokenRow, type PaymentMode, type SalesBillFromTokenInput } from '../services/operationsApi';
import { describeError, banksApi, billSundriesApi, type BankRow, type BillSundryRow } from '../services/mastersApi';

const fmtNum = (s: string | number) => Number(s).toLocaleString(undefined, { maximumFractionDigits: 2 });
const fmtMoney = (s: string | number) =>
  Number(s).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const round2 = (n: number) => Math.round(n * 100) / 100;
const DEFAULT_HIGH_VALUE_CONFIRMATION_LIMIT = 750000;

const gstStateCode = (gstin: string | null | undefined): string | null => {
  const normalized = (gstin ?? '').trim();
  const stateCode = normalized.slice(0, 2);
  return /^\d{2}$/.test(stateCode) ? stateCode : null;
};

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:4000/api/v1';
const API_ORIGIN = new URL(API_BASE).origin;

/** Resolve a stored image ref to a viewable URL (handles relative `/uploads`). */
const resolveImageSrc = (ref: string | null | undefined): string | null => {
  if (!ref) return null;
  if (ref.startsWith('data:') || ref.startsWith('http://') || ref.startsWith('https://')) return ref;
  if (ref.startsWith('/')) return `${API_ORIGIN}${ref}`;
  return null;
};

function TokenImageTile({
  label,
  src,
  caption,
}: {
  label: string;
  src: string | null;
  caption?: string;
}) {
  return (
    <div className="border rounded-md overflow-hidden bg-gray-50">
      <div className="px-3 py-2 border-b bg-white flex items-center justify-between">
        <span className="text-xs font-medium">{label}</span>
        {caption && <span className="text-[10px] font-mono text-muted-foreground">{caption}</span>}
      </div>
      <div className="aspect-video bg-black flex items-center justify-center">
        {src ? (
          <a href={src} target="_blank" rel="noreferrer" className="w-full h-full">
            <img src={src} alt={label} className="w-full h-full object-contain" />
          </a>
        ) : (
          <span className="text-xs text-gray-400">No image captured</span>
        )}
      </div>
    </div>
  );
}

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

  // Client feedback fields
  billTypeOverride: 'TAX_INVOICE' | 'NON_GST';
  placeOfSupply: string;
  confirmationReason: string;
  paymentDeferralOption: 'PAY_NOW' | 'PAY_NEXT_BILL' | '';

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

const DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1];
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
  
  driverBataAmount: '',
  driverBataReference: '',
  billTypeOverride: 'NON_GST',
  placeOfSupply: '',
  confirmationReason: '',
  paymentDeferralOption: '',
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
  const [showTokenInfo, setShowTokenInfo] = useState(false);
  const [highValuePromptOpen, setHighValuePromptOpen] = useState(false);
  const [highValueConfirmationLimit, setHighValueConfirmationLimit] = useState(DEFAULT_HIGH_VALUE_CONFIRMATION_LIMIT);
  const [companyGstin, setCompanyGstin] = useState<string | null>(null);
  const [placeOfSupplyError, setPlaceOfSupplyError] = useState(false);

  // Token picker state (used when no tokenId in URL)
  const [openTokens, setOpenTokens] = useState<TokenRow[]>([]);
  const [tokenSearch, setTokenSearch] = useState('');
  const [banks, setBanks] = useState<BankRow[]>([]);
  const [inHandDenominations, setInHandDenominations] = useState<Record<string, number>>({});
  const [availableSundries, setAvailableSundries] = useState<BillSundryRow[]>([]);
  const weightSectionRef = useRef<HTMLDivElement | null>(null);
  const paymentSectionRef = useRef<HTMLDivElement | null>(null);
  const placeOfSupplyInputRef = useRef<HTMLInputElement | null>(null);
  const loadWeightInputRef = useRef<HTMLInputElement | null>(null);
  const rateInputRef = useRef<HTMLInputElement | null>(null);
  const driverBataInputRef = useRef<HTMLInputElement | null>(null);
  const addBillSundryButtonRef = useRef<HTMLButtonElement | null>(null);
  const saveButtonRef = useRef<HTMLButtonElement | null>(null);
  const initialEnterHandledRef = useRef(false);
  const [addingSundry, setAddingSundry] = useState(false);
  const [partialPaymentModalOpen, setPartialPaymentModalOpen] = useState(false);
  const [partialPaymentApproved, setPartialPaymentApproved] = useState(false);

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
        const defaultBillType = token.customer?.billType === 'TAX_INVOICE' ? 'TAX_INVOICE' : 'NON_GST';
        // Pre-populate form fields from token
        setForm(prevForm => ({
          ...prevForm,
          selectedTokenId: token.id,
          emptyWeight: String(token.emptyWeight || 0),
          billTypeOverride: defaultBillType,
        }));
        setError(null); // Clear any previous errors
      })
      .catch((err) => {
        console.error('Token loading error:', err);
        setError(describeError(err, 'Failed to load token'));
      })
      .finally(() => setLoading(false));
  }, [tokenId]);

  // Keep keyboard flow consistent with token screen: first Enter jumps to Place of Supply (Bill Header).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || initialEnterHandledRef.current || saving || loading) return;

      const activeTag = (document.activeElement as HTMLElement | null)?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT' || activeTag === 'BUTTON') return;

      event.preventDefault();
      window.setTimeout(() => {
        placeOfSupplyInputRef.current?.focus({ preventScroll: true });
        placeOfSupplyInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 60);

      initialEnterHandledRef.current = true;
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [loading, saving]);

  useEffect(() => {
    initialEnterHandledRef.current = false;
  }, [tokenId]);

  // Load banks data for payment section
  useEffect(() => {
    banksApi.list()
      .then((res) => setBanks(res.items))
      .catch((err) => console.error('Failed to load banks:', err));
  }, []);

  // Load the currently OPEN shift's live cash-in-hand denomination breakdown
  // so the cashier can see how many notes of each denomination are physically
  // available in the till before deciding how to give change.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await shiftApi.list({ status: 'OPEN', pageSize: 1 });
        const open = res.items[0];
        if (cancelled || !open) return;
        const live = (open.liveDenominations && open.liveDenominations.length > 0)
          ? open.liveDenominations
          : open.openingDenominations;
        const map: Record<string, number> = {};
        for (const d of live ?? []) {
          map[String(d.denomination)] = Number(d.nos) || 0;
        }
        setInHandDenominations(map);
      } catch (err) {
        console.error('Failed to load shift in-hand denominations:', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load available bill sundries (active only)
  useEffect(() => {
    billSundriesApi.list({ pageSize: 200 })
      .then((res) => setAvailableSundries(res.items.filter((s: BillSundryRow) => s.isActive !== false)))
      .catch((err) => console.error('Failed to load bill sundries:', err));
  }, []);

  useEffect(() => {
    systemSettingsApi.get('billing.highValueConfirmationLimit')
      .then((setting) => {
        const parsed = Number(setting?.value ?? DEFAULT_HIGH_VALUE_CONFIRMATION_LIMIT);
        if (Number.isFinite(parsed) && parsed >= 0) {
          setHighValueConfirmationLimit(parsed);
        }
      })
      .catch(() => setHighValueConfirmationLimit(DEFAULT_HIGH_VALUE_CONFIRMATION_LIMIT));
  }, []);

  useEffect(() => {
    companyProfileApi.get()
      .then((profile) => setCompanyGstin(profile.gstin ?? null))
      .catch(() => setCompanyGstin(null));
  }, []);

  // Live preview using item.sellingPrice unless an override is given.
  const preview = useMemo(() => {
    if (!token?.item || !token?.customer) return null;

    const emptyWeight = Number(token.emptyWeight || 0);
    const loadWeight = Number(form.loadWeight || 0);
    const effectiveBillType = form.billTypeOverride;
    const isTax = effectiveBillType === 'TAX_INVOICE';

    if (!Number.isFinite(loadWeight) || loadWeight <= emptyWeight) {
      return null;
    }

    // Entry screen always shows the FULL net weight & amount.
    // For non-GST customers the printed/stored bill is halved by the backend,
    // but the screen shows the full figures (with GST = 0).
    const netWeightKg = loadWeight - emptyWeight;
    const netWeightTons = round2(netWeightKg / 1000);

    const rate = form.rateOverride ? Number(form.rateOverride) : Number(token.item.sellingPrice || 0);
    if (!Number.isFinite(rate) || rate < 0) return null;

    const taxable = round2(netWeightTons * rate);
    const gstP = Number(token.item.gstPercent || 0);
    const effectiveGstPercent = isTax ? gstP : 0;
    const companyState = gstStateCode(companyGstin);
    const customerState = gstStateCode(token.customer.gstNumber);
    const isInterState = !!(isTax && companyState && customerState && companyState !== customerState);
    const cgst = isTax && !isInterState ? round2((taxable * gstP) / 200) : 0;
    const sgst = isTax && !isInterState ? round2((taxable * gstP) / 200) : 0;
    const igst = isTax && isInterState ? round2((taxable * gstP) / 100) : 0;
    const tcsP = token.customer.tcsApplicable ? 0.1 : 0;
    const tcs = round2(((taxable + cgst + sgst + igst) * tcsP) / 100);
    const sundriesTotal = form.billSundries.reduce((sum, s) => {
      return s.sundryTypeSnapshot === 'ADDITIVE' ? sum + Number(s.amount || 0) : sum - Number(s.amount || 0);
    }, 0);
    const subtotal = taxable + cgst + sgst + igst + tcs + sundriesTotal;
    const total = Math.round(subtotal);
    const roundOff = round2(total - subtotal);

    return {
      net: netWeightTons,
      netKg: netWeightKg,
      rate,
      taxable,
      cgst,
      sgst,
      igst,
      tcs,
      sundriesTotal,
      total,
      roundOff,
      effectiveGstPercent,
      isInterState,
      isTax,
      effectiveBillType,
    };
  }, [
    token,
    companyGstin,
    form.loadWeight,
    form.rateOverride,
    form.billSundries,
    form.billTypeOverride,
  ]);

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
      weightCaptured: weight > emptyWeight // Automatically capture when valid from hardware
    }));
    
    // Clear any weight-related errors
    if (error && error.includes('weight')) {
      setError(null);
    }
  };

  const focusAndOpenPaymentMode = () => {
    const paymentModeTrigger = document.querySelector('button.payment-mode-enter-target') as HTMLButtonElement | null;
    if (!paymentModeTrigger) return;
    paymentModeTrigger.scrollIntoView({ behavior: 'smooth', block: 'center' });
    paymentModeTrigger.focus({ preventScroll: true });
    // Open Payment Mode and wait for explicit user selection.
    paymentModeTrigger.click();
  };

  const focusAfterPaymentModeSelection = (mode: PaymentMode) => {
    window.setTimeout(() => {
      if (mode === 'CREDIT') {
        const creditRefInput = document.querySelector('input.payment-credit-ref-input') as HTMLInputElement | null;
        creditRefInput?.focus({ preventScroll: true });
        return;
      }

      if (mode === 'ONLINE') {
        const bankTrigger = document.querySelector('button.payment-bank-enter-target') as HTMLButtonElement | null;
        if (bankTrigger) {
          bankTrigger.focus({ preventScroll: true });
          bankTrigger.click();
        }
        return;
      }

      const cashInput = document.querySelector('input.payment-cash-first-input') as HTMLInputElement | null;
      cashInput?.focus({ preventScroll: true });
    }, 60);
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
    setAddingSundry(false);
  };

  const sundriesTotal = preview?.sundriesTotal ?? 0;

  const focusPaymentSection = () => {
    paymentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => {
      const paymentModeTrigger = document.querySelector('button.payment-mode-enter-target') as HTMLButtonElement | null;
      paymentModeTrigger?.focus({ preventScroll: true });
    }, 180);
  };

  const computeReceivedAmount = (receivableTotal: number) => {
    if (form.paymentMode === 'CASH') {
      return Number(form.cashCollected || 0) - Number(form.balanceToBeGiven || 0);
    }
    if (form.paymentMode === 'ONLINE') {
      return Number(form.digitalPayment || 0);
    }
    if (form.paymentMode === 'MIXED') {
      return (Number(form.cashCollected || 0) - Number(form.balanceToBeGiven || 0)) + Number(form.digitalPayment || 0);
    }
    if (form.paymentMode === 'CREDIT') {
      return receivableTotal;
    }
    return 0;
  };

  const priorCustomerBalance = Number(token?.customer?.remainingBalance || 0);
  const hasPriorPendingBalance = priorCustomerBalance > 0.01;
  const hasPriorAdvanceBalance = priorCustomerBalance < -0.01;
  const hasPriorCarryForwardBalance = Math.abs(priorCustomerBalance) > 0.01;
  const currentReceivableAmount = Number(preview?.total || 0);
  const appliedPriorBalance = hasPriorCarryForwardBalance && form.paymentDeferralOption === 'PAY_NOW'
    ? priorCustomerBalance
    : 0;
  const appliedAdvanceToCurrentBill = hasPriorAdvanceBalance && form.paymentDeferralOption === 'PAY_NOW'
    ? Math.min(currentReceivableAmount, Math.abs(priorCustomerBalance))
    : 0;
  const effectiveReceivableAmount = Math.max(0, currentReceivableAmount + appliedPriorBalance);
  const showPaymentDeferralSection = Boolean(preview && hasPriorCarryForwardBalance);

  useEffect(() => {
    if (!preview) return;
    setForm((f) => {
      if (Math.abs(Number(f.receivableAmount || 0) - effectiveReceivableAmount) < 0.01) {
        return f;
      }
      return {
        ...f,
        receivableAmount: effectiveReceivableAmount,
      };
    });
  }, [preview, effectiveReceivableAmount]);

  useEffect(() => {
    setPartialPaymentApproved(false);
  }, [
    form.paymentMode,
    form.cashCollected,
    form.balanceToBeGiven,
    form.digitalPayment,
    form.receivableAmount,
  ]);

  const validatePaymentDetails = (): string | null => {
    const receivable = Number(form.receivableAmount || 0);
    const netCash = Number(form.cashCollected || 0) - Number(form.balanceToBeGiven || 0);
    const digital = Number(form.digitalPayment || 0);

    if (receivable <= 0.01) {
      return null;
    }

    if (form.paymentMode === 'CASH') {
      if (Number(form.cashCollected || 0) <= 0) {
        return 'Please complete Payment Details. Enter cash denominations before Save & Print.';
      }
      return null;
    }

    if (form.paymentMode === 'ONLINE') {
      if (!form.bankId || !form.transactionNo.trim() || digital <= 0) {
        return 'Please complete Payment Details. Bank, transaction number, and digital payment are required.';
      }
      return null;
    }

    if (form.paymentMode === 'MIXED') {
      if (Number(form.cashCollected || 0) <= 0 && digital <= 0) {
        return 'Please complete Payment Details. Enter cash or online amount before Save & Print.';
      }
      if (digital > 0 && (!form.bankId || !form.transactionNo.trim())) {
        return 'Please complete Payment Details. Bank and transaction number are required for online amount.';
      }
      return null;
    }

    if (form.paymentMode === 'CREDIT') {
      if (!form.crRefNo.trim()) {
        return 'Please complete Payment Details. Credit Reference No is required before Save & Print.';
      }
      return null;
    }

    return 'Please complete Payment Details before Save & Print.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPlaceOfSupplyError(false);
    
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

    if (!form.placeOfSupply.trim()) {
      setError('Place of Supply is required before saving.');
      setPlaceOfSupplyError(true);
      placeOfSupplyInputRef.current?.focus({ preventScroll: true });
      placeOfSupplyInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const paymentError = validatePaymentDetails();
    if (paymentError) {
      setError(paymentError);
      focusPaymentSection();
      return;
    }
    
    const denominationsArr = Object.entries(form.denominations || {})
      .map(([denom, nos]) => ({
        denomination: Number(denom),
        nos: Number(nos) || 0,
        amount: Number(denom) * (Number(nos) || 0),
      }))
      .filter((d) => d.nos > 0);

    const previewTotal = Number(preview?.total || 0);
    if (effectiveReceivableAmount > highValueConfirmationLimit && !form.confirmationReason.trim()) {
      setHighValuePromptOpen(true);
      return;
    }

    // Calculate received amount against effective target (current bill + optional prior pending)
    const receivedAmount = computeReceivedAmount(effectiveReceivableAmount);

    const receivableAmount = effectiveReceivableAmount;
    const isPartialPayment = receivedAmount < receivableAmount - 0.01; // Account for floating point precision
    const currentBillRemaining = Math.max(0, previewTotal - appliedAdvanceToCurrentBill - receivedAmount);

    if (hasPriorCarryForwardBalance && !form.paymentDeferralOption) {
      setError('Please select either Pay Now or Pay Next Bill before saving.');
      const paymentDeferralRadios = document.querySelectorAll('input[name="paymentDeferral"]') as NodeListOf<HTMLInputElement>;
      if (paymentDeferralRadios.length > 0) {
        paymentDeferralRadios[0].focus({ preventScroll: true });
        paymentDeferralRadios[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Partial payments must be explicitly approved from the popup.
    if (isPartialPayment && !partialPaymentApproved) {
      setPartialPaymentModalOpen(true);
      return;
    }

    const netCashCollected = Math.max(0, Number(form.cashCollected || 0) - Number(form.balanceToBeGiven || 0));
    const digitalPaymentAmount = Math.max(0, Number(form.digitalPayment || 0));
    const resolvedCashAmount = form.paymentMode === 'CASH' || form.paymentMode === 'MIXED' ? netCashCollected : 0;
    const resolvedOnlineAmount = form.paymentMode === 'ONLINE' || form.paymentMode === 'MIXED' ? digitalPaymentAmount : 0;
    const resolvedCreditAmount = form.paymentMode === 'CREDIT'
      ? Number(form.creditAmount || effectiveReceivableAmount)
      : 0;
    const gstPercent = Number(token.item.gstPercent || 0);
    const companyState = gstStateCode(companyGstin);
    const customerState = gstStateCode(token.customer.gstNumber);
    const isInterStateTax =
      form.billTypeOverride === 'TAX_INVOICE' &&
      !!companyState &&
      !!customerState &&
      companyState !== customerState;

    const input: SalesBillFromTokenInput = {
      grossWeight: loadWeight,
      billTypeOverride: form.billTypeOverride || undefined,
      confirmationReason: form.confirmationReason.trim() || undefined,
      placeOfSupply: form.placeOfSupply.trim() || undefined,
      rateOverride: form.rateOverride ? Number(form.rateOverride) : undefined,
      cgstPercent: form.billTypeOverride === 'TAX_INVOICE' ? (isInterStateTax ? 0 : gstPercent / 2) : 0,
      sgstPercent: form.billTypeOverride === 'TAX_INVOICE' ? (isInterStateTax ? 0 : gstPercent / 2) : 0,
      igstPercent: form.billTypeOverride === 'TAX_INVOICE' ? (isInterStateTax ? gstPercent : 0) : 0,
      paymentMode: form.paymentMode,
      cashAmount: resolvedCashAmount,
      onlineAmount: resolvedOnlineAmount,
      creditAmount: resolvedCreditAmount,
      denominations: denominationsArr,
      remarks: form.remarks.trim() || null,
      paymentDeferralOption: hasPriorCarryForwardBalance
        ? (form.paymentDeferralOption as 'PAY_NOW' | 'PAY_NEXT_BILL' || 'PAY_NOW')
        : undefined,
      remainingBalance: isPartialPayment ? currentBillRemaining : 0,
    };

    setSaving(true);
    try {
      const created = await salesBillApi.createFromToken(tokenId, input);
      navigate(`/operations/sales-bill/${created.id}`);
    } catch (err) {
      setError(describeError(err, 'Failed to create sales bill'));
      setSaving(false);
    }
  };

  const handlePartialPaymentAllow = async () => {
    // Set the payment deferral option if not already set
    if (!form.paymentDeferralOption) {
      setForm(f => ({ ...f, paymentDeferralOption: 'PAY_NEXT_BILL' as const }));
    }
    setPartialPaymentModalOpen(false);
    setPartialPaymentApproved(true);
    // Trigger submit again
    window.setTimeout(() => {
      saveButtonRef.current?.click();
    }, 100);
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
      <div className="p-6 w-full space-y-3">
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
      <div className="p-6 w-full space-y-3">
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
    <div className="p-6 w-full space-y-6">
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

      {/* High value confirmation modal — limit is configured from Settings */}
      {highValuePromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold">High value bill confirmation</h3>
            <p className="text-sm text-muted-foreground">
              This payment amount exceeds ₹{highValueConfirmationLimit.toFixed(2)}. Please record a reason before proceeding.
            </p>
            <textarea
              autoFocus
              value={form.confirmationReason}
              onChange={(e) =>
                setForm((f) => ({ ...f, confirmationReason: e.target.value }))
              }
              rows={4}
              className="px-3 py-2 w-full rounded-md border border-input bg-white text-sm"
              placeholder="Reason / authorisation reference"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setHighValuePromptOpen(false)}
                className="px-4 py-2 text-sm rounded-md border bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!form.confirmationReason.trim()}
                onClick={() => {
                  setHighValuePromptOpen(false);
                  window.setTimeout(() => {
                    saveButtonRef.current?.click();
                  }, 0);
                }}
                className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Confirm & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Partial Payment Modal */}
      <PartialPaymentModal
        isOpen={partialPaymentModalOpen}
        remainingAmount={preview ? Math.max(0, effectiveReceivableAmount - computeReceivedAmount(effectiveReceivableAmount)) : 0}
        receivableAmount={effectiveReceivableAmount}
        onAllow={handlePartialPaymentAllow}
        onCancel={() => {
          setPartialPaymentModalOpen(false);
          setPendingPartialPaymentSubmit(false);
        }}
        isSubmitting={saving}
      />

      {/* Token Information */}
      {token && (
        <div className="bg-white border rounded-lg p-6">
          <button
            onClick={() => setShowTokenInfo(!showTokenInfo)}
            className="flex items-center gap-2 text-lg font-semibold mb-4 hover:text-blue-600 transition-colors"
          >
            <span className={`inline-block transition-transform ${showTokenInfo ? 'rotate-90' : ''}`}>
              ▶
            </span>
            Selected Token Information
          </button>
          {showTokenInfo && (
          <>
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

          {(token.anprImageRef || token.loadImageRef) && (
            <div className="mt-4">
              <div className="text-xs uppercase font-medium text-muted-foreground tracking-wider mb-2">
                Captured Images (Empty Vehicle)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TokenImageTile
                  label="Front (ANPR)"
                  src={resolveImageSrc(token.anprImageRef)}
                  caption={token.anprNumberPlateText || undefined}
                />
                <TokenImageTile label="Top (Load)" src={resolveImageSrc(token.loadImageRef)} />
              </div>
            </div>
          )}
          </>
          )}
        </div>
      )}

      {/* Hardware Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
        <div className="lg:col-span-4 min-h-[420px] flex flex-col gap-4">
          <div className="flex-1 min-h-[200px]">
            <WeighbridgeDisplay
              onWeightCapture={handleWeightCapture}
              autoCapture
              hideControls
              simulationMinWeight={Number(token?.emptyWeight || 0) + 10000}
              simulationMaxWeight={Number(token?.emptyWeight || 0) + 15000}
            />
          </div>
          <div className="flex-1 min-h-[200px]">
            <CameraCapture
              label="Top Camera"
              cameraId="top"
              onCapture={handleTopCameraCapture}
              hideControls
            />
          </div>
        </div>
        <div className="lg:col-span-8 min-h-[420px]">
          <CameraCapture
            label="Front Camera"
            cameraId="front"
            onCapture={handleFrontCameraCapture}
            hideControls
          />
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

          {/* Place of Supply — first enter field in Bill Header, before Bill Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="text-sm font-medium block mb-1">Place of Supply <span className="text-red-500">*</span></label>
              <input
                ref={placeOfSupplyInputRef}
                value={form.placeOfSupply}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  // Move to Bill Type selector on Enter
                  const billTypeSelect = document.querySelector('select[name="billType"]') as HTMLSelectElement | null;
                  if (billTypeSelect) {
                    billTypeSelect.focus({ preventScroll: true });
                    billTypeSelect.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }}
                onChange={(e) =>
                  setForm((f) => ({ ...f, placeOfSupply: e.target.value }))
                }
                onFocus={() => {
                  if (placeOfSupplyError) setPlaceOfSupplyError(false);
                }}
                className={`px-3 py-2 w-full rounded-md bg-white text-sm ${
                  placeOfSupplyError
                    ? 'border-red-500 ring-2 ring-red-200 focus:outline-none focus:ring-2 focus:ring-red-300'
                    : 'border border-input'
                }`}
                placeholder="e.g. 33-Tamil Nadu"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">
                Bill Type <span className="text-red-500">*</span>
              </label>
              <select
                name="billType"
                value={form.billTypeOverride}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  // Move to Bill Sundries Add button on Enter from Bill Type
                  addBillSundryButtonRef.current?.focus({ preventScroll: true });
                  addBillSundryButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    billTypeOverride: e.target.value as FormState['billTypeOverride'],
                  }))
                }
                className="px-3 py-2 w-full rounded-md border border-input bg-white text-sm"
              >
                <option value="TAX_INVOICE">Tax Invoice</option>
                <option value="NON_GST">Invoice</option>
              </select>
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
          </div>
        </div>

        {/* Weight Capture */}
        <div ref={weightSectionRef} className="bg-white border rounded-lg p-6">
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
                  tabIndex={-1}
                  className="px-3 py-2 flex-1 rounded-md border border-input bg-gray-50 font-mono text-sm"
                />
                <span className="ml-2 text-sm text-muted-foreground">KG</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Load Weight *</label>
              <div className="flex items-center gap-2">
                <input
                  ref={loadWeightInputRef}
                  type="number"
                  value={form.loadWeight}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    e.preventDefault();
                    rateInputRef.current?.focus({ preventScroll: true });
                  }}
                  onChange={(e) => {
                    const loadWeight = e.target.value;
                    const emptyWeight = Number(token?.emptyWeight || 0);
                    const netKg = loadWeight ? Math.max(0, Number(loadWeight) - emptyWeight) : 0;
                    const netTons = round2(netKg / 1000);
                    const isCaptured = !!loadWeight && Number(loadWeight) > emptyWeight;

                    setForm(f => ({
                      ...f,
                      loadWeight,
                      grossWeight: loadWeight,
                      netWeight: String(netTons),
                      weightCaptured: isCaptured,
                    }));
                  }}
                  placeholder="Enter gross weight"
                  className="px-3 py-2 flex-1 rounded-md border border-input bg-background font-mono text-sm"
                />
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
                  disabled
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
                      disabled
                      className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-50 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input 
                      value={token?.item.hsnCode || ''}
                      readOnly
                      disabled
                      className="w-20 px-2 py-1 border border-gray-300 rounded bg-gray-50 text-sm font-mono"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="relative">
                      <input 
                        ref={rateInputRef}
                        value={form.rateOverride || token?.item.sellingPrice || ''}
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter') return;
                          e.preventDefault();
                          e.stopPropagation();
                          driverBataInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          driverBataInputRef.current?.focus({ preventScroll: true });
                        }}
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
                      disabled
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
                    <span className="font-mono text-sm">₹{((preview?.cgst || 0) + (preview?.sgst || 0) + (preview?.igst || 0)).toFixed(2)}</span>
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
          <div className="grid grid-cols-6 gap-4 text-center">
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xs text-muted-foreground">GST Total</div>
              <div className="font-mono font-medium">₹{((preview?.cgst || 0) + (preview?.sgst || 0) + (preview?.igst || 0)).toFixed(2)}</div>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <div className="text-xs text-muted-foreground">CGST</div>
              <div className="font-mono font-medium">₹{(preview?.cgst || 0).toFixed(2)}</div>
            </div>
            <div className="bg-purple-50 p-3 rounded">
              <div className="text-xs text-muted-foreground">SGST</div>
              <div className="font-mono font-medium">₹{(preview?.sgst || 0).toFixed(2)}</div>
            </div>
            <div className="bg-indigo-50 p-3 rounded">
              <div className="text-xs text-muted-foreground">IGST</div>
              <div className="font-mono font-medium">₹{(preview?.igst || 0).toFixed(2)}</div>
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
              ref={addBillSundryButtonRef}
              type="button"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setAddingSundry(false);
                  const remarksTextarea = document.querySelector('textarea[name="remarks"]') as HTMLTextAreaElement | null;
                  remarksTextarea?.focus({ preventScroll: true });
                  remarksTextarea?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  return;
                }
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setAddingSundry(false);
                  const remarksTextarea = document.querySelector('textarea[name="remarks"]') as HTMLTextAreaElement | null;
                  remarksTextarea?.focus({ preventScroll: true });
                  remarksTextarea?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  return;
                }
                if (e.key !== 'Enter') return;
                e.preventDefault();
                if (!addingSundry) {
                  setAddingSundry(true);
                } else {
                  addBillSundry();
                }
              }}
              onClick={() => {
                if (!addingSundry) {
                  addBillSundry();
                }
              }}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                addingSundry
                  ? 'bg-blue-800 text-white'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
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
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">BATA Amount</label>
              <input
                ref={driverBataInputRef}
                type="number"
                value={form.driverBataAmount}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  e.stopPropagation();
                  driverBataInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  focusAndOpenPaymentMode();
                }}
                onChange={(e) => setForm(f => ({ ...f, driverBataAmount: e.target.value }))}
                className="px-3 py-2 w-full rounded-md border border-input bg-background font-mono text-sm"
                placeholder="0"
              />
              <div className="text-xs text-muted-foreground mt-1">
                Note: This amount does NOT affect bill total. Tracked separately for cash management.
              </div>
            </div>
          </div>
        </div>

        {/* Payment Details */}
        <div ref={paymentSectionRef}>
          <PaymentSection
            paymentMode={form.paymentMode}
            setPaymentMode={(mode) => {
              setForm(f => ({ ...f, paymentMode: mode }));
              focusAfterPaymentModeSelection(mode);
            }}
            paymentModeClassName="payment-mode-enter-target"
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
            inHandDenominations={inHandDenominations}
          />
        </div>

        {/* Remarks */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Remarks</h2>
          <textarea
            name="remarks"
            value={form.remarks}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' || e.shiftKey) return;
              e.preventDefault();
              // Move to Payment Deferral Option on Enter when deferral section is visible.
              if (showPaymentDeferralSection) {
                const paymentDeferralRadios = document.querySelectorAll('input[name="paymentDeferral"]') as NodeListOf<HTMLInputElement>;
                if (paymentDeferralRadios.length > 0) {
                  paymentDeferralRadios[0].focus({ preventScroll: true });
                  paymentDeferralRadios[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
                  return;
                }
              }
              saveButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              saveButtonRef.current?.focus({ preventScroll: true });
            }}
            onChange={(e) => setForm(f => ({ ...f, remarks: e.target.value }))}
            placeholder="Enter any additional remarks..."
            className="px-3 py-2 w-full rounded-md border border-input bg-background text-sm"
            rows={4}
          />
        </div>

        {/* Payment Deferral Option — shown when customer has carry-forward pending/advance balance */}
        {showPaymentDeferralSection && (
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Payment Deferral <span className="text-red-500">*</span></h2>
            {hasPriorPendingBalance && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-3">
                Previous pending balance: ₹{priorCustomerBalance.toFixed(2)}
              </p>
            )}
            {hasPriorAdvanceBalance && (
              <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2 mb-3">
                Advance available with customer: ₹{Math.abs(priorCustomerBalance).toFixed(2)}
              </p>
            )}
            <div className="space-y-3">
              <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="paymentDeferral"
                  value="PAY_NOW"
                  checked={form.paymentDeferralOption === 'PAY_NOW'}
                  onChange={() => {
                    setForm(f => ({ ...f, paymentDeferralOption: 'PAY_NOW' as const }));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      saveButtonRef.current?.focus({ preventScroll: true });
                      saveButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      const nextRadio = document.querySelector('input[name="paymentDeferral"][value="PAY_NEXT_BILL"]') as HTMLInputElement | null;
                      nextRadio?.focus({ preventScroll: true });
                    }
                  }}
                  className="w-4 h-4 text-blue-600 cursor-pointer"
                />
                <span className="ml-3 text-sm font-medium">
                  {hasPriorAdvanceBalance
                    ? `Adjust in this bill (Total receivable becomes ₹${effectiveReceivableAmount.toFixed(2)})`
                    : `Pay Now (Total receivable becomes ₹${effectiveReceivableAmount.toFixed(2)})`}
                </span>
              </label>
              <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="paymentDeferral"
                  value="PAY_NEXT_BILL"
                  checked={form.paymentDeferralOption === 'PAY_NEXT_BILL'}
                  onChange={() => {
                    setForm(f => ({ ...f, paymentDeferralOption: 'PAY_NEXT_BILL' as const }));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      saveButtonRef.current?.focus({ preventScroll: true });
                      saveButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      const prevRadio = document.querySelector('input[name="paymentDeferral"][value="PAY_NOW"]') as HTMLInputElement | null;
                      prevRadio?.focus({ preventScroll: true });
                    }
                  }}
                  className="w-4 h-4 text-blue-600 cursor-pointer"
                />
                <span className="ml-3 text-sm font-medium">
                  {hasPriorAdvanceBalance ? 'Carry to next bill' : 'Pay Next Bill'}
                </span>
              </label>
            </div>
          </div>
        )}

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
              ref={saveButtonRef}
              type="submit"
              disabled={saving || !form.weightCaptured || !preview}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus-visible:bg-emerald-600 focus-visible:ring-4 focus-visible:ring-emerald-200 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
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

