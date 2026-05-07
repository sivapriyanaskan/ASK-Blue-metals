/**
 * Canonical permission catalogue.
 *
 * Format: "<context>.<resource>.<action>"
 * Actions follow the SRS list: view, create, edit, delete, print, close_shift, cancel.
 *
 * Roles are seeded from this catalogue. Add new permissions here, never inline.
 */

export const Permissions = {
  // IAM
  USER_VIEW: 'iam.user.view',
  USER_CREATE: 'iam.user.create',
  USER_EDIT: 'iam.user.edit',
  USER_DELETE: 'iam.user.delete',
  ROLE_VIEW: 'iam.role.view',
  ROLE_MANAGE: 'iam.role.manage',

  // Masters (Phase 2)
  CUSTOMER_VIEW: 'masters.customer.view',
  CUSTOMER_CREATE: 'masters.customer.create',
  CUSTOMER_EDIT: 'masters.customer.edit',
  CUSTOMER_DELETE: 'masters.customer.delete',
  SUPPLIER_VIEW: 'masters.supplier.view',
  SUPPLIER_CREATE: 'masters.supplier.create',
  SUPPLIER_EDIT: 'masters.supplier.edit',
  SUPPLIER_DELETE: 'masters.supplier.delete',
  ITEM_VIEW: 'masters.item.view',
  ITEM_CREATE: 'masters.item.create',
  ITEM_EDIT: 'masters.item.edit',
  ITEM_DELETE: 'masters.item.delete',
  ITEM_GROUP_MANAGE: 'masters.item_group.manage',
  ITEM_SUBGROUP_MANAGE: 'masters.item_subgroup.manage',
  UNIT_MANAGE: 'masters.unit.manage',
  VEHICLE_VIEW: 'masters.vehicle.view',
  VEHICLE_MANAGE: 'masters.vehicle.manage',
  DRIVER_VIEW: 'masters.driver.view',
  DRIVER_MANAGE: 'masters.driver.manage',
  WORK_CENTRE_MANAGE: 'masters.work_centre.manage',
  PRINTER_MANAGE: 'masters.printer.manage',
  BANK_MANAGE: 'masters.bank.manage',
  ACCOUNT_MANAGE: 'masters.account.manage',
  BILL_SUNDRY_MANAGE: 'masters.bill_sundry.manage',
  CUSTOMER_RATE_MANAGE: 'masters.customer_rate.manage',
  SUPPLIER_RATE_MANAGE: 'masters.supplier_rate.manage',
  CUSTOMER_FREEZE_MANAGE: 'masters.customer_freeze.manage',

  // Operations
  TOKEN_VIEW: 'operations.token.view',
  TOKEN_CREATE: 'operations.token.create',
  TOKEN_CANCEL: 'operations.token.cancel',
  ENTRY_PASS_VIEW: 'operations.entry_pass.view',
  ENTRY_PASS_CREATE: 'operations.entry_pass.create',
  SALES_BILL_VIEW: 'operations.sales_bill.view',
  SALES_BILL_CREATE: 'operations.sales_bill.create',
  SALES_BILL_EDIT: 'operations.sales_bill.edit',
  PURCHASE_BILL_VIEW: 'operations.purchase_bill.view',
  PURCHASE_BILL_CREATE: 'operations.purchase_bill.create',

  // Shift
  SHIFT_OPEN: 'shift.open',
  SHIFT_CLOSE: 'shift.close',

  // Reports
  REPORTS_VIEW: 'reports.view',

  // Audit
  AUDIT_VIEW: 'audit.view',
  DEVICE_LOG_VIEW: 'audit.device.view',
  DEVICE_LOG_WRITE: 'audit.device.write',

  // Admin: menu/feature catalogue + role access matrix
  MENU_MANAGE: 'admin.menu.manage',
  FEATURE_MANAGE: 'admin.feature.manage',
  ROLE_ACCESS_MANAGE: 'admin.role_access.manage',

  // System settings
  SYSTEM_SETTINGS_MANAGE: 'system.settings.manage',

  // Common printer settings (form -> printer mapping)
  PRINTER_SETTING_MANAGE: 'masters.printer_setting.manage',

  // Print (kept generic per SRS; refined per-resource later if needed)
  PRINT_TOKEN: 'print.token',
  PRINT_BILL: 'print.bill',
  PRINT_REPORT: 'print.report',
} as const;

export type PermissionCode = (typeof Permissions)[keyof typeof Permissions];

export const ALL_PERMISSIONS: PermissionCode[] = Object.values(Permissions);

/**
 * Default role-to-permission mapping, derived from SRS section 2.2 and 3.1.3.
 * Admin always gets every permission.
 */
export const DEFAULT_ROLES: Array<{
  code: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: PermissionCode[];
}> = [
  {
    code: 'ADMIN',
    name: 'Admin',
    description: 'Full system access',
    isSystem: true,
    permissions: ALL_PERMISSIONS,
  },
  {
    code: 'WEIGHBRIDGE_OPERATOR',
    name: 'Weighbridge Operator',
    description: 'Token creation, entry pass, cancellation',
    isSystem: true,
    permissions: [
      Permissions.TOKEN_VIEW,
      Permissions.TOKEN_CREATE,
      Permissions.TOKEN_CANCEL,
      Permissions.ENTRY_PASS_VIEW,
      Permissions.ENTRY_PASS_CREATE,
      Permissions.CUSTOMER_VIEW,
      Permissions.SUPPLIER_VIEW,
      Permissions.ITEM_VIEW,
      Permissions.VEHICLE_VIEW,
      Permissions.DRIVER_VIEW,
      Permissions.PRINT_TOKEN,
    ],
  },
  {
    code: 'BILLING_STAFF',
    name: 'Billing Staff',
    description: 'Sales/purchase billing, cash entry',
    isSystem: true,
    permissions: [
      Permissions.SALES_BILL_VIEW,
      Permissions.SALES_BILL_CREATE,
      Permissions.SALES_BILL_EDIT,
      Permissions.PURCHASE_BILL_VIEW,
      Permissions.PURCHASE_BILL_CREATE,
      Permissions.TOKEN_VIEW,
      Permissions.ENTRY_PASS_VIEW,
      Permissions.CUSTOMER_VIEW,
      Permissions.SUPPLIER_VIEW,
      Permissions.ITEM_VIEW,
      Permissions.VEHICLE_VIEW,
      Permissions.DRIVER_VIEW,
      Permissions.PRINT_BILL,
    ],
  },
  {
    code: 'SUPERVISOR',
    name: 'Supervisor',
    description: 'Override approvals, shift monitoring',
    isSystem: true,
    permissions: [
      Permissions.TOKEN_VIEW,
      Permissions.TOKEN_CANCEL,
      Permissions.SALES_BILL_VIEW,
      Permissions.SALES_BILL_EDIT,
      Permissions.PURCHASE_BILL_VIEW,
      Permissions.SHIFT_OPEN,
      Permissions.SHIFT_CLOSE,
      Permissions.REPORTS_VIEW,
      Permissions.AUDIT_VIEW,
      Permissions.CUSTOMER_VIEW,
      Permissions.SUPPLIER_VIEW,
      Permissions.ITEM_VIEW,
      Permissions.VEHICLE_VIEW,
      Permissions.DRIVER_VIEW,
      Permissions.CUSTOMER_FREEZE_MANAGE,
    ],
  },
  {
    code: 'ACCOUNTS',
    name: 'Accounts',
    description: 'Reports, ledgers, audit logs',
    isSystem: true,
    permissions: [
      Permissions.REPORTS_VIEW,
      Permissions.AUDIT_VIEW,
      Permissions.SALES_BILL_VIEW,
      Permissions.PURCHASE_BILL_VIEW,
      Permissions.CUSTOMER_VIEW,
      Permissions.SUPPLIER_VIEW,
      Permissions.ITEM_VIEW,
      Permissions.BANK_MANAGE,
      Permissions.ACCOUNT_MANAGE,
      Permissions.BILL_SUNDRY_MANAGE,
      Permissions.PRINT_REPORT,
    ],
  },
];
