import type { RequestHandler } from 'express';
import { SecureLinkSchema, type RFQ } from '@rfq-system/shared';
import { RFQService } from '../services/rfq.service';

const buildFrontendUrl = (token: string): string => {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:9000';
  return `${baseUrl.replace(/\/$/, '')}/rfq/${token}`;
};

const getSecureLinkTTL = (): number => {
  const ttlMinutes = Number.parseInt(process.env.SECURE_LINK_TTL_MINUTES || '60', 10);
  return Number.isFinite(ttlMinutes) && ttlMinutes > 0 ? ttlMinutes * 60 * 1000 : 60 * 60 * 1000;
};

export const createRFQ: RequestHandler = (req, res) => {
  const rfqPayload = req.body as RFQ;
  const record = RFQService.create(rfqPayload);

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

  try {
    const secureLink = RFQService.createSecureLink(id, getSecureLinkTTL());

    const payload = {
      token: secureLink.token,
      expires: new Date(secureLink.expires).toISOString(),
      rfqId: secureLink.id,
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

    res.status(201).json({
      success: true,
      data: {
        ...validation.data,
        url: buildFrontendUrl(validation.data.token),
      },
      message: 'Secure link generated successfully',
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: 'RFQ not found',
    });
  }
};

export const getRFQByToken: RequestHandler = (req, res) => {
  const token = req.params.token?.trim();

  if (!token) {
    res.status(400).json({ error: 'Secure token is required' });
    return;
  }

  const record = RFQService.findByToken(token);

  if (!record) {
    res.status(404).json({ error: 'Invalid or expired token' });
    return;
  }

  if (record.expires < Date.now()) {
    res.status(410).json({ error: 'Secure link has expired' });
    return;
  }

  res.json(record.rfq);
};
