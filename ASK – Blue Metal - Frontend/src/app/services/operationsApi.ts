import { api } from '../utils/api.js';
import type { PageResult } from './mastersApi.js';

/**
 * Typed REST client for /api/v1/operations/*.
 *
 * Pattern mirrors mastersApi: list → { items, page, pageSize, total }.
 * Server is the source of truth for derived numbers (entryNo, billNo,
 * netWeight, GST split). The UI sends raw inputs only.
 */

function qs(q: object | undefined): string {
  if (!q) return '';
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(q as Record<string, unknown>)) {
    if (v === undefined || v === null || v === '') continue;
    if (v instanceof Date) params.set(k, v.toISOString());
    else params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

/* ------------------------------------------------------------------ */
/* Tokens                                                              */
/* ------------------------------------------------------------------ */

export type TokenStatus = 'OPEN' | 'BILLED' | 'CANCELLED';

export interface TokenCustomerRef {
  id: string;
  code: string;
  name: string;
  billType: 'TAX_INVOICE' | 'NON_GST' | 'WEIGHT_SLIP';
  gstNumber: string | null;
  tcsApplicable: boolean;
  creditLimit: string;
  remainingBalance: string | null;
  placeOfSupply: string | null;
}

export interface TokenItemRef {
  id: string;
  code: string;
  name: string;
  sellingPrice: string;
  gstPercent: string;
  hsnCode: string | null;
}

export interface TokenBillRef {
  id: string;
  billNo: string;
  billDate: string;
  status: 'DRAFT' | 'POSTED' | 'CANCELLED';
}

export interface TokenRow {
  id: string;
  tokenNo: string;
  entryNo: string;
  tokenDateTime: string;
  vehicleNo: string;
  emptyWeight: string;
  weightCapturedAt: string | null;
  customerId: string;
  driverName: string | null;
  driverMobile: string | null;
  itemId: string;
  anprImageRef: string | null;
  anprNumberPlateText: string | null;
  loadImageRef: string | null;
  externalEntryNo: string | null;
  status: TokenStatus;
  cancelledReason: string | null;
  cancelledWeight: string | null;
  cancelledImageRef: string | null;
  cancelledTopImageRef: string | null;
  cancelledAt: string | null;
  createdById: string;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
  customer: TokenCustomerRef;
  item: TokenItemRef;
  bill: TokenBillRef | null;
}

export interface TokenInput {
  customerId: string;
  itemId: string;
  vehicleNo: string;
  emptyWeight: number;
  driverName?: string | null;
  driverMobile?: string | null;
  anprImageRef?: string | null;
  anprNumberPlateText?: string | null;
  loadImageRef?: string | null;
  externalEntryNo?: string | null;
  weightCapturedAt?: string | null;
}

export interface TokenListQuery {
  page?: number;
  pageSize?: number;
  customerId?: string;
  itemId?: string;
  status?: TokenStatus;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface TokenUpdateInput {
  vehicleNo?: string;
  driverName?: string | null;
  driverMobile?: string | null;
  itemId?: string;
  emptyWeight?: number;
  anprImageRef?: string | null;
  anprNumberPlateText?: string | null;
  loadImageRef?: string | null;
}

export const tokenApi = {
  list: async (q?: TokenListQuery): Promise<PageResult<TokenRow>> =>
    (await api.get(`/operations/tokens${qs(q)}`)).data,
  get: async (id: string): Promise<TokenRow> =>
    (await api.get(`/operations/tokens/${id}`)).data,
  create: async (input: TokenInput): Promise<TokenRow> =>
    (await api.post('/operations/tokens', input)).data,
  update: async (id: string, input: TokenUpdateInput): Promise<TokenRow> =>
    (await api.patch(`/operations/tokens/${id}`, input)).data,
  cancel: async (
    id: string,
    payload:
      | string
      | { cancelledReason: string; cancelledWeight?: number; cancelledImageRef?: string | null; cancelledTopImageRef?: string | null },
  ): Promise<TokenRow> => {
    const body = typeof payload === 'string' ? { cancelledReason: payload } : payload;
    return (await api.post(`/operations/tokens/${id}/cancel`, body)).data;
  },
};

/* ------------------------------------------------------------------ */
/* Weight slips (3rd billing type — gate-only weight reading)         */
/* ------------------------------------------------------------------ */

export interface WeightSlipRow {
  id: string;
  slipNo: string;
  capturedAt: string;
  weight: string;
  vehicleNo: string | null;
  remarks: string | null;
  createdById: string;
  createdAt: string;
}

export interface WeightSlipInput {
  weight: number;
  vehicleNo?: string | null;
  remarks?: string | null;
  capturedAt?: string;
}

export interface WeightSlipListQuery {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export const weightSlipApi = {
  list: async (q?: WeightSlipListQuery): Promise<PageResult<WeightSlipRow>> =>
    (await api.get(`/operations/weight-slips${qs(q)}`)).data,
  get: async (id: string): Promise<WeightSlipRow> =>
    (await api.get(`/operations/weight-slips/${id}`)).data,
  create: async (input: WeightSlipInput): Promise<WeightSlipRow> =>
    (await api.post('/operations/weight-slips', input)).data,
};

/* ------------------------------------------------------------------ */
/* Sales bills                                                         */
/* ------------------------------------------------------------------ */

export type SalesBillStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';
export type PaymentMode = 'CASH' | 'ONLINE' | 'CREDIT' | 'MIXED';

export interface SalesBillCustomerRef {
  id: string;
  code: string;
  name: string;
  billType: 'TAX_INVOICE' | 'NON_GST' | 'WEIGHT_SLIP';
  gstNumber: string | null;
  address: string | null;
  paymentDueDays?: number | null;
}

export interface SalesBillItemRef {
  id: string;
  code: string;
  name: string;
  hsnCode: string | null;
}

export interface SalesBillTokenRef {
  id: string;
  tokenNo: string;
  entryNo: string;
  tokenDateTime: string;
  anprImageRef: string | null;
  anprNumberPlateText: string | null;
  loadImageRef: string | null;
}

export interface SalesBillRow {
  id: string;
  billNo: string;
  billDate: string;
  tokenId: string | null;
  customerId: string;
  vehicleNo: string;
  driverName: string | null;
  driverMobile: string | null;
  itemId: string;
  emptyWeight: string;
  grossWeight: string;
  netWeight: string;
  rate: string;
  taxableAmount: string;
  cgstPercent: string;
  sgstPercent: string;
  igstPercent: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  tcsPercent: string;
  tcsAmount: string;
  roundOff: string;
  totalAmount: string;
  paymentMode: PaymentMode;
  cashAmount: string;
  onlineAmount: string;
  creditAmount: string;
  remarks: string | null;
  billTypeOverride: 'TAX_INVOICE' | 'NON_GST' | 'WEIGHT_SLIP' | null;
  confirmationReason: string | null;
  directAmount: string | null;
  placeOfSupply: string | null;
  billToAddress: string | null;
  shipToAddress: string | null;
  status: SalesBillStatus;
  cancelledReason: string | null;
  createdById: string;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
  customer: SalesBillCustomerRef;
  item: SalesBillItemRef;
  token: SalesBillTokenRef | null;
}

export interface SalesBillFromTokenInput {
  grossWeight?: number;
  directAmount?: number;
  billTypeOverride?: 'TAX_INVOICE' | 'NON_GST' | 'WEIGHT_SLIP';
  confirmationReason?: string;
  placeOfSupply?: string;
  billToAddress?: string;
  shipToAddress?: string;
  rateOverride?: number;
  cgstPercent?: number;
  sgstPercent?: number;
  igstPercent?: number;
  tcsPercent?: number;
  paymentMode?: PaymentMode;
  cashAmount?: number;
  onlineAmount?: number;
  creditAmount?: number;
  denominations?: Array<{ denomination: number; nos: number; amount: number }>;
  remarks?: string | null;
  paymentDeferralOption?: 'PAY_NOW' | 'PAY_NEXT_BILL';
  remainingBalance?: number;
}

export interface SalesBillListQuery {
  page?: number;
  pageSize?: number;
  customerId?: string;
  itemId?: string;
  status?: SalesBillStatus;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CompanyProfile {
  id: string;
  name: string;
  address: string | null;
  gstin: string | null;
  panNumber: string | null;
  msmeNumber: string | null;
  cin: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  bankName: string | null;
  accountNumber: string | null;
  ifscCode: string | null;
  upiId: string | null;
}
export const companyProfileApi = {
  get: async (): Promise<CompanyProfile> =>
    (await api.get('/system/company-profile')).data,
  update: async (input: Partial<Omit<CompanyProfile, 'id'>>): Promise<CompanyProfile> =>
    (await api.put('/system/company-profile', input)).data,
};

// Generic key-value system settings (e.g. tokens.externalEntryRequired \u2014 #14).
export interface SystemSettingRow {
  key: string;
  category: string;
  value: unknown;
  updatedAt?: string;
  updatedBy?: string | null;
}

export const systemSettingsApi = {
  get: async (key: string): Promise<SystemSettingRow | null> => {
    try {
      return (await api.get(`/system/settings/${encodeURIComponent(key)}`)).data;
    } catch (err: unknown) {
      // 404 = setting not configured \u2192 treat as null so callers can default.
      // 403 = caller lacks SYSTEM_SETTINGS_MANAGE \u2192 also treat as null so
      // non-admin pages (e.g. token cancel) can fall back to defaults silently.
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404 || status === 403) return null;
      throw err;
    }
  },
  upsert: async (
    key: string,
    body: { category: string; value: unknown },
  ): Promise<SystemSettingRow> =>
    (await api.put(`/system/settings/${encodeURIComponent(key)}`, body)).data,
};

export const salesBillApi = {
  list: async (q?: SalesBillListQuery): Promise<PageResult<SalesBillRow>> =>
    (await api.get(`/operations/sales-bills${qs(q)}`)).data,
  get: async (id: string): Promise<SalesBillRow> =>
    (await api.get(`/operations/sales-bills/${id}`)).data,
  createFromToken: async (
    tokenId: string,
    input: SalesBillFromTokenInput,
  ): Promise<SalesBillRow> =>
    (await api.post(`/operations/sales-bills/from-token/${tokenId}`, input)).data,
  cancel: async (id: string, cancelledReason: string): Promise<SalesBillRow> =>
    (await api.post(`/operations/sales-bills/${id}/cancel`, { cancelledReason })).data,
};

/* ------------------------------------------------------------------ */
/* Purchase Entry Passes                                               */
/* ------------------------------------------------------------------ */

export type PurchaseEntryStatus = 'OPEN' | 'BILLED' | 'CANCELLED';

export interface PurchaseEntryPassRow {
  id: string;
  passNo: string;
  passDateTime: string;
  vehicleNoSnapshot: string;
  driverNameSnapshot: string | null;
  driverMobile: string | null;
  supplierId: string;
  supplierNameSnapshot: string;
  workCentreId: string | null;
  itemId: string;
  itemNameSnapshot: string;
  loadWeight: string;
  crRefNo?: string | null;
  anprImageRef?: string | null;
  anprNumberPlateText?: string | null;
  loadImageRef?: string | null;
  status: PurchaseEntryStatus;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  supplier?: { id: string; code: string; name: string } | null;
  workCentre?: { id: string; code: string; name: string } | null;
  item?: { id: string; code: string; name: string } | null;
  bills?: { id: string; purchaseNo: string; status: string }[];
}

export interface PurchaseEntryPassListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  supplierId?: string;
  workCentreId?: string;
  status?: PurchaseEntryStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface PurchaseEntryPassCreateInput {
  vehicleNoSnapshot: string;
  driverNameSnapshot?: string | null;
  driverMobile?: string | null;
  supplierId: string;
  workCentreId?: string | null;
  itemId: string;
  loadWeight: number;
  crRefNo?: string | null;
  anprImageRef?: string | null;
  anprNumberPlateText?: string | null;
  loadImageRef?: string | null;
}

export const purchaseEntryPassApi = {
  create: async (input: PurchaseEntryPassCreateInput): Promise<PurchaseEntryPassRow> =>
    (await api.post('/operations/purchase-entry-passes', input)).data,
  list: async (q?: PurchaseEntryPassListQuery): Promise<PageResult<PurchaseEntryPassRow>> =>
    (await api.get(`/operations/purchase-entry-passes${qs(q)}`)).data,
  get: async (id: string): Promise<PurchaseEntryPassRow> =>
    (await api.get(`/operations/purchase-entry-passes/${id}`)).data,
  cancel: async (id: string): Promise<PurchaseEntryPassRow> =>
    (await api.post(`/operations/purchase-entry-passes/${id}/cancel`, {})).data,
};

/* ------------------------------------------------------------------ */
/* Purchase Bills                                                      */
/* ------------------------------------------------------------------ */

export type PurchaseBillStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';

export interface PurchaseBillRow {
  id: string;
  purchaseNo: string;
  purchaseDateTime: string;
  entryPassId: string | null;
  passNoSnapshot: string | null;
  vehicleNoSnapshot: string;
  supplierId: string;
  supplierNameSnapshot: string;
  workCentreId: string;
  itemId: string;
  itemNameSnapshot: string;
  loadWeight: string;
  emptyWeight: string;
  netWeight: string;
  rate: string;
  grossAmount: string;
  gstPercent: string;
  gstAmount: string;
  grossPayable: string;
  confirmationReason: string | null;
  paymentMode: string;
  anprImageRef?: string | null;
  loadImageRef?: string | null;
  driverNameSnapshot?: string | null;
  cancelledReason?: string | null;
  supplier?: {
    id: string;
    code: string;
    name: string;
    address?: string | null;
    gstNumber?: string | null;
    phone?: string | null;
  } | null;
  workCentre?: { id: string; code: string; name: string } | null;
  item?: { id: string; code: string; name: string } | null;
  entryPass?: {
    id: string;
    passNo: string;
    status: PurchaseEntryStatus;
    anprImageRef?: string | null;
    anprNumberPlateText?: string | null;
    loadImageRef?: string | null;
  } | null;
  status: PurchaseBillStatus;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseBillListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  supplierId?: string;
  workCentreId?: string;
  status?: PurchaseBillStatus;
  dateFrom?: string;
  dateTo?: string;
}

export type PurchasePaymentMode = 'CASH' | 'ONLINE' | 'CREDIT' | 'MIXED';

export interface PurchaseBillCreateInput {
  entryPassId?: string | null;
  vehicleNoSnapshot: string;
  driverNameSnapshot?: string | null;
  supplierId: string;
  workCentreId: string;
  itemId: string;
  loadWeight: number;
  emptyWeight: number;
  rate: number;
  gstPercent?: number;
  paymentMode?: PurchasePaymentMode;
  confirmationReason?: string | null;
  anprImageRef?: string | null;
  loadImageRef?: string | null;
}

export const purchaseBillApi = {
  create: async (input: PurchaseBillCreateInput): Promise<PurchaseBillRow> =>
    (await api.post('/operations/purchase-bills', input)).data,
  list: async (q?: PurchaseBillListQuery): Promise<PageResult<PurchaseBillRow>> =>
    (await api.get(`/operations/purchase-bills${qs(q)}`)).data,
  get: async (id: string): Promise<PurchaseBillRow> =>
    (await api.get(`/operations/purchase-bills/${id}`)).data,
  cancel: async (id: string): Promise<PurchaseBillRow> =>
    (await api.post(`/operations/purchase-bills/${id}/cancel`, {})).data,
};

/* ------------------------------------------------------------------ */
/* Shifts                                                              */
/* ------------------------------------------------------------------ */

export type ShiftStatus = 'OPEN' | 'CLOSED';

export interface ShiftDenomination {
  denomination: number;
  nos: number;
  amount: number;
}

export interface ShiftRow {
  id: string;
  shiftNo: string;
  shiftDate: string;
  openedAt: string;
  openedById: string;
  openedBySnapshot: string;
  openingAmount: string;
  status: ShiftStatus;
  closedAt: string | null;
  closedById: string | null;
  closedBySnapshot: string | null;
  nextShiftUserId: string | null;
  remarks: string | null;
  weightSlipTotal: string;
  invoiceTotal: string;
  billingTotal: string;
  receiptTotal: string;
  paymentTotal: string;
  purchaseTotal: string;
  totalCashReceived: string;
  netAmount: string;
  cashInHand: string;
  transferAmount: string;
  closingAmount: string;
  openingDenominations: ShiftDenomination[];
  closingDenominations: ShiftDenomination[];
  transferDenominations: ShiftDenomination[];
  /** Live aggregated denomination breakdown: opening + sales(cash) + receipts - payments. */
  liveDenominations?: ShiftDenomination[];
  createdAt: string;
  updatedAt: string;
}

export interface ShiftListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ShiftStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface ShiftCreateInput {
  shiftDate: string;
  openedBySnapshot: string;
  openingAmount?: number;
  remarks?: string | null;
  openingDenominations?: ShiftDenomination[];
}

export interface ShiftUpdateInput {
  remarks?: string | null;
  nextShiftUserId?: string | null;
  transferAmount?: number;
  closingAmount?: number;
  openingDenominations?: ShiftDenomination[];
  closingDenominations?: ShiftDenomination[];
  transferDenominations?: ShiftDenomination[];
}

export interface ShiftCloseInput {
  closedBySnapshot: string;
  transferAmount?: number;
  closingAmount?: number;
  remarks?: string | null;
  nextShiftUserId?: string | null;
  closingDenominations?: ShiftDenomination[];
  transferDenominations?: ShiftDenomination[];
}

export interface ShiftTransferDenomRow extends ShiftDenomination {
  shiftTransferDenomId: string;
  shiftId: string;
  shiftNo: string;
  shiftDate: string;
  status: ShiftStatus;
}

export const shiftApi = {
  list: async (q?: ShiftListQuery): Promise<PageResult<ShiftRow>> =>
    (await api.get(`/operations/shifts${qs(q)}`)).data,
  get: async (id: string): Promise<ShiftRow> =>
    (await api.get(`/operations/shifts/${id}`)).data,
  create: async (input: ShiftCreateInput): Promise<ShiftRow> =>
    (await api.post('/operations/shifts', input)).data,
  update: async (id: string, input: ShiftUpdateInput): Promise<ShiftRow> =>
    (await api.patch(`/operations/shifts/${id}`, input)).data,
  close: async (id: string, input: ShiftCloseInput): Promise<ShiftRow> =>
    (await api.post(`/operations/shifts/${id}/close`, input)).data,
  setTransferDenominations: async (
    id: string,
    transferDenominations: ShiftDenomination[],
    transferAmount?: number,
  ): Promise<ShiftRow> =>
    (await api.put(`/operations/shifts/${id}/transfer-denominations`, {
      transferDenominations,
      transferAmount,
    })).data,
  listTransferDenominations: async (): Promise<{ items: ShiftTransferDenomRow[]; total: number }> =>
    (await api.get('/operations/shifts/transfer-denominations')).data,
};

/* ------------------------------------------------------------------ */
/* Currency Exchange                                                   */
/* ------------------------------------------------------------------ */

export type CurrencyExchangeStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';

export interface CurrencyExchangeRow {
  id: string;
  entryNo: string;
  billDateTime: string;
  outDetails: { denomination: number; nos: number; amount: number }[];
  inDetails: { denomination: number; nos: number; amount: number }[];
  totalAmountPaid: string;
  totalAmountReceived: string;
  status: CurrencyExchangeStatus;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface CurrencyExchangeListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: CurrencyExchangeStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface CurrencyExchangeDetailInput {
  denomination: number;
  nos: number;
  amount: number;
}

export interface CurrencyExchangeCreateInput {
  billDateTime?: string;
  outDetails?: CurrencyExchangeDetailInput[];
  inDetails?: CurrencyExchangeDetailInput[];
}

export interface CurrencyExchangeUpdateInput {
  billDateTime?: string;
  outDetails?: CurrencyExchangeDetailInput[];
  inDetails?: CurrencyExchangeDetailInput[];
  status?: CurrencyExchangeStatus;
}

export const currencyExchangeApi = {
  create: async (input: CurrencyExchangeCreateInput): Promise<CurrencyExchangeRow> =>
    (await api.post('/finance/currency-exchanges', input)).data,
  update: async (id: string, input: CurrencyExchangeUpdateInput): Promise<CurrencyExchangeRow> =>
    (await api.patch(`/finance/currency-exchanges/${id}`, input)).data,
  list: async (q?: CurrencyExchangeListQuery): Promise<PageResult<CurrencyExchangeRow>> =>
    (await api.get(`/finance/currency-exchanges${qs(q)}`)).data,
  get: async (id: string): Promise<CurrencyExchangeRow> =>
    (await api.get(`/finance/currency-exchanges/${id}`)).data,
};

/* ------------------------------------------------------------------ */
/* Cash Vouchers                                                       */
/* ------------------------------------------------------------------ */

export type VoucherType = 'PAYMENT' | 'RECEIPT';
export type VoucherStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';

export interface CashVoucherRow {
  id: string;
  voucherNo: string;
  voucherType: VoucherType;
  docDate: string;
  lines: { slNo: number; accountHeadNameSnapshot: string; description: string; amount: number }[];
  totalAmount: string;
  paymentMode: string;
  bankId: string | null;
  preparedById: string;
  preparedBySnapshot: string;
  status: VoucherStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CashVoucherListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  voucherType?: VoucherType;
  status?: VoucherStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface CashVoucherLineInput {
  slNo: number;
  accountId?: string | null;
  accountHeadNameSnapshot: string;
  description?: string;
  amount: number;
}

export interface CashVoucherDenominationInput {
  denomination: number;
  nos: number;
  amount: number;
}

export interface CashVoucherCreateInput {
  voucherType: VoucherType;
  docDate: string;
  lines: CashVoucherLineInput[];
  paymentMode?: 'CASH' | 'ONLINE' | 'CREDIT' | 'MIXED';
  bankId?: string | null;
  transactionNo?: string | null;
  denominations?: CashVoucherDenominationInput[];
  preparedBySnapshot: string;
  remarks?: string | null;
}

export interface CashVoucherUpdateInput {
  docDate?: string;
  lines?: CashVoucherLineInput[];
  paymentMode?: 'CASH' | 'ONLINE' | 'CREDIT' | 'MIXED';
  bankId?: string | null;
  transactionNo?: string | null;
  denominations?: CashVoucherDenominationInput[];
  remarks?: string | null;
  status?: VoucherStatus;
  cancelledReason?: string | null;
}

export const cashVoucherApi = {
  create: async (input: CashVoucherCreateInput): Promise<CashVoucherRow> =>
    (await api.post('/finance/cash-vouchers', input)).data,
  update: async (id: string, input: CashVoucherUpdateInput): Promise<CashVoucherRow> =>
    (await api.patch(`/finance/cash-vouchers/${id}`, input)).data,
  list: async (q?: CashVoucherListQuery): Promise<PageResult<CashVoucherRow>> =>
    (await api.get(`/finance/cash-vouchers${qs(q)}`)).data,
  get: async (id: string): Promise<CashVoucherRow> =>
    (await api.get(`/finance/cash-vouchers/${id}`)).data,
};

/* ------------------------------------------------------------------ */
/* Fuel Consumptions                                                   */
/* ------------------------------------------------------------------ */

export type FuelStatus = 'SAVED' | 'POSTED' | 'CANCELLED';

export interface FuelConsumptionRow {
  id: string;
  entryNo: string;
  entryDateTime: string;
  vehicleId: string;
  vehicleRegNoSnapshot: string;
  driverId: string | null;
  driverNameSnapshot: string | null;
  workCentreId: string;
  supplierId: string;
  supplierNameSnapshot: string;
  meterStartReading: string;
  meterCurrentReading: string;
  fuelFilledQty: string;
  ratePerLiter: string;
  fuelAmount: string;
  totalExpenseAmount: string;
  paidAmount: string;
  status: FuelStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FuelConsumptionListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  vehicleId?: string;
  supplierId?: string;
  workCentreId?: string;
  status?: FuelStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface FuelExpenseInput {
  slNo: number;
  expenseHead: string;
  supplierName?: string;
  amount: number;
  paid?: number;
}

export interface FuelConsumptionCreateInput {
  entryDateTime?: string;
  vehicleId: string;
  driverId?: string | null;
  driverNameSnapshot?: string | null;
  workCentreId: string;
  supplierId: string;
  referenceNo?: string | null;
  meterStartReading: number;
  meterCurrentReading: number;
  fuelFilledQty: number;
  ratePerLiter: number;
  expenses?: FuelExpenseInput[];
  paidAmount?: number;
  remarks?: string | null;
}

export interface FuelConsumptionUpdateInput {
  entryDateTime?: string;
  vehicleId?: string;
  driverId?: string | null;
  driverNameSnapshot?: string | null;
  workCentreId?: string;
  supplierId?: string;
  referenceNo?: string | null;
  meterStartReading?: number;
  meterCurrentReading?: number;
  fuelFilledQty?: number;
  ratePerLiter?: number;
  expenses?: FuelExpenseInput[];
  paidAmount?: number;
  remarks?: string | null;
  status?: FuelStatus;
}

export const fuelConsumptionApi = {
  create: async (input: FuelConsumptionCreateInput): Promise<FuelConsumptionRow> =>
    (await api.post('/fuel/consumptions', input)).data,
  update: async (id: string, input: FuelConsumptionUpdateInput): Promise<FuelConsumptionRow> =>
    (await api.patch(`/fuel/consumptions/${id}`, input)).data,
  list: async (q?: FuelConsumptionListQuery): Promise<PageResult<FuelConsumptionRow>> =>
    (await api.get(`/fuel/consumptions${qs(q)}`)).data,
  get: async (id: string): Promise<FuelConsumptionRow> =>
    (await api.get(`/fuel/consumptions/${id}`)).data,
};

/* ------------------------------------------------------------------ */
/* Raw Material Entries                                                */
/* ------------------------------------------------------------------ */

export type RawMaterialStatus = 'SAVED' | 'POSTED' | 'CANCELLED';
export type RawMaterialSource = 'ITEM_WISE' | 'PURCHASE_WISE';

export interface RawMaterialEntryRow {
  id: string;
  entryNo: string;
  entryDateTime: string;
  itemId: string;
  itemNameSnapshot: string;
  currentStockTonn: string;
  consumedTonn: string;
  closingStockTonn: string;
  status: RawMaterialStatus;
  source: RawMaterialSource;
  remarks: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface RawMaterialEntryListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  itemId?: string;
  status?: RawMaterialStatus;
  source?: RawMaterialSource;
  dateFrom?: string;
  dateTo?: string;
}

export interface RawMaterialEntryCreateInput {
  entryDateTime?: string;
  itemId: string;
  currentStockTonn: number;
  consumedTonn: number;
  status?: RawMaterialStatus;
  source?: RawMaterialSource;
  remarks?: string | null;
}

export interface RawMaterialEntryUpdateInput {
  entryDateTime?: string;
  itemId?: string;
  currentStockTonn?: number;
  consumedTonn?: number;
  status?: RawMaterialStatus;
  remarks?: string | null;
}

export const rawMaterialEntryApi = {
  create: async (input: RawMaterialEntryCreateInput): Promise<RawMaterialEntryRow> =>
    (await api.post('/production/raw-material-entries', input)).data,
  update: async (id: string, input: RawMaterialEntryUpdateInput): Promise<RawMaterialEntryRow> =>
    (await api.patch(`/production/raw-material-entries/${id}`, input)).data,
  list: async (q?: RawMaterialEntryListQuery): Promise<PageResult<RawMaterialEntryRow>> =>
    (await api.get(`/production/raw-material-entries${qs(q)}`)).data,
  get: async (id: string): Promise<RawMaterialEntryRow> =>
    (await api.get(`/production/raw-material-entries/${id}`)).data,
};

/* ------------------------------------------------------------------ */
/* Purchase Consumption (Raw Material — Purchase Wise)                 */
/* ------------------------------------------------------------------ */

export type PurchaseConsumptionStatus = 'NEW' | 'CONSUMED' | 'IN_STOCK' | 'UNDEFINED';

export interface PurchaseConsumptionRow {
  id: string;
  purchaseBillId: string;
  itemId: string;
  quantity: string;
  status: PurchaseConsumptionStatus;
  createdByShiftId: string | null;
  updatedByShiftId: string | null;
  createdAt: string;
  updatedAt: string;
  purchaseBill: {
    id: string;
    purchaseNo: string;
    purchaseDateTime: string;
    supplierId: string;
    supplierNameSnapshot: string;
    itemId: string;
    itemNameSnapshot: string;
    netWeight: string;
    status: 'DRAFT' | 'POSTED' | 'CANCELLED';
  };
  createdByShift?: { id: string; shiftNo: string; shiftDate: string } | null;
  updatedByShift?: { id: string; shiftNo: string; shiftDate: string } | null;
}

export interface PurchaseConsumptionStats {
  shiftId: string | null;
  totalBills: number;
  totalQty: number;
  consumedQty: number;
  inStockQty: number;
  newQty: number;
  undefinedQty: number;
  consumptionRate: number;
}

export const purchaseConsumptionApi = {
  list: async (q?: {
    shiftId?: string;
    status?: PurchaseConsumptionStatus;
    search?: string;
    includePreviousUndefined?: boolean;
  }): Promise<{ items: PurchaseConsumptionRow[]; shiftId: string | null }> =>
    (await api.get(`/production/purchase-consumptions${qs(q)}`)).data,
  stats: async (shiftId?: string): Promise<PurchaseConsumptionStats> =>
    (await api.get(`/production/purchase-consumptions/stats${qs({ shiftId })}`)).data,
  blocking: async (shiftId?: string): Promise<{ count: number; shiftId: string | null }> =>
    (await api.get(`/production/purchase-consumptions/blocking${qs({ shiftId })}`)).data,
  undefinedPending: async (): Promise<{ items: PurchaseConsumptionRow[] }> =>
    (await api.get('/production/purchase-consumptions/undefined-pending')).data,
  bulkUpdate: async (
    ids: string[],
    status: Exclude<PurchaseConsumptionStatus, never>,
  ): Promise<{ count: number }> =>
    (await api.patch('/production/purchase-consumptions/bulk', { ids, status })).data,
  updateOne: async (id: string, status: PurchaseConsumptionStatus): Promise<PurchaseConsumptionRow> =>
    (await api.patch(`/production/purchase-consumptions/${id}`, { status })).data,
};

/* ------------------------------------------------------------------ */
/* Common Printer Settings                                             */
/* ------------------------------------------------------------------ */

export interface CommonPrinterSettingRow {
  id: string;
  formName: string;
  printerId: string | null;
  printerName: string | null;
  defaultCopies: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const commonPrinterSettingsApi = {
  list: async (): Promise<PageResult<CommonPrinterSettingRow>> =>
    (await api.get('/masters/common-printer-settings')).data,
  get: async (id: string): Promise<CommonPrinterSettingRow> =>
    (await api.get(`/masters/common-printer-settings/${id}`)).data,
};
