import type { RFQ, RFQRequest, SecureLink } from '@rfq-system/shared';
import { SecureLinkService } from './secureLink.service.js';

export type RFQStatus = 'pending' | 'submitted' | 'processing' | 'completed' | 'cancelled';

export interface SecureLinkDetails {
  token: string;
  expiresAt: number;
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

const createRecord = (payload: RFQRequest): RFQRecord => {
  const id = String(sequence++);
  const timestamp = new Date().toISOString();

  const rfq: RFQ = {
    id,
    company: payload.company,
    contactName: payload.contactName,
    contactEmail: payload.contactEmail,
    contactPhone: payload.contactPhone ?? null,
    createdAt: timestamp,
    items: payload.items.map((item, index) => ({
      id: `${id}-item-${index + 1}`,
      name: item.name,
      quantity: item.quantity,
      details: item.details ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
    attachments: (payload.attachments ?? []).map((attachment, index) => ({
      id: `${id}-attachment-${index + 1}`,
      fileName: attachment.fileName,
      fileUrl: attachment.fileUrl,
      fileSize: attachment.fileSize ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
  };

  const record: RFQRecord = {
    id,
    rfq,
    createdAt: timestamp,
    status: 'pending',
  };

  rfqStore.set(record.id, record);
  return record;
};

export const RFQService = {
  getAll(): RFQRecord[] {
    return Array.from(rfqStore.values());
  },

  create(rfq: RFQRequest): RFQRecord {
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
    const expiresAt = new Date(secureLink.expiresAt).getTime();

    record.secureLink = {
      token: secureLink.token,
      expiresAt,
    };

    tokenIndex.set(secureLink.token, record);

    return {
      id: record.id,
      rfq: record.rfq,
      token: secureLink.token,
      expiresAt,
      metadata: secureLink,
    };
  },

  async findByToken(token: string): Promise<SecureLinkRecord | undefined> {
    const record = tokenIndex.get(token);

    if (!record || !record.secureLink || record.secureLink.token !== token) {
      return undefined;
    }

    return {
      id: record.id,
      rfq: record.rfq,
      ...record.secureLink,
      metadata: await SecureLinkService.get(record.secureLink.token),
    };
  },

  reset(): void {
    rfqStore.clear();
    tokenIndex.clear();
    sequence = 1;
    SecureLinkService.reset();
  },
};
