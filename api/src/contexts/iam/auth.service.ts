import { prisma } from '../../infra/db.js';
import { config } from '../../infra/config.js';
import { Errors } from '../../infra/errors.js';
import { logger } from '../../infra/logger.js';
import {
  generateRefreshToken,
  hashRefreshToken,
  parseDurationToMs,
  signAccessToken,
} from './tokens.js';
import { verifyPassword } from './password.js';
import { auditService } from '../audit/audit.service.js';
import type { LoginResponse, PublicUser } from './types.js';
import { randomUUID } from 'node:crypto';

interface LoginContext {
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

interface LoginResult extends LoginResponse {
  refreshToken: string;
  refreshTokenMaxAgeMs: number;
}

export const authService = {
  async login(
    username: string,
    password: string,
    ctx: LoginContext,
  ): Promise<LoginResult> {
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        roles: {
          include: {
            role: { include: { permissions: { include: { permission: true } } } },
          },
        },
      },
    });

    // Always run a bcrypt compare to keep timing roughly constant against username probing.
    if (!user) {
      await verifyPassword(password, '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv');
      await auditService.record({
        action: 'LOGIN_FAILED',
        resource: 'iam.user',
        resourceId: null,
        changes: { reason: 'unknown_user', username },
        ipAddress: ctx.ipAddress ?? null,
        userAgent: ctx.userAgent ?? null,
        requestId: ctx.requestId ?? null,
      });
      throw Errors.unauthorized('Invalid username or password');
    }

    if (user.status === 'INACTIVE') {
      throw Errors.forbidden('Account is inactive');
    }

    if (user.status === 'LOCKED' || (user.lockedUntil && user.lockedUntil > new Date())) {
      throw Errors.forbidden('Account is temporarily locked. Please try again later.');
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      await this.registerFailedLogin(user.id, ctx);
      throw Errors.unauthorized('Invalid username or password');
    }

    // Reset failure counters on success.
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    const roles = user.roles.map((ur) => ur.role.code);
    const permissions = Array.from(
      new Set(
        user.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.code)),
      ),
    );

    const accessTtlMs = parseDurationToMs(config.JWT_ACCESS_TTL);
    const refreshTtlMs = parseDurationToMs(config.JWT_REFRESH_TTL);

    const accessToken = signAccessToken({
      sub: user.id,
      username: user.username,
      roles,
      permissions,
    });

    const family = randomUUID();
    const { raw, hash } = generateRefreshToken();
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hash,
        family,
        userAgent: ctx.userAgent ?? null,
        ipAddress: ctx.ipAddress ?? null,
        expiresAt: new Date(Date.now() + refreshTtlMs),
      },
    });

    await auditService.record({
      actorId: user.id,
      actorName: user.username,
      action: 'LOGIN',
      resource: 'iam.user',
      resourceId: user.id,
      ipAddress: ctx.ipAddress ?? null,
      userAgent: ctx.userAgent ?? null,
      requestId: ctx.requestId ?? null,
    });

    return {
      accessToken,
      accessTokenExpiresIn: Math.floor(accessTtlMs / 1000),
      refreshToken: raw,
      refreshTokenMaxAgeMs: refreshTtlMs,
      user: toPublicUser(user, roles, permissions),
    };
  },

  async refresh(rawToken: string, ctx: LoginContext): Promise<LoginResult> {
    const tokenHash = hashRefreshToken(rawToken);
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            roles: {
              include: {
                role: { include: { permissions: { include: { permission: true } } } },
              },
            },
          },
        },
      },
    });

    if (!stored) {
      logger.warn({ ip: ctx.ipAddress }, 'Refresh attempted with unknown token');
      throw Errors.unauthorized('Invalid refresh token');
    }

    // Reuse detection: presented token has already been rotated. Revoke entire family.
    if (stored.revokedAt) {
      await prisma.refreshToken.updateMany({
        where: { family: stored.family, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await auditService.record({
        actorId: stored.userId,
        action: 'REFRESH_REUSE_DETECTED',
        resource: 'iam.refresh_token',
        resourceId: stored.id,
        changes: { family: stored.family },
        ipAddress: ctx.ipAddress ?? null,
        userAgent: ctx.userAgent ?? null,
        requestId: ctx.requestId ?? null,
      });
      throw Errors.unauthorized('Refresh token reuse detected; please sign in again');
    }

    if (stored.expiresAt <= new Date()) {
      throw Errors.unauthorized('Refresh token expired');
    }

    if (stored.user.status !== 'ACTIVE') {
      throw Errors.forbidden('Account is not active');
    }

    const accessTtlMs = parseDurationToMs(config.JWT_ACCESS_TTL);
    const refreshTtlMs = parseDurationToMs(config.JWT_REFRESH_TTL);

    const roles = stored.user.roles.map((ur) => ur.role.code);
    const permissions = Array.from(
      new Set(
        stored.user.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.code)),
      ),
    );

    const accessToken = signAccessToken({
      sub: stored.userId,
      username: stored.user.username,
      roles,
      permissions,
    });

    const next = generateRefreshToken();
    const replacement = await prisma.$transaction(async (tx) => {
      const created = await tx.refreshToken.create({
        data: {
          userId: stored.userId,
          tokenHash: next.hash,
          family: stored.family,
          userAgent: ctx.userAgent ?? null,
          ipAddress: ctx.ipAddress ?? null,
          expiresAt: new Date(Date.now() + refreshTtlMs),
        },
      });
      await tx.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date(), replacedById: created.id },
      });
      return created;
    });

    await auditService.record({
      actorId: stored.userId,
      actorName: stored.user.username,
      action: 'REFRESH',
      resource: 'iam.refresh_token',
      resourceId: replacement.id,
      ipAddress: ctx.ipAddress ?? null,
      userAgent: ctx.userAgent ?? null,
      requestId: ctx.requestId ?? null,
    });

    return {
      accessToken,
      accessTokenExpiresIn: Math.floor(accessTtlMs / 1000),
      refreshToken: next.raw,
      refreshTokenMaxAgeMs: refreshTtlMs,
      user: toPublicUser(stored.user, roles, permissions),
    };
  },

  async logout(rawToken: string | undefined, actorId: string | undefined, ctx: LoginContext) {
    if (!rawToken) return;
    const tokenHash = hashRefreshToken(rawToken);
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored) return;
    await prisma.refreshToken.updateMany({
      where: { family: stored.family, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await auditService.record({
      actorId: actorId ?? stored.userId,
      action: 'LOGOUT',
      resource: 'iam.refresh_token',
      resourceId: stored.id,
      ipAddress: ctx.ipAddress ?? null,
      userAgent: ctx.userAgent ?? null,
      requestId: ctx.requestId ?? null,
    });
  },

  async registerFailedLogin(userId: string, ctx: LoginContext) {
    const threshold = config.ACCOUNT_LOCKOUT_THRESHOLD;
    const windowMs = config.ACCOUNT_LOCKOUT_WINDOW_MIN * 60_000;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: { increment: 1 } },
      select: { failedLoginAttempts: true, username: true },
    });

    if (updated.failedLoginAttempts >= threshold) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          lockedUntil: new Date(Date.now() + windowMs),
          failedLoginAttempts: 0,
        },
      });
      await auditService.record({
        actorId: userId,
        actorName: updated.username,
        action: 'ACCOUNT_LOCKED',
        resource: 'iam.user',
        resourceId: userId,
        changes: { reason: 'too_many_failed_logins', windowMinutes: config.ACCOUNT_LOCKOUT_WINDOW_MIN },
        ipAddress: ctx.ipAddress ?? null,
        userAgent: ctx.userAgent ?? null,
        requestId: ctx.requestId ?? null,
      });
    } else {
      await auditService.record({
        actorId: userId,
        actorName: updated.username,
        action: 'LOGIN_FAILED',
        resource: 'iam.user',
        resourceId: userId,
        changes: { attempts: updated.failedLoginAttempts },
        ipAddress: ctx.ipAddress ?? null,
        userAgent: ctx.userAgent ?? null,
        requestId: ctx.requestId ?? null,
      });
    }
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPublicUser(user: any, roles: string[], permissions: string[]): PublicUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    status: user.status,
    roles,
    permissions,
    lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt).toISOString() : null,
  };
}
