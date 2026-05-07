/**
 * Default UI menu catalogue. Mirrors the navigation sidebar so the
 * Role-Menu Access screen can configure permissions per menu.
 *
 * `parentCode` of `null` indicates a top-level menu.
 */
export interface MenuSeed {
  code: string;
  name: string;
  parentCode: string | null;
  sortOrder: number;
}

export const DEFAULT_MENUS: MenuSeed[] = [
  // Top-level
  { code: 'DASHBOARD', name: 'Dashboard', parentCode: null, sortOrder: 10 },
  { code: 'OPERATIONS', name: 'Operations', parentCode: null, sortOrder: 20 },
  { code: 'MASTERS', name: 'Masters', parentCode: null, sortOrder: 30 },
  { code: 'PRODUCTION', name: 'Production', parentCode: null, sortOrder: 35 },
  { code: 'FINANCE', name: 'Finance', parentCode: null, sortOrder: 40 },
  { code: 'SHIFT_MANAGEMENT', name: 'Shift Management', parentCode: null, sortOrder: 50 },
  { code: 'REPORTS', name: 'Reports', parentCode: null, sortOrder: 60 },
  { code: 'ADMIN_AUDIT', name: 'Admin & Audit', parentCode: null, sortOrder: 70 },
  { code: 'SETTINGS', name: 'Settings', parentCode: null, sortOrder: 80 },

  // Operations children
  { code: 'TOKEN_CREATE', name: 'Token Creation', parentCode: 'OPERATIONS', sortOrder: 10 },
  { code: 'PURCHASE_ENTRY', name: 'Purchase Entry Pass', parentCode: 'OPERATIONS', sortOrder: 20 },
  { code: 'SALES_BILL', name: 'Sales Bill', parentCode: 'OPERATIONS', sortOrder: 30 },
  { code: 'PURCHASE_BILL', name: 'Purchase Bill', parentCode: 'OPERATIONS', sortOrder: 40 },
  { code: 'TOKEN_CANCEL', name: 'Token Cancel', parentCode: 'OPERATIONS', sortOrder: 50 },

  // Masters children
  { code: 'CUSTOMER_MASTER', name: 'Customer Master', parentCode: 'MASTERS', sortOrder: 10 },
  { code: 'SUPPLIER_MASTER', name: 'Supplier Master', parentCode: 'MASTERS', sortOrder: 20 },
  { code: 'ITEM_MASTER', name: 'Item Master', parentCode: 'MASTERS', sortOrder: 30 },
  { code: 'ITEM_GROUP_MASTER', name: 'Item Group Master', parentCode: 'MASTERS', sortOrder: 35 },
  { code: 'ITEM_SUB_GROUP_MASTER', name: 'Item Sub Group Master', parentCode: 'MASTERS', sortOrder: 36 },
  { code: 'CUSTOMER_WISE_ITEM_RATES', name: 'Customer-Wise Item Rates', parentCode: 'MASTERS', sortOrder: 37 },
  { code: 'SUPPLIER_RATE_SETTING', name: 'Supplier Rate Setting', parentCode: 'MASTERS', sortOrder: 38 },
  { code: 'FREEZE_ITEM_TO_CUSTOMER', name: 'Freeze Item to Customer', parentCode: 'MASTERS', sortOrder: 39 },
  { code: 'VEHICLE_MASTER', name: 'Vehicle Master', parentCode: 'MASTERS', sortOrder: 40 },
  { code: 'WORK_CENTRE_MASTER', name: 'Work Centre Master', parentCode: 'MASTERS', sortOrder: 50 },
  { code: 'DRIVER_LABOUR_MASTER', name: 'Driver / Labour Master', parentCode: 'MASTERS', sortOrder: 60 },
  { code: 'BILL_SUNDRY_MASTER', name: 'Bill Sundry Master', parentCode: 'MASTERS', sortOrder: 70 },
  { code: 'ACCOUNT_MASTER', name: 'Account Master', parentCode: 'MASTERS', sortOrder: 80 },
  { code: 'BANK_MASTER', name: 'Bank Master', parentCode: 'MASTERS', sortOrder: 90 },
  { code: 'PRINTER_MASTER', name: 'Printer Master', parentCode: 'MASTERS', sortOrder: 100 },
  { code: 'PRINTER_SETTINGS', name: 'Printer Settings', parentCode: 'MASTERS', sortOrder: 110 },

  // Production children
  { code: 'RAW_MATERIAL_PURCHASE_WISE', name: 'Raw Material - Purchase Wise', parentCode: 'PRODUCTION', sortOrder: 10 },
  { code: 'RAW_MATERIAL_ITEM_WISE', name: 'Raw Material - Item Wise', parentCode: 'PRODUCTION', sortOrder: 20 },

  // Finance children
  { code: 'CURRENCY_EXCHANGE', name: 'Currency Exchange', parentCode: 'FINANCE', sortOrder: 10 },
  { code: 'CASH_VOUCHER_PAYMENT', name: 'Cash Voucher Payment', parentCode: 'FINANCE', sortOrder: 20 },
  { code: 'FUEL_CONSUMPTION', name: 'Fuel Consumption', parentCode: 'FINANCE', sortOrder: 30 },

  // Shift Management children
  { code: 'SHIFT_OPEN', name: 'Shift Open', parentCode: 'SHIFT_MANAGEMENT', sortOrder: 10 },
  { code: 'SHIFT_CLOSE', name: 'Shift Close', parentCode: 'SHIFT_MANAGEMENT', sortOrder: 20 },

  // Reports children
  { code: 'SALES_REGISTER', name: 'Sales Register', parentCode: 'REPORTS', sortOrder: 10 },
  { code: 'SALES_WITH_GST_FULL_QTY', name: 'Sales With GST – Full Qty', parentCode: 'REPORTS', sortOrder: 15 },
  { code: 'SALES_WITHOUT_GST_FULL_QTY', name: 'Sales Without GST – Full Qty', parentCode: 'REPORTS', sortOrder: 16 },
  { code: 'SALES_WITHOUT_GST_HALF_QTY', name: 'Sales Without GST – Half Qty', parentCode: 'REPORTS', sortOrder: 17 },
  { code: 'SALES_GST_COMBINED', name: 'Sales GST Combined', parentCode: 'REPORTS', sortOrder: 18 },
  { code: 'SALES_CUSTOMER_WISE', name: 'Sales Customer Wise', parentCode: 'REPORTS', sortOrder: 19 },
  { code: 'PURCHASE_REGISTER', name: 'Purchase Register', parentCode: 'REPORTS', sortOrder: 20 },
  { code: 'PURCHASE_ITEM_WISE', name: 'Purchase Item Wise', parentCode: 'REPORTS', sortOrder: 25 },
  { code: 'PURCHASE_SUPPLIER_WISE', name: 'Purchase Supplier Wise', parentCode: 'REPORTS', sortOrder: 26 },
  { code: 'PURCHASE_BILL_WISE', name: 'Purchase Bill Wise', parentCode: 'REPORTS', sortOrder: 27 },
  { code: 'PRODUCTION_REGISTER', name: 'Production Register', parentCode: 'REPORTS', sortOrder: 30 },
  { code: 'PRODUCTION_ITEM_WISE', name: 'Production Item Wise', parentCode: 'REPORTS', sortOrder: 35 },
  { code: 'PRODUCTION_PURCHASE_WISE', name: 'Production Purchase Wise', parentCode: 'REPORTS', sortOrder: 36 },
  { code: 'FUEL_REGISTER', name: 'Fuel Register', parentCode: 'REPORTS', sortOrder: 40 },
  { code: 'SHIFT_CLOSING_REPORT', name: 'Shift Closing Report', parentCode: 'REPORTS', sortOrder: 50 },
  { code: 'CUSTOMER_LEDGER', name: 'Customer Ledger', parentCode: 'REPORTS', sortOrder: 60 },
  { code: 'SUPPLIER_LEDGER', name: 'Supplier Ledger', parentCode: 'REPORTS', sortOrder: 70 },
  { code: 'ITEM_STOCK_REPORT', name: 'Item Stock Report', parentCode: 'REPORTS', sortOrder: 80 },
  { code: 'VEHICLE_HISTORY', name: 'Vehicle History', parentCode: 'REPORTS', sortOrder: 90 },
  { code: 'DRIVER_BATA_REPORT', name: 'Driver BATA Report', parentCode: 'REPORTS', sortOrder: 100 },
  { code: 'EDIT_LOG_REPORT', name: 'Edit Log Report', parentCode: 'REPORTS', sortOrder: 110 },

  // Admin & Audit children
  { code: 'AUDIT_LOGS', name: 'Audit Logs', parentCode: 'ADMIN_AUDIT', sortOrder: 10 },
  { code: 'USER_MANAGEMENT', name: 'User Management', parentCode: 'ADMIN_AUDIT', sortOrder: 20 },
  { code: 'ROLE_MANAGEMENT', name: 'Role Management', parentCode: 'ADMIN_AUDIT', sortOrder: 30 },
];

/**
 * Default UI feature catalogue. Mirrors fine-grained capabilities surfaced on
 * the Role-Feature Access screen. Each feature is a single boolean per role.
 */
export interface FeatureSeed {
  code: string;
  name: string;
  moduleName: string;
}

export const DEFAULT_FEATURES: FeatureSeed[] = [
  // Operations
  { code: 'TOKEN_CREATE', name: 'Token Creation', moduleName: 'Operations' },
  { code: 'PURCHASE_ENTRY', name: 'Purchase Entry Pass', moduleName: 'Operations' },
  { code: 'SALES_BILL', name: 'Sales Bill', moduleName: 'Operations' },
  { code: 'PURCHASE_BILL', name: 'Purchase Bill', moduleName: 'Operations' },
  { code: 'TOKEN_CANCEL', name: 'Token Cancel', moduleName: 'Operations' },
  { code: 'ANPR_PROCESS', name: 'ANPR Processing', moduleName: 'Operations' },

  // Masters
  { code: 'CUSTOMER_MASTER', name: 'Customer Master', moduleName: 'Masters' },
  { code: 'SUPPLIER_MASTER', name: 'Supplier Master', moduleName: 'Masters' },
  { code: 'ITEM_MASTER', name: 'Item Master', moduleName: 'Masters' },
  { code: 'VEHICLE_MASTER', name: 'Vehicle Master', moduleName: 'Masters' },
  { code: 'DRIVER_MASTER', name: 'Driver Master', moduleName: 'Masters' },

  // Finance
  { code: 'CURRENCY_EXCHANGE', name: 'Currency Exchange', moduleName: 'Finance' },
  { code: 'CASH_VOUCHER', name: 'Cash Voucher Payment', moduleName: 'Finance' },
  { code: 'FUEL_CONSUMPTION', name: 'Fuel Consumption', moduleName: 'Finance' },
  { code: 'LEDGER_VIEW', name: 'Ledger View', moduleName: 'Finance' },
  { code: 'GST_REPORTS', name: 'GST Reports', moduleName: 'Finance' },

  // Shift Management
  { code: 'SHIFT_OPEN', name: 'Shift Open', moduleName: 'Shift Management' },
  { code: 'SHIFT_CLOSE', name: 'Shift Close', moduleName: 'Shift Management' },
  { code: 'DENOMINATION_VERIFY', name: 'Denomination Verification', moduleName: 'Shift Management' },

  // Reports
  { code: 'SALES_REGISTER', name: 'Sales Register', moduleName: 'Reports' },
  { code: 'PURCHASE_REGISTER', name: 'Purchase Register', moduleName: 'Reports' },
  { code: 'CUSTOMER_LEDGER', name: 'Customer Ledger', moduleName: 'Reports' },
  { code: 'STOCK_REPORT', name: 'Stock Report', moduleName: 'Reports' },
  { code: 'WEIGHBRIDGE_REPORT', name: 'Weighbridge Report', moduleName: 'Reports' },

  // Admin & Audit
  { code: 'AUDIT_LOGS', name: 'Audit Logs', moduleName: 'Admin & Audit' },
  { code: 'DEVICE_LOGS', name: 'Device Event Logs', moduleName: 'Admin & Audit' },
  { code: 'EDIT_LOGS', name: 'Edit Log Report', moduleName: 'Admin & Audit' },
  { code: 'USER_MGMT', name: 'User Management', moduleName: 'Admin & Audit' },
  { code: 'MENU_MASTER', name: 'Menu Master', moduleName: 'Admin & Audit' },
  { code: 'FEATURE_MASTER', name: 'Feature Master', moduleName: 'Admin & Audit' },
  { code: 'ROLES_MASTER', name: 'Roles Master', moduleName: 'Admin & Audit' },
  { code: 'ROLE_MENU_ACCESS', name: 'Role-Menu Access', moduleName: 'Admin & Audit' },
  { code: 'ROLE_FEATURE_ACCESS', name: 'Role-Feature Access', moduleName: 'Admin & Audit' },

  // Settings
  { code: 'COMPANY_SETTINGS', name: 'Company Settings', moduleName: 'Settings' },
  { code: 'BILL_SUNDRY', name: 'Bill Sundry Master', moduleName: 'Settings' },
  { code: 'BOOM_BARRIER', name: 'Boom Barrier Control', moduleName: 'Settings' },
];
