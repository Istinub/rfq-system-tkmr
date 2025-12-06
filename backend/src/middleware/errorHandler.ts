import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

const isDevelopment = () => (process.env.NODE_ENV ?? 'development') === 'development';

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  const errorId = randomUUID();
  const timestamp = new Date().toISOString();

  const logPayload: Record<string, unknown> = {
    errorId,
    timestamp,
    message: err.message,
  };

  if (isDevelopment() && err.stack) {
    logPayload.stack = err.stack;
  }

  console.error('API Error:', logPayload);

  const response: Record<string, unknown> = {
    errorId,
    message: isDevelopment() ? err.message : 'Something went wrong',
  };

  if (isDevelopment() && err.stack) {
    response.stack = err.stack;
  }

  res.status(500).json(response);
};
