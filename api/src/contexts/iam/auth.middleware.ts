import type { RequestHandler } from 'express';
import { Errors } from '../../infra/errors.js';
import { verifyAccessToken } from './tokens.js';

/**
 * Require a valid bearer access token.
 * Populates req.user with id, username, roles, permissions.
 */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.header('authorization');
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    return next(Errors.unauthorized());
  }
  const token = header.slice(7).trim();
  if (!token) return next(Errors.unauthorized());

  try {
    const claims = verifyAccessToken(token);
    req.user = {
      id: claims.sub,
      username: claims.username,
      roles: claims.roles ?? [],
      permissions: new Set(claims.permissions ?? []),
    };
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Require ALL listed permissions.
 * Use after requireAuth.
 */
export function requirePermissions(...required: string[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(Errors.unauthorized());
    const missing = required.filter((p) => !req.user!.permissions.has(p));
    if (missing.length > 0) {
      return next(Errors.forbidden(`Missing permissions: ${missing.join(', ')}`));
    }
    next();
  };
}

/** Require ANY of the listed roles. */
export function requireAnyRole(...roles: string[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(Errors.unauthorized());
    const has = roles.some((r) => req.user!.roles.includes(r));
    if (!has) return next(Errors.forbidden());
    next();
  };
}
