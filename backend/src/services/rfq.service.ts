import type { RFQ, SecureLink } from '@rfq-system/shared';
import { SecureLinkService } from './secureLink.service';

export type RFQStatus = 'pending' | 'submitted' | 'processing' | 'completed' | 'cancelled';

export interface SecureLinkDetails {
  token: string;
  expires: number;
}

export interface RFQRecord {
  id: string;
  rfq: RFQ;
  createdAt: string;
  status: RFQStatus;
  secureLink?: SecureLinkDetails;
}

export interface SecureLinkRecord extends SecureLinkDetails {
  id: string;
  rfq: RFQ;
  metadata?: SecureLink;
}

const rfqStore = new Map<string, RFQRecord>();
const tokenIndex = new Map<string, RFQRecord>();

let sequence = 1;

const createRecord = (rfq: RFQ): RFQRecord => {
  const record: RFQRecord = {
    id: String(sequence++),
    rfq,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };

  rfqStore.set(record.id, record);
  return record;
};

export const RFQService = {
  getAll(): RFQRecord[] {
    return Array.from(rfqStore.values());
  },

  create(rfq: RFQ): RFQRecord {
    return createRecord(rfq);
  },

  findById(id: string): RFQRecord | undefined {
    return rfqStore.get(id);
  },

  getById(id: string): RFQRecord | undefined {
    return rfqStore.get(id);
  },

  createSecureLink(rfqId: string, ttlMs: number, options?: { oneTime?: boolean }): SecureLinkRecord {
    const record = rfqStore.get(rfqId);

    if (!record) {
      throw new Error('RFQ not found');
    }

    const secureLink = SecureLinkService.create(record.id, {
      ttlMs,
      oneTime: options?.oneTime ?? false,
    });
    const expires = new Date(secureLink.expires).getTime();

    record.secureLink = {
      token: secureLink.token,
      expires,
    };

    tokenIndex.set(secureLink.token, record);

    return {
      id: record.id,
      rfq: record.rfq,
      token: secureLink.token,
      expires,
      metadata: secureLink,
    };
  },

  findByToken(token: string): SecureLinkRecord | undefined {
    const record = tokenIndex.get(token);

    if (!record || !record.secureLink || record.secureLink.token !== token) {
      return undefined;
    }

    return {
      id: record.id,
      rfq: record.rfq,
      ...record.secureLink,
      metadata: SecureLinkService.get(record.secureLink.token),
    };
  },

  reset(): void {
    rfqStore.clear();
    tokenIndex.clear();
    sequence = 1;
    SecureLinkService.reset();
  },
};
