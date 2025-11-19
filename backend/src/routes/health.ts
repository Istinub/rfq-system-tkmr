import { Router, Request, Response } from 'express';

export const healthRouter = Router();

// Health check endpoint
healthRouter.get('/', (req: Request, res: Response) => {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    service: 'rfq-system-backend'
  };

  res.status(200).json(healthCheck);
});

// Detailed health check
healthRouter.get('/detailed', (req: Request, res: Response) => {
  const detailedHealth = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    service: 'rfq-system-backend',
    memory: {
      used: process.memoryUsage().heapUsed,
      total: process.memoryUsage().heapTotal,
      external: process.memoryUsage().external
    },
    system: {
      platform: process.platform,
      nodeVersion: process.version
    }
  };

  res.status(200).json(detailedHealth);
});
