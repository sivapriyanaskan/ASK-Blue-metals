import type { UserRole } from '../context/AppContext';

/**
 * Maps a backend role code (e.g. "WEIGHBRIDGE_OPERATOR") to the display
 * label (e.g. "Weighbridge Operator") used throughout the existing UI.
 *
 * The frontend was originally written against a fixed set of display
 * labels (Admin, Operator, Billing Staff, Supervisor, Accounts). The
 * backend stores canonical codes. This adapter keeps both worlds in sync
 * without a sweeping refactor.
 */
const ROLE_CODE_TO_LABEL: Record<string, UserRole> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  WEIGHBRIDGE_OPERATOR: 'Operator',
  BILLING_STAFF: 'Billing Staff',
  SUPERVISOR: 'Supervisor',
  ACCOUNTS: 'Accounts',
  INVOICE_BILLING: 'Invoice Billing',
};

const LABEL_PRIORITY: UserRole[] = ['Super Admin', 'Admin', 'Supervisor', 'Billing Staff', 'Accounts', 'Invoice Billing', 'Operator'];

/**
 * Role codes that should only be visible/assignable by a Super Admin.
 * Admin (non-super) must NOT see or manage these.
 */
export const SUPER_ADMIN_ONLY_ROLE_CODES = new Set<string>(['INVOICE_BILLING', 'SUPER_ADMIN']);

/** True if the currently signed-in user has Super Admin privileges. */
export function isSuperAdmin(roleCodes: readonly string[] | undefined | null): boolean {
  if (!roleCodes) return false;
  return roleCodes.includes('SUPER_ADMIN');
}

/** True if the currently signed-in user is restricted to GST tax-invoice billing only. */
export function isInvoiceBillingOnly(roleCodes: readonly string[] | undefined | null): boolean {
  if (!roleCodes || roleCodes.length === 0) return false;
  if (isSuperAdmin(roleCodes)) return false;
  return roleCodes.includes('INVOICE_BILLING');
}

/**
 * Picks the highest-priority display role from a list of backend role codes.
 * Defaults to 'Operator' if none of the codes are recognised — this keeps the
 * UI working when new roles are added on the server before the client knows
 * about them.
 */
export function pickPrimaryRole(roleCodes: readonly string[]): UserRole {
  const labels = roleCodes
    .map((code) => ROLE_CODE_TO_LABEL[code])
    .filter((l): l is UserRole => Boolean(l));
  for (const candidate of LABEL_PRIORITY) {
    if (labels.includes(candidate)) return candidate;
  }
  return labels[0] ?? 'Operator';
}

export function buildDisplayName(firstName?: string, lastName?: string, username?: string): string {
  const full = [firstName, lastName].filter(Boolean).join(' ').trim();
  return full || username || 'User';
}
