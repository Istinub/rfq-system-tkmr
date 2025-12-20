import { Router, type Request, type Response, type NextFunction } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

let requestCount = 0;

const countRequests = (_req: Request, _res: Response, next: NextFunction) => {
  requestCount += 1;
  next();
};

router.use(countRequests);

router.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    requests: requestCount,
  });
});

router.get('/detailed', async (_req, res) => {
  const environment = process.env.NODE_ENV ?? 'development';
  const adminConfigured = Boolean(process.env.ADMIN_API_KEY);
  const databaseConfigured = Boolean(process.env.DATABASE_URL);

  let prismaStatus: 'connected' | 'error' | 'skipped' = 'skipped';
  let prismaError: string | null = null;

  if (databaseConfigured) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      prismaStatus = 'connected';
    } catch (error) {
      prismaStatus = 'error';
      prismaError = error instanceof Error ? error.message : 'Unknown Prisma error';
    }
  }

  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    uptime: process.uptime(),
    environment,
    adminApiKeyConfigured: adminConfigured,
    databaseConfigured,
    prisma: {
      status: prismaStatus,
      error: prismaError,
    },
  });
});

export default router;