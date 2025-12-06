import { Router, type Request, type Response, type NextFunction } from 'express';

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

                            export default router;