import type { NextFunction, Request, Response } from 'express';

export const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  const ADMIN_KEY = process.env.ADMIN_API_KEY;   // <-- load dynamically
  const headerKey = req.header('x-api-key');

  if (!ADMIN_KEY) {
    console.warn('ADMIN_API_KEY not set; denying admin route access.');
    return res.status(500).json({ message: 'Admin access not configured' });
  }

  if (!headerKey || headerKey !== ADMIN_KEY) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  next();
};
