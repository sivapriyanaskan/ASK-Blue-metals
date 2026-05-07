import { PrismaClient } from '@prisma/client';
import { config, isDev } from './config.js';
import { logger } from './logger.js';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    log: isDev
      ? [
          { emit: 'event', level: 'warn' },
          { emit: 'event', level: 'error' },
        ]
      : [{ emit: 'event', level: 'error' }],
    datasources: { db: { url: config.DATABASE_URL } },
  });

// Bridge Prisma's log events into our structured logger.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(prisma as any).$on('warn', (e: { message: string }) => logger.warn({ prisma: e }, 'prisma warn'));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(prisma as any).$on('error', (e: { message: string }) =>
  logger.error({ prisma: e }, 'prisma error'),
);

if (isDev) global.__prisma = prisma;
