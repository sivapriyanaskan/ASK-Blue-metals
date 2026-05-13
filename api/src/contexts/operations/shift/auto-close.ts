import { Prisma } from '@prisma/client';
import { prisma } from '../../../infra/db.js';
import { logger } from '../../../infra/logger.js';
import { auditService } from '../../audit/audit.service.js';

/**
 * Midnight shift auto-close.
 *
 * At 00:00 IST every day:
 *   1. Any NEW purchase-consumption rows tied to an open shift are marked
 *      UNDEFINED so the shift can close (the operator can re-classify them
 *      next day from Raw Material → Purchase Wise).
 *   2. Every OPEN shift is force-closed by SYSTEM, preserving the live
 *      cash/closing amount as-is.
 *   3. All active refresh tokens of the shift opener are revoked, so the
 *      logged-in user is signed out shortly after midnight.
 */

const SYSTEM_ACTOR = {
  actorId: 'system',
  actorName: 'System (Auto-close)',
};

export async function runMidnightShiftClose(): Promise<{
  closedShifts: number;
  undefinedPurchases: number;
  revokedTokens: number;
}> {
  const startedAt = new Date();
  const openShifts = await prisma.shift.findMany({
    where: { status: 'OPEN' },
    select: { id: true, shiftNo: true, openedById: true, openedAt: true },
  });

  if (openShifts.length === 0) {
    logger.info('[shift-auto-close] No open shifts found at midnight');
    return { closedShifts: 0, undefinedPurchases: 0, revokedTokens: 0 };
  }

  let undefinedPurchases = 0;
  let revokedTokens = 0;
  let closedShifts = 0;

  for (const shift of openShifts) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Carry pending purchases forward: NEW → UNDEFINED.
        const updated = await tx.purchaseConsumption.updateMany({
          where: { createdByShiftId: shift.id, status: 'NEW' },
          data: { status: 'UNDEFINED', updatedByShiftId: shift.id },
        });

        // Snapshot live totals via the same logic the GET endpoint uses, but
        // we keep it minimal here — closingAmount stays at its current value
        // (or 0 if never set). Operators reconcile next morning.
        const current = await tx.shift.findUnique({ where: { id: shift.id } });
        if (!current) return { pUpdated: updated.count, closed: false };
        if (current.status !== 'OPEN') return { pUpdated: updated.count, closed: false };

        await tx.shift.update({
          where: { id: shift.id },
          data: {
            status: 'CLOSED',
            closedAt: startedAt,
            closedById: 'system',
            closedBySnapshot: SYSTEM_ACTOR.actorName,
            remarks: appendRemark(
              current.remarks,
              `Auto-closed by system at midnight on ${startedAt.toISOString()}.`,
            ),
          },
        });

        return { pUpdated: updated.count, closed: true };
      });

      undefinedPurchases += result.pUpdated;
      if (result.closed) {
        closedShifts += 1;
        await auditService.record({
          ...SYSTEM_ACTOR,
          action: 'CLOSE',
          resource: 'Shift',
          resourceId: shift.id,
          changes: {
            reason: 'midnight-auto-close',
            undefinedPurchases: result.pUpdated,
          },
        });
      }

      // Force-logout the opener (and anyone sharing the account) by revoking
      // every active refresh token. Short-lived access tokens will expire
      // within minutes, and the frontend also polls shift status and signs
      // out as soon as it detects no open shift.
      if (shift.openedById && shift.openedById !== 'system') {
        const revoke = await prisma.refreshToken.updateMany({
          where: { userId: shift.openedById, revokedAt: null },
          data: { revokedAt: startedAt },
        });
        revokedTokens += revoke.count;
      }
    } catch (err) {
      logger.error(
        { err, shiftId: shift.id, shiftNo: shift.shiftNo },
        '[shift-auto-close] Failed to close shift',
      );
    }
  }

  logger.info(
    { closedShifts, undefinedPurchases, revokedTokens },
    '[shift-auto-close] Midnight run complete',
  );
  return { closedShifts, undefinedPurchases, revokedTokens };
}

function appendRemark(existing: string | null, line: string): string {
  if (!existing || existing.trim() === '') return line;
  return `${existing}\n${line}`;
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

const IST_OFFSET_MIN = 330; // +05:30

/** Milliseconds until the next IST midnight (00:00:05 to avoid edge-cases). */
function msUntilNextIstMidnight(now: Date = new Date()): number {
  const nowIstMs = now.getTime() + IST_OFFSET_MIN * 60_000;
  const nextIstMidnightMs =
    Math.floor(nowIstMs / 86_400_000) * 86_400_000 + 86_400_000 + 5_000;
  return nextIstMidnightMs - nowIstMs;
}

let timer: NodeJS.Timeout | null = null;

export function startShiftAutoCloseScheduler(): void {
  const schedule = () => {
    const wait = msUntilNextIstMidnight();
    logger.info(
      { runsInMs: wait, runsAt: new Date(Date.now() + wait).toISOString() },
      '[shift-auto-close] Scheduler armed',
    );
    timer = setTimeout(() => {
      runMidnightShiftClose()
        .catch((err) =>
          logger.error({ err }, '[shift-auto-close] Unhandled error'),
        )
        .finally(() => schedule());
    }, wait);
    timer.unref?.();
  };
  schedule();
}

export function stopShiftAutoCloseScheduler(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

// Re-export Prisma type to keep imports tidy if needed elsewhere.
export type { Prisma };
