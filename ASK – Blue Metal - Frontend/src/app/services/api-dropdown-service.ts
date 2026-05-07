/**
 * Mock API Service for API Dropdown
 * 
 * This file contains example mock API functions that simulate server-side
 * search and pagination for different entities in the ERP system.
 * 
 * In production, replace these with actual API calls to your backend.
 */

import { customers, items, vehicles } from '../data/mockData';
import { drivers } from '../data/drivers';
import { ApiDropdownResponse } from '../components/ui/api-dropdown';

// Simulated network delay
const simulateDelay = (ms: number = 300) => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Customer API
 */
export interface Customer {
  code: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  phone: string;
  gstNumber?: string;
  billType: string;
  isActive: boolean;
}

export async function fetchCustomers({
  search,
  page,
  pageSize,
}: {
  search: string;
  page: number;
  pageSize: number;
}): Promise<ApiDropdownResponse<Customer>> {
  // Simulate API delay
  await simulateDelay(400);

  // Filter by search query
  let filtered = customers.filter((customer) => {
    const searchLower = search.toLowerCase();
    return (
      customer.name.toLowerCase().includes(searchLower) ||
      customer.code.toLowerCase().includes(searchLower) ||
      customer.phone.includes(search) ||
      (customer.gstNumber || '').toLowerCase().includes(searchLower)
    );
  });

  // Calculate pagination
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedItems = filtered.slice(start, end);
  const hasMore = end < total;

  return {
    items: paginatedItems,
    total,
    page,
    pageSize,
    hasMore,
  };
}

/**
 * Item API
 */
export interface Item {
  code: string;
  name: string;
  itemGroup: string;
  itemSubGroup: string;
  hsnCode?: string;
  gstPercentage?: number;
  sellingPrice: number;
  unit: string;
  isActive: boolean;
}

export async function fetchItems({
  search,
  page,
  pageSize,
}: {
  search: string;
  page: number;
  pageSize: number;
}): Promise<ApiDropdownResponse<Item>> {
  await simulateDelay(350);

  let filtered = items.filter((item) => {
    const searchLower = search.toLowerCase();
    return (
      item.name.toLowerCase().includes(searchLower) ||
      item.code.toLowerCase().includes(searchLower) ||
      item.itemGroup.toLowerCase().includes(searchLower) ||
      (item.hsnCode || '').toLowerCase().includes(searchLower)
    );
  });

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedItems = filtered.slice(start, end);
  const hasMore = end < total;

  return {
    items: paginatedItems,
    total,
    page,
    pageSize,
    hasMore,
  };
}

/**
 * Driver API
 */
export interface Driver {
  id: string;
  driverCode: string;
  driverName: string;
  licenseNumber: string;
  phoneNumber: string;
  address: string;
  dateOfJoining: string;
  dateOfBirth: string;
  isActive: boolean;
}

export async function fetchDrivers({
  search,
  page,
  pageSize,
}: {
  search: string;
  page: number;
  pageSize: number;
}): Promise<ApiDropdownResponse<Driver>> {
  await simulateDelay(300);

  let filtered = drivers.filter((driver) => {
    const searchLower = search.toLowerCase();
    return (
      driver.driverName.toLowerCase().includes(searchLower) ||
      driver.driverCode.toLowerCase().includes(searchLower) ||
      driver.phoneNumber.includes(search) ||
      driver.licenseNumber.toLowerCase().includes(searchLower)
    );
  });

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedItems = filtered.slice(start, end);
  const hasMore = end < total;

  return {
    items: paginatedItems,
    total,
    page,
    pageSize,
    hasMore,
  };
}

/**
 * Vehicle API
 */
export interface Vehicle {
  id: string;
  regNo: string;
  vehicleName: string;
  workCentre: string;
  tankCapacity: number;
  emptyWeight: number;
  isActive: boolean;
}

export async function fetchVehicles({
  search,
  page,
  pageSize,
}: {
  search: string;
  page: number;
  pageSize: number;
}): Promise<ApiDropdownResponse<Vehicle>> {
  await simulateDelay(350);

  let filtered = vehicles.filter((vehicle) => {
    const searchLower = search.toLowerCase();
    return (
      vehicle.regNo.toLowerCase().includes(searchLower) ||
      vehicle.vehicleName.toLowerCase().includes(searchLower) ||
      vehicle.workCentre.toLowerCase().includes(searchLower)
    );
  });

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedItems = filtered.slice(start, end);
  const hasMore = end < total;

  return {
    items: paginatedItems,
    total,
    page,
    pageSize,
    hasMore,
  };
}

/**
 * Bank API
 */
export interface Bank {
  id: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string;
  isActive: boolean;
}

const mockBanks: Bank[] = [
  {
    id: 'BNK001',
    bankCode: 'HDFC001',
    bankName: 'HDFC Bank',
    accountNumber: '50100123456789',
    ifscCode: 'HDFC0001234',
    branch: 'Mumbai Central',
    isActive: true,
  },
  {
    id: 'BNK002',
    bankCode: 'ICICI001',
    bankName: 'ICICI Bank',
    accountNumber: '60100987654321',
    ifscCode: 'ICIC0001234',
    branch: 'Andheri',
    isActive: true,
  },
  {
    id: 'BNK003',
    bankCode: 'SBI001',
    bankName: 'State Bank of India',
    accountNumber: '30123456789012',
    ifscCode: 'SBIN0001234',
    branch: 'Fort',
    isActive: true,
  },
  {
    id: 'BNK004',
    bankCode: 'AXIS001',
    bankName: 'Axis Bank',
    accountNumber: '40123456789012',
    ifscCode: 'UTIB0001234',
    branch: 'Bandra',
    isActive: true,
  },
  {
    id: 'BNK005',
    bankCode: 'BOB001',
    bankName: 'Bank of Baroda',
    accountNumber: '70123456789012',
    ifscCode: 'BARB0001234',
    branch: 'Dadar',
    isActive: true,
  },
];

export async function fetchBanks({
  search,
  page,
  pageSize,
}: {
  search: string;
  page: number;
  pageSize: number;
}): Promise<ApiDropdownResponse<Bank>> {
  await simulateDelay(300);

  let filtered = mockBanks.filter((bank) => {
    const searchLower = search.toLowerCase();
    return (
      bank.bankName.toLowerCase().includes(searchLower) ||
      bank.bankCode.toLowerCase().includes(searchLower) ||
      bank.accountNumber.includes(search) ||
      bank.ifscCode.toLowerCase().includes(searchLower) ||
      bank.branch.toLowerCase().includes(searchLower)
    );
  });

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedItems = filtered.slice(start, end);
  const hasMore = end < total;

  return {
    items: paginatedItems,
    total,
    page,
    pageSize,
    hasMore,
  };
}

/**
 * Printer API
 */
export interface Printer {
  id: string;
  printerName: string;
  printerType: 'TOKEN' | 'BILL' | 'GATE_PASS' | 'REPORT';
  ipAddress: string;
  port: number;
  isActive: boolean;
  isDefault: boolean;
}

const mockPrinters: Printer[] = [
  {
    id: 'PRT001',
    printerName: 'Token Printer 1',
    printerType: 'TOKEN',
    ipAddress: '192.168.1.101',
    port: 9100,
    isActive: true,
    isDefault: true,
  },
  {
    id: 'PRT002',
    printerName: 'Token Printer 2',
    printerType: 'TOKEN',
    ipAddress: '192.168.1.102',
    port: 9100,
    isActive: true,
    isDefault: false,
  },
  {
    id: 'PRT003',
    printerName: 'Bill Printer 1',
    printerType: 'BILL',
    ipAddress: '192.168.1.103',
    port: 9100,
    isActive: true,
    isDefault: true,
  },
  {
    id: 'PRT004',
    printerName: 'Gate Pass Printer',
    printerType: 'GATE_PASS',
    ipAddress: '192.168.1.104',
    port: 9100,
    isActive: true,
    isDefault: true,
  },
  {
    id: 'PRT005',
    printerName: 'Bill Printer 2',
    printerType: 'BILL',
    ipAddress: '192.168.1.105',
    port: 9100,
    isActive: true,
    isDefault: false,
  },
];

export async function fetchPrinters({
  search,
  page,
  pageSize,
}: {
  search: string;
  page: number;
  pageSize: number;
}): Promise<ApiDropdownResponse<Printer>> {
  await simulateDelay(250);

  let filtered = mockPrinters.filter((printer) => {
    const searchLower = search.toLowerCase();
    return (
      printer.printerName.toLowerCase().includes(searchLower) ||
      printer.printerType.toLowerCase().includes(searchLower) ||
      printer.ipAddress.includes(search)
    );
  });

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedItems = filtered.slice(start, end);
  const hasMore = end < total;

  return {
    items: paginatedItems,
    total,
    page,
    pageSize,
    hasMore,
  };
}

/**
 * Account API (for accounting ledgers)
 */
export interface Account {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountGroup: string;
  accountType: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE' | 'EQUITY';
  openingBalance: number;
  isActive: boolean;
}

const mockAccounts: Account[] = [
  {
    accountId: 'ACC001',
    accountCode: 'AC001',
    accountName: 'Cash in Hand',
    accountGroup: 'Current Assets',
    accountType: 'ASSET',
    openingBalance: 50000,
    isActive: true,
  },
  {
    accountId: 'ACC002',
    accountCode: 'AC002',
    accountName: 'Petty Cash',
    accountGroup: 'Current Assets',
    accountType: 'ASSET',
    openingBalance: 5000,
    isActive: true,
  },
  {
    accountId: 'ACC003',
    accountCode: 'AC003',
    accountName: 'Sales Revenue',
    accountGroup: 'Direct Income',
    accountType: 'INCOME',
    openingBalance: 0,
    isActive: true,
  },
  {
    accountId: 'ACC004',
    accountCode: 'AC004',
    accountName: 'Purchase Account',
    accountGroup: 'Direct Expense',
    accountType: 'EXPENSE',
    openingBalance: 0,
    isActive: true,
  },
  {
    accountId: 'ACC005',
    accountCode: 'AC005',
    accountName: 'Salary Expense',
    accountGroup: 'Indirect Expense',
    accountType: 'EXPENSE',
    openingBalance: 0,
    isActive: true,
  },
];

export async function fetchAccounts({
  search,
  page,
  pageSize,
}: {
  search: string;
  page: number;
  pageSize: number;
}): Promise<ApiDropdownResponse<Account>> {
  await simulateDelay(350);

  let filtered = mockAccounts.filter((account) => {
    const searchLower = search.toLowerCase();
    return (
      account.accountName.toLowerCase().includes(searchLower) ||
      account.accountCode.toLowerCase().includes(searchLower) ||
      account.accountGroup.toLowerCase().includes(searchLower) ||
      account.accountType.toLowerCase().includes(searchLower)
    );
  });

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedItems = filtered.slice(start, end);
  const hasMore = end < total;

  return {
    items: paginatedItems,
    total,
    page,
    pageSize,
    hasMore,
  };
}