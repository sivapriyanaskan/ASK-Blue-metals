import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler, validate } from '../../infra/validation.js';
import { Errors } from '../../infra/errors.js';
import { authService } from './auth.service.js';
import { requireAuth } from './auth.middleware.js';
import { LoginRequestSchema, getRequestContext } from './types.js';
import { REFRESH_COOKIE_NAME, refreshCookieOptions } from '../../infra/cookies.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many login attempts' } },
});

/**
 * POST /api/v1/auth/login
 * Returns access token in body and sets refresh-token cookie.
 * Mobile clients can read the refresh token from the response body when
 * `X-Client-Type: mobile` is present (the cookie is still set but ignored).
 */
router.post(
  '/login',
  loginLimiter,
  validate('body', LoginRequestSchema),
  asyncHandler(async (req, res) => {
    const { username, password } = req.body as { username: string; password: string };
    const ctx = { ...getRequestContext(req), requestId: req.id };
    const result = await authService.login(username, password, ctx);

    res.cookie(
      REFRESH_COOKIE_NAME,
      result.refreshToken,
      refreshCookieOptions(result.refreshTokenMaxAgeMs),
    );

    const isMobile = req.header('x-client-type')?.toLowerCase() === 'mobile';

    res.json({
      accessToken: result.accessToken,
      accessTokenExpiresIn: result.accessTokenExpiresIn,
      user: result.user,
      ...(isMobile ? { refreshToken: result.refreshToken } : {}),
    });
  }),
);

/**
 * POST /api/v1/auth/refresh
 * Accepts refresh token via signed cookie (web) or body (mobile).
 * Rotates the token; reuse aborts the entire token family.
 */
router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const isMobile = req.header('x-client-type')?.toLowerCase() === 'mobile';
    const fromCookie = req.signedCookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    const fromBody = (req.body as { refreshToken?: string } | undefined)?.refreshToken;
    const raw = fromCookie ?? fromBody;
    if (!raw) throw Errors.unauthorized('Missing refresh token');

    const ctx = { ...getRequestContext(req), requestId: req.id };
    const result = await authService.refresh(raw, ctx);

    res.cookie(
      REFRESH_COOKIE_NAME,
      result.refreshToken,
      refreshCookieOptions(result.refreshTokenMaxAgeMs),
    );

    res.json({
      accessToken: result.accessToken,
      accessTokenExpiresIn: result.accessTokenExpiresIn,
      user: result.user,
      ...(isMobile ? { refreshToken: result.refreshToken } : {}),
    });
  }),
);

/**
 * POST /api/v1/auth/logout
 * Revokes the entire refresh-token family the presented token belongs to.
 */
router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const fromCookie = req.signedCookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    const fromBody = (req.body as { refreshToken?: string } | undefined)?.refreshToken;
    const raw = fromCookie ?? fromBody;
    const ctx = { ...getRequestContext(req), requestId: req.id };
    await authService.logout(raw, undefined, ctx);
    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions(0));
    res.status(204).send();
  }),
);

/**
 * GET /api/v1/auth/me
 * Returns the authenticated user's profile (claims-derived).
 */
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) throw Errors.unauthorized();
    res.json({
      id: req.user.id,
      username: req.user.username,
      roles: req.user.roles,
      permissions: Array.from(req.user.permissions),
    });
  }),
);

export const authRouter = router;
