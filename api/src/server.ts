import { createApp } from './app.js';
import { config } from './infra/config.js';
import { logger } from './infra/logger.js';
import { prisma } from './infra/db.js';

async function main() {
  const app = createApp();

  // Verify DB connectivity early so misconfiguration fails loudly.
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connection established');
  } catch (err) {
    logger.error({ err }, 'Failed to connect to database');
    process.exit(1);
  }

  const server = app.listen(config.PORT, () => {
    logger.info(`API listening on http://localhost:${config.PORT}/api/v1`);
    logger.info(`OpenAPI docs at  http://localhost:${config.PORT}/api/v1/docs`);
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down');
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) =>
    logger.error({ reason }, 'Unhandled promise rejection'),
  );
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception');
    process.exit(1);
  });
}

main().catch((err) => {
  logger.fatal({ err }, 'Fatal error during startup');
  process.exit(1);
});
