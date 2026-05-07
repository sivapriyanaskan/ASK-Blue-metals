import type { CookieOptions } from 'express';
import { isProd } from './config.js';

export const REFRESH_COOKIE_NAME = 'ask_rt';

export function refreshCookieOptions(maxAgeMs: number): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    path: '/api/v1/auth',
    maxAge: maxAgeMs,
    signed: true,
  };
}
