import express, { Request, Response, NextFunction } from 'express';
import cors, { type CorsOptions } from 'cors';
import dotenv from 'dotenv';
import { healthRouter } from './routes/health';
import secureLinkRouter from './routes/secureLink.routes';
import rfqRouter from './routes/rfq.routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = Number.parseInt(process.env.PORT ?? '', 10) || 5000;

const resolvedCorsOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

const corsOptions: CorsOptions = resolvedCorsOrigins.length > 0 ? { origin: resolvedCorsOrigins } : {};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/health', healthRouter);
app.use('/api/secure', secureLinkRouter);
app.use('/api/rfq', rfqRouter);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'RFQ System API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      secure: '/api/secure',
      rfq: '/api/rfq'
    }
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    const envName = process.env.NODE_ENV ?? 'development';
    const originsLog = resolvedCorsOrigins.length > 0 ? resolvedCorsOrigins.join(', ') : 'All origins (*)';

    console.log('🚀 RFQ System backend ready');
    console.log(`   Environment : ${envName}`);
    console.log(`   Listening   : 0.0.0.0:${PORT}`);
    console.log(`   Health      : /health`);
    console.log(`   Secure API  : /api/secure`);
    console.log(`   CORS origin : ${originsLog}`);
  });
}

export default app;
