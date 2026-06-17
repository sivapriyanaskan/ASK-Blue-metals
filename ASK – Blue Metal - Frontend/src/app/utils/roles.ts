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
  ADMIN: 'Admin',
  WEIGHBRIDGE_OPERATOR: 'Operator',
  BILLING_STAFF: 'Billing Staff',
  SUPERVISOR: 'Supervisor',
  ACCOUNTS: 'Accounts',
};

const LABEL_PRIORITY: UserRole[] = ['Admin', 'Supervisor', 'Billing Staff', 'Accounts', 'Operator'];

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

/**
 * True when the user is a Billing Staff member without elevated roles.
 * Used to restrict report views to invoice-only columns/totals.
 */
export function isInvoiceBillingOnly(roleCodes: readonly string[] | undefined | null): boolean {
  if (!roleCodes || roleCodes.length === 0) return false;
  const elevated = ['ADMIN', 'SUPER_ADMIN', 'SUPERVISOR', 'ACCOUNTS'];
  if (roleCodes.some((c) => elevated.includes(c))) return false;
  return roleCodes.includes('BILLING_STAFF');
}
