import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { AppError, Errors } from './errors.js';
import { logger } from './logger.js';
import { isProd } from './config.js';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(Errors.notFound(`Route ${req.method} ${req.originalUrl}`));
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const requestId = (req as { id?: string }).id;

  if (err instanceof AppError) {
    if (err.status >= 500) {
      logger.error({ err, requestId }, err.message);
    } else {
      logger.warn({ code: err.code, status: err.status, requestId }, err.message);
    }
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.expose ? err.message : 'Internal server error',
        ...(err.details ? { details: err.details } : {}),
        requestId,
      },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = mapPrismaError(err);
    logger.warn({ prismaCode: err.code, requestId }, mapped.message);
    return res.status(mapped.status).json({
      error: { code: mapped.code, message: mapped.message, requestId },
    });
  }

  logger.error({ err, requestId }, 'Unhandled error');
  return res.status(500).json({
    error: {
      code: 'INTERNAL',
      message: isProd ? 'Internal server error' : (err as Error)?.message ?? 'Internal server error',
      requestId,
    },
  });
};

function mapPrismaError(err: Prisma.PrismaClientKnownRequestError): {
  status: number;
  code: string;
  message: string;
} {
  switch (err.code) {
    case 'P2002':
      return { status: 409, code: 'CONFLICT', message: 'Unique constraint violated' };
    case 'P2025':
      return { status: 404, code: 'NOT_FOUND', message: 'Record not found' };
    case 'P2003':
      return { status: 409, code: 'CONFLICT', message: 'Foreign key constraint failed' };
    default:
      return { status: 500, code: 'INTERNAL', message: 'Database error' };
  }
}
