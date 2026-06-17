import { api } from '../utils/api.js';

/**
 * Typed REST client for /api/v1/masters/*.
 *
 * Every list endpoint returns `{ items, page, pageSize, total }`.
 * Mutations return the row (or void for delete).
 *
 * The shapes here mirror the Prisma models exposed by the backend
 * (api/src/contexts/masters/*) and the SRS field names.
 */

export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages?: number;
}

export interface ListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
}

function qs(q: Record<string, unknown> | undefined): string {
  if (!q) return '';
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === null || v === '') continue;
    params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

/* ------------------------------------------------------------------ */
/* Simple resources (factory-driven on the backend)                   */
/* ------------------------------------------------------------------ */

export interface SimpleRow {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function simpleResource<TRow extends SimpleRow, TCreate, TUpdate = Partial<TCreate>>(path: string) {
  return {
    list: async (q?: ListQuery): Promise<PageResult<TRow>> =>
      (await api.get(`/masters/${path}${qs(q)}`)).data,
    get: async (id: string): Promise<TRow> => (await api.get(`/masters/${path}/${id}`)).data,
    create: async (input: TCreate): Promise<TRow> =>
      (await api.post(`/masters/${path}`, input)).data,
    update: async (id: string, input: TUpdate): Promise<TRow> =>
      (await api.patch(`/masters/${path}/${id}`, input)).data,
    deactivate: async (id: string): Promise<void> => {
      await api.delete(`/masters/${path}/${id}`);
    },
  };
}

/* ------------------------------------------------------------------ */
/* Resource shapes                                                    */
/* ------------------------------------------------------------------ */

export interface UnitRow extends SimpleRow {}
export interface UnitInput {
  code: string;
  name: string;
  isActive?: boolean;
}

export interface ItemGroupRow extends SimpleRow {}
export interface ItemGroupInput {
  code: string;
  name: string;
  isActive?: boolean;
}

export interface ItemSubGroupRow extends SimpleRow {
  groupId: string;
}
export interface ItemSubGroupInput {
  code: string;
  name: string;
  groupId: string;
  isActive?: boolean;
}

export interface WorkCentreRow extends SimpleRow {
  address?: string | null;
}
export interface WorkCentreInput {
  code: string;
  name: string;
  address?: string | null;
  isActive?: boolean;
}

export type PrinterType = 'THERMAL' | 'A4' | 'A5';
export interface PrinterRow extends SimpleRow {
  type: PrinterType;
  connection: string;
  description?: string | null;
}
export interface PrinterInput {
  code: string;
  name: string;
  type: PrinterType;
  connection: string;
  description?: string | null;
  isActive?: boolean;
}

export interface BankRow extends SimpleRow {
  accountNumber?: string | null;
  ifsc?: string | null;
  branch?: string | null;
}
export interface BankInput {
  code: string;
  name: string;
  accountNumber?: string | null;
  ifsc?: string | null;
  branch?: string | null;
  isActive?: boolean;
}

export interface AccountRow extends SimpleRow {
  type: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE' | 'EQUITY';
  parentId?: string | null;
}
export interface AccountInput {
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE' | 'EQUITY';
  parentId?: string | null;
  isActive?: boolean;
}

export interface BillSundryRow extends SimpleRow {
  isAddition: boolean;
  affectsGst: boolean;
  description?: string | null;
}
export interface BillSundryInput {
  code: string;
  name: string;
  isAddition: boolean;
  affectsGst: boolean;
  description?: string | null;
  isActive?: boolean;
}

export interface DriverRow extends SimpleRow {
  isDriver: boolean;
  phone?: string | null;
  designation?: string | null;
}
export interface DriverInput {
  code: string;
  name: string;
  isDriver: boolean;
  phone?: string | null;
  designation?: string | null;
  isActive?: boolean;
}

export interface VehicleRow {
  id: string;
  registrationNumber: string;
  name: string;
  workCentreId?: string | null;
  tankCapacityLitres?: string | null;
  emptyWeightKg?: string | null;
  meterOpening?: string | null;
  meterMax?: string | null;
  hourOpening?: string | null;
  hourMax?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface VehicleInput {
  registrationNumber: string;
  name: string;
  workCentreId?: string | null;
  tankCapacityLitres?: number | null;
  emptyWeightKg?: number | null;
  meterOpening?: number | null;
  meterMax?: number | null;
  hourOpening?: number | null;
  hourMax?: number | null;
  isActive?: boolean;
}

/* ------------------------------------------------------------------ */
/* Customer / Supplier / Item have richer shapes                      */
/* ------------------------------------------------------------------ */

export interface CustomerVehicleRow {
  id: string;
  vehicleNumber: string;
  driverName?: string | null;
  driverPhone?: string | null;
  isActive: boolean;
}
export interface CustomerVehicleInput {
  vehicleNumber: string;
  driverName?: string;
  driverPhone?: string;
}
export interface CustomerRow extends SimpleRow {
  address?: string | null;
  billType: 'TAX_INVOICE' | 'NON_GST';
  gstNumber?: string | null;
  tcsApplicable: boolean;
  creditLimit: string;
  termsOfDelivery?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  vehicles?: CustomerVehicleRow[];
}
export interface CustomerInput {
  code: string;
  name: string;
  address?: string | null;
  billType: 'TAX_INVOICE' | 'NON_GST';
  gstNumber?: string | null;
  tcsApplicable?: boolean;
  creditLimit?: number;
  termsOfDelivery?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  vehicles?: CustomerVehicleInput[];
  isActive?: boolean;
}

export interface SupplierVehicleRow {
  id: string;
  vehicleNumber: string;
  driverName?: string | null;
  driverPhone?: string | null;
  isActive: boolean;
}
export interface SupplierVehicleInput {
  vehicleNumber: string;
  driverName?: string;
  driverPhone?: string;
}
export interface SupplierRow extends SimpleRow {
  address?: string | null;
  controlAccountId?: string | null;
  supplierType: 'TON_BASED' | 'REPAIR_MAINTENANCE';
  gstNumber?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  vehicles?: SupplierVehicleRow[];
}
export interface SupplierInput {
  code: string;
  name: string;
  address?: string | null;
  controlAccountId?: string | null;
  supplierType: 'TON_BASED' | 'REPAIR_MAINTENANCE';
  gstNumber?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  vehicles?: SupplierVehicleInput[];
  isActive?: boolean;
}

export interface ItemRow extends SimpleRow {
  groupId: string;
  subGroupId: string;
  purchaseUnitId: string;
  sellingUnitId: string;
  hsnCode?: string | null;
  isRawMaterial: boolean;
  isSaleMaterial: boolean;
  sellingPrice: string;
  gstPercent: string;
  defaultPrinterId?: string | null;
  group?: { code: string; name: string };
  subGroup?: { code: string; name: string };
  purchaseUnit?: { code: string; name: string };
  sellingUnit?: { code: string; name: string };
  defaultPrinter?: { code: string; name: string; type: string };
}
export interface ItemInput {
  code: string;
  name: string;
  groupId: string;
  subGroupId: string;
  purchaseUnitId: string;
  sellingUnitId: string;
  hsnCode?: string | null;
  isRawMaterial: boolean;
  isSaleMaterial: boolean;
  sellingPrice: number;
  gstPercent: number;
  defaultPrinterId?: string | null;
  isActive?: boolean;
}

/* ------------------------------------------------------------------ */
/* Resource clients                                                   */
/* ------------------------------------------------------------------ */

export const unitsApi = simpleResource<UnitRow, UnitInput>('units');
export const itemGroupsApi = simpleResource<ItemGroupRow, ItemGroupInput>('item-groups');
export const itemSubGroupsApi = simpleResource<ItemSubGroupRow, ItemSubGroupInput>('item-sub-groups');
export const workCentresApi = simpleResource<WorkCentreRow, WorkCentreInput>('work-centres');
export const printersApi = simpleResource<PrinterRow, PrinterInput>('printers');
export const banksApi = simpleResource<BankRow, BankInput>('banks');
export const accountsApi = simpleResource<AccountRow, AccountInput>('accounts');
export const billSundriesApi = simpleResource<BillSundryRow, BillSundryInput>('bill-sundries');
export const driversApi = simpleResource<DriverRow, DriverInput>('drivers');
// Vehicles do not extend SimpleRow (registrationNumber instead of code)
export const vehiclesApi = {
  list: async (q?: ListQuery): Promise<PageResult<VehicleRow>> =>
    (await api.get(`/masters/vehicles${qs(q)}`)).data,
  get: async (id: string): Promise<VehicleRow> =>
    (await api.get(`/masters/vehicles/${id}`)).data,
  create: async (input: VehicleInput): Promise<VehicleRow> =>
    (await api.post('/masters/vehicles', input)).data,
  update: async (id: string, input: Partial<VehicleInput>): Promise<VehicleRow> =>
    (await api.patch(`/masters/vehicles/${id}`, input)).data,
  deactivate: async (id: string): Promise<void> => {
    await api.delete(`/masters/vehicles/${id}`);
  },
};
export const customersApi = simpleResource<CustomerRow, CustomerInput>('customers');
export const suppliersApi = simpleResource<SupplierRow, SupplierInput>('suppliers');
export const itemsApi = simpleResource<ItemRow, ItemInput>('items');

/* ------------------------------------------------------------------ */
/* Customer-wise item rates                                           */
/* ------------------------------------------------------------------ */

export interface CustomerRateRow {
  id: string;
  customerId: string;
  itemId: string;
  rate: number;
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; code: string; name: string };
  item?: { id: string; code: string; name: string };
}
export interface CustomerRateInput {
  customerId: string;
  itemId: string;
  rate: number;
  validFrom?: string | null;
  validTo?: string | null;
  isActive?: boolean;
}
export interface CustomerRateUpdate {
  rate?: number;
  validFrom?: string | null;
  validTo?: string | null;
  isActive?: boolean;
}
export interface CustomerRateListQuery {
  customerId?: string;
  itemId?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export const customerRatesApi = {
  async list(q?: CustomerRateListQuery): Promise<PageResult<CustomerRateRow>> {
    const { data } = await api.get(`/masters/customer-rates${qs(q)}`);
    return data;
  },
  async create(input: CustomerRateInput): Promise<CustomerRateRow> {
    const { data } = await api.post('/masters/customer-rates', input);
    return data;
  },
  async update(id: string, input: CustomerRateUpdate): Promise<CustomerRateRow> {
    const { data } = await api.patch(`/masters/customer-rates/${id}`, input);
    return data;
  },
  async deactivate(id: string): Promise<void> {
    await api.delete(`/masters/customer-rates/${id}`);
  },
};

/* ------------------------------------------------------------------ */
/* Supplier-wise item rates                                           */
/* ------------------------------------------------------------------ */

export interface SupplierRateRow {
  id: string;
  supplierId: string;
  itemId: string;
  rate: number;
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  supplier?: { id: string; code: string; name: string };
  item?: { id: string; code: string; name: string };
}
export interface SupplierRateInput {
  supplierId: string;
  itemId: string;
  rate: number;
  validFrom?: string | null;
  validTo?: string | null;
  isActive?: boolean;
}
export interface SupplierRateUpdate {
  rate?: number;
  validFrom?: string | null;
  validTo?: string | null;
  isActive?: boolean;
}
export interface SupplierRateListQuery {
  supplierId?: string;
  itemId?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export const supplierRatesApi = {
  async list(q?: SupplierRateListQuery): Promise<PageResult<SupplierRateRow>> {
    const { data } = await api.get(`/masters/supplier-rates${qs(q)}`);
    return data;
  },
  async create(input: SupplierRateInput): Promise<SupplierRateRow> {
    const { data } = await api.post('/masters/supplier-rates', input);
    return data;
  },
  async update(id: string, input: SupplierRateUpdate): Promise<SupplierRateRow> {
    const { data } = await api.patch(`/masters/supplier-rates/${id}`, input);
    return data;
  },
  async deactivate(id: string): Promise<void> {
    await api.delete(`/masters/supplier-rates/${id}`);
  },
};

/* ------------------------------------------------------------------ */
/* Customer freeze (item-to-customer)                                 */
/* ------------------------------------------------------------------ */

export interface CustomerFreezeRow {
  id: string;
  customerId: string;
  itemId: string | null;
  validFrom: string;
  validTo: string;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; code: string; name: string };
  item?: { id: string; code: string; name: string } | null;
}
export interface CustomerFreezeInput {
  customerId: string;
  itemId?: string | null;
  validFrom: string;
  validTo: string;
  reason?: string;
}
export interface CustomerFreezeListQuery {
  customerId?: string;
  itemId?: string;
  on?: string;
  page?: number;
  pageSize?: number;
}

export const customerFreezesApi = {
  async list(q?: CustomerFreezeListQuery): Promise<PageResult<CustomerFreezeRow>> {
    const { data } = await api.get(`/masters/customer-freezes${qs(q)}`);
    return data;
  },
  async create(input: CustomerFreezeInput): Promise<CustomerFreezeRow> {
    const { data } = await api.post('/masters/customer-freezes', input);
    return data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/masters/customer-freezes/${id}`);
  },
};

/* ------------------------------------------------------------------ */
/* Helper: extract a friendly error message from axios failures.      */
/* ------------------------------------------------------------------ */
import type { AxiosError } from 'axios';

interface ApiDetail { path?: string; message?: string }

export function describeError(err: unknown, fallback = 'Operation failed'): string {
  const e = err as AxiosError<{ error?: { code?: string; message?: string; details?: ApiDetail[] } }>;
  const details = e.response?.data?.error?.details;
  if (Array.isArray(details) && details.length > 0) {
    // Surface every field-level validation message, e.g. "gstNumber: Invalid GSTIN"
    return details
      .map((d) => (d.path ? `${d.path}: ${d.message ?? 'invalid'}` : (d.message ?? 'invalid')))
      .join(' | ');
  }
  const apiMsg = e.response?.data?.error?.message;
  if (apiMsg) return apiMsg;
  if (e.message) return e.message;
  return fallback;
}
