import { RFQInput } from '@rfq-system-tkmr/shared/src/schemas/rfq.schema';
import { generateToken } from '@rfq-system-tkmr/shared/src/utils/generateToken';

export interface StoredRFQ extends RFQInput {
  id: string;
  createdAt: string;
}

export interface SecureLinkRecord {
  token: string;
  expires: string;
  rfqId: string;
}

let nextId = 1;

export const rfqDB: StoredRFQ[] = [];

export const RFQService = {
  create(rfq: RFQInput): StoredRFQ {
    const entry: StoredRFQ = {
      id: String(nextId++),
      createdAt: new Date().toISOString(),
      ...rfq,
    };

    rfqDB.push(entry);

    return entry;
  },

  createSecureLink(rfqId: string): SecureLinkRecord {
    const exists = rfqDB.some((rfq) => rfq.id === rfqId);

    if (!exists) {
      throw new Error('RFQ not found');
    }

    return {
      token: generateToken(),
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      rfqId,
    };
  },
};
