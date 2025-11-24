import { generateToken } from '@rfq-system/shared/backend';
import type { RFQ } from '@rfq-system/shared';

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

const upsertSecureLink = (record: RFQRecord, ttlMs: number): SecureLinkRecord => {
  if (record.secureLink) {
    tokenIndex.delete(record.secureLink.token);
  }

  const token = generateToken();
  const secureLink: SecureLinkDetails = {
    token,
    expires: Date.now() + ttlMs,
  };

  record.secureLink = secureLink;
  tokenIndex.set(token, record);

  return {
    id: record.id,
    rfq: record.rfq,
    ...secureLink,
  };
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

  createSecureLink(rfqId: string, ttlMs: number): SecureLinkRecord {
    const record = rfqStore.get(rfqId);

    if (!record) {
      throw new Error('RFQ not found');
    }

    return upsertSecureLink(record, ttlMs);
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
    };
  },

  reset(): void {
    rfqStore.clear();
    tokenIndex.clear();
    sequence = 1;
  },
};
