import type { Request } from 'express';
import { Errors } from '../../infra/errors.js';
import { getRequestContext } from '../iam/types.js';

/**
 * Shared shapes and helpers for the masters context.
 *
 * Each master records audit entries with the actor extracted from the JWT.
 * Field-level diffs are normalised so the audit UI can render any master's
 * change history with one renderer.
 */
export interface ActorContext {
  actorId: string;
  actorName: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

export function actorContextFromRequest(req: Request): ActorContext {
  if (!req.user) throw Errors.unauthorized();
  return {
    actorId: req.user.id,
    actorName: req.user.username,
    ...getRequestContext(req),
    requestId: req.id ?? null,
  };
}

/**
 * Compute a shallow field-level diff between two record snapshots.
 * Decimal/date values are coerced to strings to keep the JSON stable.
 */
export function diff<T extends Record<string, unknown>>(
  before: T,
  after: T,
  fields: ReadonlyArray<keyof T>,
): Record<string, { from: unknown; to: unknown }> {
  const out: Record<string, { from: unknown; to: unknown }> = {};
  for (const f of fields) {
    const a = normalise(before[f]);
    const b = normalise(after[f]);
    if (a !== b) out[String(f)] = { from: a, to: b };
  }
  return out;
}

function normalise(v: unknown): unknown {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString();
  // Prisma Decimal exposes toString and is the dominant non-primitive case.
  if (typeof v === 'object' && 'toString' in (v as object)) {
    const s = (v as { toString: () => string }).toString();
    // Avoid swallowing plain objects ([object Object]).
    if (s !== '[object Object]') return s;
  }
  return v;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export function paginate<T>(items: T[], page: number, pageSize: number, total: number): PaginatedResult<T> {
  return { items, page, pageSize, total };
}
