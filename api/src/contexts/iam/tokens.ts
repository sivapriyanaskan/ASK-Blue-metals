import { createHash, randomBytes } from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from '../../infra/config.js';
import { Errors } from '../../infra/errors.js';

export interface AccessTokenClaims {
  sub: string;
  username: string;
  roles: string[];
  permissions: string[];
}

export function signAccessToken(claims: AccessTokenClaims): string {
  const opts: SignOptions = {
    issuer: config.JWT_ISSUER,
    audience: config.JWT_AUDIENCE,
    expiresIn: config.JWT_ACCESS_TTL as SignOptions['expiresIn'],
    algorithm: 'HS256',
  };
  return jwt.sign(claims, config.JWT_SECRET, opts);
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET, {
      issuer: config.JWT_ISSUER,
      audience: config.JWT_AUDIENCE,
      algorithms: ['HS256'],
    });
    if (typeof decoded === 'string') throw Errors.unauthorized('Invalid token');
    return decoded as unknown as AccessTokenClaims;
  } catch {
    throw Errors.unauthorized('Invalid or expired token');
  }
}

/**
 * Generate a cryptographically random refresh token.
 * The raw token is returned to the caller (sent to the client) and the SHA-256
 * hash is stored in the database. Rotation is enforced on every refresh.
 */
export function generateRefreshToken(): { raw: string; hash: string } {
  const raw = randomBytes(48).toString('base64url');
  return { raw, hash: hashRefreshToken(raw) };
}

export function hashRefreshToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/** Parse a duration string ("15m", "7d", "3600s", "1h") into milliseconds. */
export function parseDurationToMs(input: string): number {
  const match = /^(\d+)\s*(ms|s|m|h|d)$/i.exec(input.trim());
  if (!match) throw new Error(`Invalid duration: ${input}`);
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  switch (unit) {
    case 'ms':
      return value;
    case 's':
      return value * 1000;
    case 'm':
      return value * 60_000;
    case 'h':
      return value * 3_600_000;
    case 'd':
      return value * 86_400_000;
    default:
      throw new Error(`Invalid duration unit: ${unit}`);
  }
}
