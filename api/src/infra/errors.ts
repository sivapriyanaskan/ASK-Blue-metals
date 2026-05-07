/**
 * Canonical application error.
 * Always thrown by services; mapped to HTTP by the error middleware.
 */
export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly expose: boolean;

  constructor(opts: {
    status: number;
    code: string;
    message: string;
    details?: unknown;
    expose?: boolean;
  }) {
    super(opts.message);
    this.name = 'AppError';
    this.status = opts.status;
    this.code = opts.code;
    this.details = opts.details;
    this.expose = opts.expose ?? true;
    Error.captureStackTrace?.(this, AppError);
  }
}

export const Errors = {
  badRequest: (message: string, details?: unknown) =>
    new AppError({ status: 400, code: 'BAD_REQUEST', message, details }),
  unauthorized: (message = 'Authentication required') =>
    new AppError({ status: 401, code: 'UNAUTHORIZED', message }),
  forbidden: (message = 'You do not have permission to perform this action') =>
    new AppError({ status: 403, code: 'FORBIDDEN', message }),
  notFound: (resource: string) =>
    new AppError({ status: 404, code: 'NOT_FOUND', message: `${resource} not found` }),
  conflict: (message: string, details?: unknown) =>
    new AppError({ status: 409, code: 'CONFLICT', message, details }),
  unprocessable: (message: string, details?: unknown) =>
    new AppError({ status: 422, code: 'UNPROCESSABLE', message, details }),
  tooManyRequests: (message = 'Too many requests') =>
    new AppError({ status: 429, code: 'TOO_MANY_REQUESTS', message }),
  internal: (message = 'Internal server error') =>
    new AppError({ status: 500, code: 'INTERNAL', message, expose: false }),
};
