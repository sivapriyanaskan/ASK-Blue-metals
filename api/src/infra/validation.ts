import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { Errors } from './errors.js';

type Source = 'body' | 'query' | 'params';

/**
 * Validate one part of the request against a Zod schema.
 * On success, the parsed value replaces req[source].
 */
export function validate<S extends ZodSchema>(source: Source, schema: S): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(toBadRequest(result.error, source));
    }
    // Express types treat these as readonly in some setups; safe overwrite.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any)[source] = result.data;
    next();
  };
}

/**
 * Wrap an async route handler so thrown errors reach the error middleware.
 */
export const asyncHandler =
  <T extends RequestHandler>(fn: T): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

function toBadRequest(error: ZodError, source: Source) {
  const details = error.issues.map((i) => ({
    path: i.path.join('.'),
    message: i.message,
    code: i.code,
  }));
  return Errors.badRequest(`Invalid ${source}`, details);
}
