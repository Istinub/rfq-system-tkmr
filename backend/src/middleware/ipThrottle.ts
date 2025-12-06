import type { NextFunction, Request, Response } from 'express';
import { getBanRemainingSeconds, isBanned, registerFailure, resetFailures } from '../services/ipThrottle.service';

const BAN_MESSAGE = 'Too many failed attempts. Try again later.';

export const ipThrottle = (req: Request, res: Response, next: NextFunction) => {
  const clientIp = req.ip ?? req.socket.remoteAddress ?? '';

  if (!clientIp) {
    return next();
  }

  if (isBanned(clientIp)) {
    const retryAfterSeconds = getBanRemainingSeconds(clientIp);
    return res.status(429).json({ message: BAN_MESSAGE, retryAfterSeconds });
  }

  res.on('finish', () => {
    if (res.statusCode >= 400) {
      registerFailure(clientIp);
    } else {
      resetFailures(clientIp);
    }
  });

  next();
};
