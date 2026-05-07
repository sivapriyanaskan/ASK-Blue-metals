import type { Prisma } from '@prisma/client';

/**
 * Atomic counter helper. Backed by the `Counter` table; one row per scope key.
 *
 * Use inside a `prisma.$transaction(async (tx) => …)` so the increment is
 * isolated from concurrent writers.
 */
export async function nextValue(
  tx: Prisma.TransactionClient,
  scope: string,
): Promise<number> {
  const row = await tx.counter.upsert({
    where: { scope },
    update: { value: { increment: 1 } },
    create: { scope, value: 1 },
  });
  return row.value;
}

export function dailyTokenScope(date: Date): string {
  // YYYY-MM-DD in local time — admin operates in a single timezone.
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `token:${yyyy}-${mm}-${dd}`;
}

/**
 * Indian financial year: Apr–Mar. FY2026 = 1 Apr 2026 – 31 Mar 2027.
 */
export function fyForDate(date: Date): number {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0-11
  return m >= 3 ? y : y - 1;
}

export function entryScope(date: Date, itemId: string): string {
  return `entry:${fyForDate(date)}:${itemId}`;
}

export function salesBillScope(date: Date): string {
  return `salesBill:${fyForDate(date)}`;
}

export function formatEntryNo(seq: number, date: Date): string {
  const fy = fyForDate(date);
  // last two digits of the *opening* year
  const yy = String(fy).slice(-2);
  return `${seq}/${yy}`;
}

export function formatSalesBillNo(seq: number, date: Date): string {
  const fy = fyForDate(date);
  const yy = String(fy).slice(-2);
  return `SB/${yy}/${String(seq).padStart(5, '0')}`;
}

export function formatTokenNo(seq: number): string {
  return String(seq).padStart(4, '0');
}
