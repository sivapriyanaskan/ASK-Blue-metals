import express, { Router, type RequestHandler } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { pinoHttp } from 'pino-http';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { config } from './infra/config.js';
import { logger } from './infra/logger.js';
import { requestId } from './infra/request-id.js';
import { errorHandler, notFoundHandler } from './infra/error-middleware.js';
import { mountIamRoutes } from './contexts/iam/index.js';
import { auditRouter } from './contexts/audit/audit.router.js';
import { deviceLogsRouter } from './contexts/audit/device-logs.router.js';
import { mountMastersRoutes } from './contexts/masters/index.js';
import { mountOperationsRoutes } from './contexts/operations/index.js';
import { systemSettingsRouter } from './contexts/system/settings.router.js';
import { camerasRouter } from './contexts/system/cameras.router.js';
import { companyProfileRouter } from './contexts/system/companyProfile.router.js';
import { commonPrinterSettingsRouter } from './contexts/masters/commonPrinterSetting/router.js';
import { openApiDocument } from './infra/openapi.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Cross-cutting middleware
  app.use(requestId);

  // Hard request timeout (30s). Long-lived endpoints opt out by URL prefix
  // — camera streams and the static `/uploads` server can run for minutes.
  const TIMEOUT_EXEMPT = /^\/(api\/v1\/cameras\/.+\/stream|uploads\/)/;
  app.use((req, res, next) => {
    if (TIMEOUT_EXEMPT.test(req.url)) return next();
    const t = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({ error: 'Request timeout' });
      } else if (!res.writableEnded) {
        res.end();
      }
    }, 30_000);
    res.on('finish', () => clearTimeout(t));
    res.on('close', () => clearTimeout(t));
    next();
  });
  const httpLogger = pinoHttp({
    logger,
    genReqId: (req) => (req as { id?: string }).id ?? '',
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    autoLogging: { ignore: (req) => req.url === '/api/v1/health' },
  });
  const httpLoggerMw: RequestHandler = (req, res, next) =>
    (httpLogger as unknown as (a: unknown, b: unknown, c: unknown) => void)(req, res, next);
  app.use(httpLoggerMw);

  app.use(
    helmet({
      contentSecurityPolicy: false, // SPA assets are served separately
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }) as unknown as RequestHandler,
  );

  app.use(
    cors({
      origin(origin, cb) {
        if (!origin) return cb(null, true); // mobile apps, curl, server-to-server
        if (config.CORS_ORIGINS.includes(origin)) return cb(null, true);
        return cb(new Error(`Origin ${origin} not allowed by CORS`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Client-Type', 'Idempotency-Key'],
      exposedHeaders: ['X-Request-Id'],
      maxAge: 86400,
    }),
  );

  // Body parsers (10 KB cap per security guideline)
  app.use(express.json({ limit: '10kb' }) as RequestHandler);
  app.use(express.urlencoded({ extended: true, limit: '10kb' }) as RequestHandler);
  app.use(cookieParser(config.COOKIE_SECRET) as unknown as RequestHandler);

  // Static uploads (camera snapshots, etc). Stored on disk and served with
  // long-cache headers; only the URL ever lands in the database.
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  mkdirSync(uploadsDir, { recursive: true });
  app.use(
    '/uploads',
    express.static(uploadsDir, {
      fallthrough: false,
      maxAge: '7d',
      index: false,
      dotfiles: 'deny',
    }) as unknown as RequestHandler,
  );

  // Global, gentle rate limiter (auth router applies its own stricter one)
  app.use(
    rateLimit({
      windowMs: 60_000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
    }) as unknown as RequestHandler,
  );

  // ----- API v1 -----
  const api = Router();
  api.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

  const iam = mountIamRoutes();
  api.use('/auth', iam.auth);
  api.use('/users', iam.users);
  api.use('/roles', iam.roles);
  api.use('/admin/menus', iam.menus);
  api.use('/admin/features', iam.features);
  api.use('/admin/role-access', iam.roleAccess);
  api.use('/audit-logs', auditRouter);
  api.use('/device-logs', deviceLogsRouter);
  api.use('/system/settings', systemSettingsRouter);
  api.use('/system/company-profile', companyProfileRouter);
  api.use('/cameras', camerasRouter);

  // Masters context (SRS §3.2)
  const masters = mountMastersRoutes();
  api.use('/masters/units', masters.units);
  api.use('/masters/item-groups', masters.itemGroups);
  api.use('/masters/item-sub-groups', masters.itemSubGroups);
  api.use('/masters/work-centres', masters.workCentres);
  api.use('/masters/printers', masters.printers);
  api.use('/masters/banks', masters.banks);
  api.use('/masters/accounts', masters.accounts);
  api.use('/masters/bill-sundries', masters.billSundries);
  api.use('/masters/drivers', masters.drivers);
  api.use('/masters/vehicles', masters.vehicles);
  api.use('/masters/customers', masters.customers);
  api.use('/masters/suppliers', masters.suppliers);
  api.use('/masters/items', masters.items);
  api.use('/masters/customer-rates', masters.customerRates);
  api.use('/masters/supplier-rates', masters.supplierRates);
  api.use('/masters/customer-freezes', masters.customerFreezes);
  api.use('/masters/common-printer-settings', commonPrinterSettingsRouter);

  // Operations context (SRS §3.3)
  const operations = mountOperationsRoutes();
  api.use('/operations/tokens', operations.tokens);
  api.use('/operations/sales-bills', operations.salesBills);
  api.use('/operations/purchase-entry-passes', operations.purchaseEntryPasses);
  api.use('/operations/purchase-bills', operations.purchaseBills);
  api.use('/operations/shifts', operations.shifts);
  api.use('/operations/shifts', operations.shiftReports);
  api.use('/finance/currency-exchanges', operations.currencyExchanges);
  api.use('/finance/cash-vouchers', operations.cashVouchers);
  api.use('/fuel/consumptions', operations.fuelConsumptions);
  api.use('/production/raw-material-entries', operations.rawMaterialEntries);
  api.use('/production/purchase-consumptions', operations.purchaseConsumptions);
  api.use('/operations/weight-slips', operations.weightSlips);

  // OpenAPI + Swagger UI
  api.get('/openapi.json', (_req, res) => res.json(openApiDocument));
  api.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument as never));

  app.use('/api/v1', api);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
