import type { NextFunction, Request, Response } from 'express';

export const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  const ADMIN_KEY = process.env.ADMIN_API_KEY;   // <-- load dynamically
  const headerKey = req.header('x-api-key');

  if (!ADMIN_KEY) {
    console.warn('ADMIN_API_KEY not set; denying admin route access.');
    return res
      .status(503)
      .json({ message: 'ADMIN_API_KEY is not configured on the server' });
  }

  if (!headerKey || headerKey !== ADMIN_KEY) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  next();
};
