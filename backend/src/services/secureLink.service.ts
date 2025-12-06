import { generateToken } from '../utils/generateToken.js';
import type { SecureLink, SecureLinkValidationResult } from '@rfq-system/shared';
import { getRedisClient } from './redisClient.js';

const LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const secureLinkStore = new Map<string, SecureLink>();
const REDIS_HASH_KEY = 'secure-links';

const cacheLink = async (link: SecureLink) => {
  const client = await getRedisClient();
  if (!client) {
    return;
  }

  try {
    await client.hSet(REDIS_HASH_KEY, link.token, JSON.stringify(link));
  } catch (error) {
    console.error('Failed to cache secure link in Redis:', error);
  }
};

const getCachedLink = async (token: string): Promise<SecureLink | null> => {
  const client = await getRedisClient();
  if (!client) {
    return null;
  }

  try {
    const payload = await client.hGet(REDIS_HASH_KEY, token);
    if (!payload) {
      return null;
    }
    return JSON.parse(payload) as SecureLink;
  } catch (error) {
    console.error('Failed to read secure link from Redis:', error);
    return null;
  }
};

const removeCachedLink = async (token: string) => {
  const client = await getRedisClient();
  if (!client) {
    return;
  }

  try {
    await client.hDel(REDIS_HASH_KEY, token);
  } catch (error) {
    console.error('Failed to remove secure link from Redis:', error);
  }
};

const clearCache = async () => {
  const client = await getRedisClient();
  if (!client) {
    return;
  }

  try {
    await client.del(REDIS_HASH_KEY);
  } catch (error) {
    console.error('Failed to clear secure link cache in Redis:', error);
  }
};

const nowIso = (): string => new Date().toISOString();

const createExpiry = (ttlMs: number): string => new Date(Date.now() + ttlMs).toISOString();

interface CreateOptions {
  oneTime?: boolean;
  ttlMs?: number;
}

export const SecureLinkService = {
  create(rfqId: string | number, options: CreateOptions = {}): SecureLink {
    const { oneTime = false, ttlMs = LINK_TTL_MS } = options;
    const token = generateToken();
    const createdAt = nowIso();

    const record: SecureLink = {
      token,
      rfqId: typeof rfqId === 'string' ? rfqId : String(rfqId),
      createdAt,
      expiresAt: createExpiry(ttlMs),
      oneTime,
      firstAccessAt: null,
      lastAccessIP: null,
      accessCount: 0,
    };

    secureLinkStore.set(token, record);
    void cacheLink(record);
    return record;
  },

  async validateAndAccess(token: string, ip?: string, _userAgent?: string): Promise<SecureLinkValidationResult> {
    let record = secureLinkStore.get(token);

    if (!record) {
      const cached = await getCachedLink(token);
      if (cached) {
        secureLinkStore.set(token, cached);
        record = cached;
      }
    }

    if (!record) {
      return { status: 'not_found' };
    }

    if (Date.parse(record.expiresAt) <= Date.now()) {
      secureLinkStore.delete(token);
      void removeCachedLink(token);
      return { status: 'expired', link: record };
    }

    if (record.oneTime && record.accessCount >= 1) {
      secureLinkStore.delete(token);
      void removeCachedLink(token);
      return { status: 'consumed', link: record };
    }

    if (record.firstAccessAt === null) {
      record.firstAccessAt = nowIso();
    }

    record.lastAccessIP = ip ?? record.lastAccessIP;
    record.accessCount += 1;
    secureLinkStore.set(token, record);
    void cacheLink(record);

    return { status: 'ok', link: record, rfqId: String(record.rfqId) };
  },

  async get(token: string): Promise<SecureLink | undefined> {
    const record = secureLinkStore.get(token);
    if (record) {
      return record;
    }

    const cached = await getCachedLink(token);
    if (cached) {
      secureLinkStore.set(token, cached);
      return cached;
    }

    return undefined;
  },

  reset(): void {
    secureLinkStore.clear();
    void clearCache();
  },
};
