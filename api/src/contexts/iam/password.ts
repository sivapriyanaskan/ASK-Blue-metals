import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

// Per security guidelines (length >= 12, mixed character classes).
const PASSWORD_MIN = 12;
const PASSWORD_MAX = 128;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export interface PasswordPolicyResult {
  valid: boolean;
  reasons: string[];
}

export function checkPasswordPolicy(plain: string): PasswordPolicyResult {
  const reasons: string[] = [];
  if (plain.length < PASSWORD_MIN) reasons.push(`Must be at least ${PASSWORD_MIN} characters`);
  if (plain.length > PASSWORD_MAX) reasons.push(`Must be at most ${PASSWORD_MAX} characters`);
  if (!/[a-z]/.test(plain)) reasons.push('Must contain a lowercase letter');
  if (!/[A-Z]/.test(plain)) reasons.push('Must contain an uppercase letter');
  if (!/[0-9]/.test(plain)) reasons.push('Must contain a digit');
  if (!/[^A-Za-z0-9]/.test(plain)) reasons.push('Must contain a symbol');
  return { valid: reasons.length === 0, reasons };
}
