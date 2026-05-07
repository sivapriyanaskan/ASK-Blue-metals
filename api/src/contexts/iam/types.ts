import type { Request } from 'express';
import { z } from 'zod';

/** What we put on req.user after authentication. */
export interface AuthenticatedUser {
  id: string;
  username: string;
  roles: string[];
  permissions: Set<string>;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthenticatedUser;
  }
}

// -------- Auth request/response schemas --------

export const LoginRequestSchema = z.object({
  username: z.string().min(3).max(64),
  password: z.string().min(1).max(256),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const RefreshRequestSchema = z.object({}).passthrough();

export const PublicUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'LOCKED']),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
  lastLoginAt: z.string().datetime().nullable(),
});
export type PublicUser = z.infer<typeof PublicUserSchema>;

export const LoginResponseSchema = z.object({
  accessToken: z.string(),
  accessTokenExpiresIn: z.number().int().positive(),
  user: PublicUserSchema,
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

// Helpers used by middleware
export function getRequestContext(req: Request) {
  return {
    ipAddress: (req.ip ?? req.socket.remoteAddress ?? null) as string | null,
    userAgent: (req.header('user-agent') ?? null) as string | null,
  };
}
