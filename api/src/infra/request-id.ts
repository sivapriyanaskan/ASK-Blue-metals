import type { RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';

declare module 'express-serve-static-core' {
  interface Request {
    id?: string;
  }
}

/**
 * Attach a stable id to every request for log correlation and error responses.
 * Honours an existing `X-Request-Id` from upstream proxies if present.
 */
export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.header('x-request-id');
  const id = incoming && incoming.length <= 128 ? incoming : randomUUID();
  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
};
