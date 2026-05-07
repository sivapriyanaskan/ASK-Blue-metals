import pino from 'pino';
import { config, isDev } from './config.js';

export const logger = pino({
  level: config.LOG_LEVEL,
  base: { service: 'ask-api', env: config.NODE_ENV },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.refreshToken',
    ],
    censor: '[REDACTED]',
  },
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, singleLine: false, translateTime: 'SYS:HH:MM:ss.l' },
        },
      }
    : {}),
});
