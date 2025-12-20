import './config/loadEnv.js';
import express, { Request, Response } from 'express';
import cors, { type CorsOptions } from 'cors';

import healthRouter from './routes/health.routes.js';
import secureLinkRouter from './routes/secureLink.routes.js';
import rfqRouter from './routes/rfq.routes.js';
import { rfqByTokenRouter } from './routes/rfq.byToken.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import adminRouter from './routes/admin.routes.js';

const app = express();
const PORT = Number.parseInt(process.env.PORT ?? '', 10) || 5000;

/**
 * ==============================
 * CORS CONFIGURATION
 * ==============================
 */
const resolvedCorsOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const isProd = process.env.NODE_ENV === 'production';
const isDev = !isProd;

const logStartupWarnings = () => {
  if (!isProd) {
    return;
  }

  if (!process.env.ADMIN_API_KEY) {
    console.warn(
      '⚠️  ADMIN_API_KEY is not configured. Admin API routes will reject every request.'
    );
  }

  if (!process.env.DATABASE_URL) {
    console.warn(
      '⚠️  DATABASE_URL is not configured. Prisma cannot connect and admin features will fail.'
    );
  }

  if (!process.env.CORS_ORIGINS || resolvedCorsOrigins.length === 0) {
    console.warn(
      '⚠️  CORS_ORIGINS is empty in production. Browser requests will be blocked until valid origins are provided.'
    );
  }
};

logStartupWarnings();

const corsOptions: CorsOptions = isDev
  ? {
      // ✅ Allow all origins in dev (Codespaces-safe)
      origin: true,
      credentials: true,
    }
  : {
      // ✅ Restrict origins in production
      origin: resolvedCorsOrigins,
      credentials: true,
    };

// Apply CORS FIRST
app.use(cors(corsOptions));

// Explicit preflight support
app.options('*', cors(corsOptions));

/**
 * ==============================
 * MIDDLEWARE
 * ==============================
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(requestLogger);
}

/**
 * ==============================
 * ROUTES
 * ==============================
 */
app.use('/health', healthRouter);
app.use('/api/rfq/by-token', rfqByTokenRouter);
app.use('/api/rfq', rfqRouter);
app.use('/api/secure-link', secureLinkRouter);
app.use('/api/admin', adminRouter);

/**
 * ==============================
 * ROOT
 * ==============================
 */
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'RFQ System API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      rfq: '/api/rfq',
      secureLink: '/api/secure-link',
      admin: '/api/admin',
    },
  });
});

/**
 * ==============================
 * 404 HANDLER
 * ==============================
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

/**
 * ==============================
 * ERROR HANDLER
 * ==============================
 */
app.use(errorHandler);

/**
 * ==============================
 * START SERVER
 * ==============================
 */
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log('🚀 RFQ System backend ready');
    console.log(`   Environment : ${process.env.NODE_ENV ?? 'development'}`);
    console.log(`   Listening   : 0.0.0.0:${PORT}`);
    console.log(`   Health      : /health`);
    console.log(`   Secure API  : /api/secure-link`);
    console.log(
      `   CORS origin : ${
        isDev ? 'All origins (*) [DEV]' : resolvedCorsOrigins.join(', ')
      }`
    );
  });
}

export default app;
