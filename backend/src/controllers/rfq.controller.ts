import type { RequestHandler } from 'express';
import { v4 as uuid } from 'uuid';
import { generateToken } from '@rfq-system-tkmr/shared/src/utils/generateToken';
import { SecureLinkSchema } from '@rfq-system-tkmr/shared/src/schemas/secureLink.schema';
import type { RFQInput } from '@rfq-system-tkmr/shared/src/schemas/rfq.schema';

interface StoredRFQ extends RFQInput {
  id: string;
  createdAt: string;
  status: 'pending' | 'submitted' | 'processing' | 'completed' | 'cancelled';
}

interface StoredSecureLink {
  token: string;
  expires: string;
  rfqId: string;
}

const rfqStore = new Map<string, StoredRFQ>();
const secureLinkStore = new Map<string, StoredSecureLink>();

const buildFrontendUrl = (token: string): string => {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:9000';
  return `${baseUrl.replace(/\/$/, '')}/rfq/${token}`;
};

const getSecureLinkExpiry = (): string => {
  const ttlMinutes = Number.parseInt(process.env.SECURE_LINK_TTL_MINUTES || '60', 10);
  const ttlMs = Number.isFinite(ttlMinutes) && ttlMinutes > 0 ? ttlMinutes * 60 * 1000 : 60 * 60 * 1000;
  return new Date(Date.now() + ttlMs).toISOString();
};

export const createRFQ: RequestHandler = (req, res) => {
  const rfqPayload = req.body as RFQInput;
  const rfqId = uuid();

  const record: StoredRFQ = {
    id: rfqId,
    ...rfqPayload,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };

  rfqStore.set(rfqId, record);

  res.status(201).json({
    success: true,
    data: record,
    message: 'RFQ created successfully',
  });
};

export const generateSecureLink: RequestHandler = (req, res) => {
  const { id } = req.params;

  if (!id) {
    res.status(400).json({
      success: false,
      error: 'Missing RFQ identifier',
    });
    return;
  }

  if (!rfqStore.has(id)) {
    res.status(404).json({
      success: false,
      error: 'RFQ not found',
    });
    return;
  }

  const payload = {
    token: generateToken(),
    expires: getSecureLinkExpiry(),
    rfqId: id,
  };

  const validation = SecureLinkSchema.safeParse(payload);

  if (!validation.success) {
    res.status(500).json({
      success: false,
      error: 'Unable to generate secure link',
      details: validation.error.issues.map((issue) => issue.message),
    });
    return;
  }

  secureLinkStore.set(id, validation.data);

  res.status(201).json({
    success: true,
    data: {
      ...validation.data,
      url: buildFrontendUrl(validation.data.token),
    },
    message: 'Secure link generated successfully',
  });
};
