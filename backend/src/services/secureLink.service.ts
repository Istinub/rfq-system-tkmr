import { generateToken } from '../utils/generateToken';
import type { SecureLink, SecureLinkAccessLog, SecureLinkValidationResult } from '@rfq-system/shared';

const LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const secureLinkStore = new Map<string, SecureLink>();

const nowIso = (): string => new Date().toISOString();

const createExpiry = (ttlMs: number): string => new Date(Date.now() + ttlMs).toISOString();

const buildAccessLog = (ip?: string, userAgent?: string): SecureLinkAccessLog => {
  const entry: SecureLinkAccessLog = { time: nowIso() };

  if (ip) {
    entry.ip = ip;
  }

  if (userAgent) {
    entry.userAgent = userAgent;
  }

  return entry;
};

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
      expires: createExpiry(ttlMs),
      oneTime,
      firstAccessAt: null,
      accessCount: 0,
      accessLogs: [],
    };

    secureLinkStore.set(token, record);
    return record;
  },

  validateAndAccess(token: string, ip?: string, userAgent?: string): SecureLinkValidationResult {
    const record = secureLinkStore.get(token);

    if (!record) {
      return { status: 'not_found' };
    }

    if (Date.parse(record.expires) <= Date.now()) {
      return { status: 'expired', link: record };
    }

    if (record.oneTime && record.accessCount >= 1) {
      return { status: 'consumed', link: record };
    }

    const accessEntry = buildAccessLog(ip, userAgent);
    record.accessLogs.push(accessEntry);

    if (record.firstAccessAt === null) {
      record.firstAccessAt = accessEntry.time;
    }

    record.accessCount += 1;

    return { status: 'ok', link: record, rfqId: String(record.rfqId) };
  },

  get(token: string): SecureLink | undefined {
    return secureLinkStore.get(token);
  },

  reset(): void {
    secureLinkStore.clear();
  },
};
