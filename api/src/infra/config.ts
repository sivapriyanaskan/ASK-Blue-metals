import 'dotenv/config';
import { z } from 'zod';

/**
 * Centralised, validated runtime configuration.
 *
 * Every consumer must import from here rather than reading process.env
 * directly. Validation happens once at boot; a misconfigured environment
 * fails fast with a clear error.
 */

const csv = (v: string) =>
  v
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

const Schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),

  CORS_ORIGINS: z.string().default('').transform(csv),

  DATABASE_URL: z.string().url(),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ISSUER: z.string().min(1).default('ask-blue-metal'),
  JWT_AUDIENCE: z.string().min(1).default('ask-clients'),
  JWT_ACCESS_TTL: z.string().min(1).default('15m'),
  JWT_REFRESH_TTL: z.string().min(1).default('7d'),

  COOKIE_SECRET: z.string().min(16, 'COOKIE_SECRET must be at least 16 characters'),

  ACCOUNT_LOCKOUT_THRESHOLD: z.coerce.number().int().min(1).default(5),
  ACCOUNT_LOCKOUT_WINDOW_MIN: z.coerce.number().int().min(1).default(15),

  SEED_ADMIN_USERNAME: z.string().min(1).default('admin'),
  SEED_ADMIN_EMAIL: z.string().email().default('admin@askbluemetal.local'),
  SEED_ADMIN_PASSWORD: z.string().min(8).default('Admin@12345678'),

  // RTSP camera sources (gate / weighbridge cameras). Credentials stay
  // server-side; the browser only ever sees the proxied MJPEG feed.
  CAMERA_FRONT_RTSP_URL: z.string().url().optional(),
  CAMERA_TOP_RTSP_URL: z.string().url().optional(),
  CAMERA_STREAM_FPS: z.coerce.number().int().min(1).max(30).default(10),
  CAMERA_STREAM_WIDTH: z.coerce.number().int().min(160).max(1920).default(640),
});

const parsed = Schema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
export const isDev = config.NODE_ENV === 'development';
export const isProd = config.NODE_ENV === 'production';
export const isTest = config.NODE_ENV === 'test';
