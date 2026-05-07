import { prisma } from '../../infra/db.js';

export interface AuditEntry {
  actorId?: string | null;
  actorName?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  changes?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

export const auditService = {
  async record(entry: AuditEntry): Promise<void> {
    await prisma.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        actorName: entry.actorName ?? null,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId ?? null,
        changes: (entry.changes ?? undefined) as never,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
        requestId: entry.requestId ?? null,
      },
    });
  },
};
