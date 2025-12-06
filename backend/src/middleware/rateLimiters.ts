import rateLimit from 'express-rate-limit';
import type { LegacyStore, Store } from 'express-rate-limit';
import type { Request, Response } from 'express';
import { getRedisClient } from '../services/redisClient.js';

const limiterHandler = (_req: Request, res: Response, message: string) => {
  res.status(429).json({ message });
};

type RateLimitRequestHandler = ReturnType<typeof rateLimit>;
type RateLimitHandlerWithStore = RateLimitRequestHandler & { store: Store | LegacyStore };

const attachRedisStore = (namespace: string, windowMs: number, handler: RateLimitRequestHandler) => {
  void (async () => {
    const client = await getRedisClient();
    if (!client) {
      return;
    }

    const keyFor = (key: string) => `rl:${namespace}:${key}`;

    const handlerWithStore = handler as RateLimitHandlerWithStore;

    handlerWithStore.store = {
      async increment(key: string) {
        const redisKey = keyFor(key);
        const totalHits = await client.incr(redisKey);
        if (totalHits === 1) {
          await client.pExpire(redisKey, windowMs);
        }
        const ttlMs = await client.pTTL(redisKey);
        const resetTime = ttlMs > 0 ? new Date(Date.now() + ttlMs) : undefined;
        return { totalHits, resetTime };
      },
      async decrement(key: string) {
        const redisKey = keyFor(key);
        const value = await client.decr(redisKey);
        if (value <= 0) {
          await client.del(redisKey);
        }
      },
      async resetKey(key: string) {
        await client.del(keyFor(key));
      },
      async resetAll() {
        // Avoid flushing shared Redis data; consumers can manage keys if needed.
      },
    };
  })();
};

interface LimiterOptions {
  namespace: string;
  windowMs: number;
  limit: number;
  message: string;
}

const createLimiter = ({ namespace, windowMs, limit, message }: LimiterOptions) => {
  const handler = rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => limiterHandler(req, res, message),
  });

  attachRedisStore(namespace, windowMs, handler);
  return handler;
};

export const rfqSubmissionLimiter = createLimiter({
  namespace: 'rfq',
  windowMs: 60 * 1000,
  limit: 5,
  message: 'Too many RFQ submissions from this IP. Try again in a minute.',
});

export const secureLinkLimiter = createLimiter({
  namespace: 'secure',
  windowMs: 60 * 1000,
  limit: 20,
  message: 'Too many secure link requests from this IP. Please slow down.',
});
