import type { RequestHandler } from 'express';
import { SecureLinkService } from '../services/secureLink.service';
import { RFQService } from '../services/rfq.service';

const normalizeUserAgent = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join('; ');
  }
  return value?.trim() ? value : undefined;
};

export const getByToken: RequestHandler = (req, res) => {
  const token = req.params.token?.trim();

  if (!token) {
    res.status(400).json({ error: 'Secure token is required' });
    return;
  }

  const userAgent = normalizeUserAgent(req.headers['user-agent']);
  const result = SecureLinkService.validateAndAccess(token, req.ip, userAgent);

  if (result.status === 'not_found') {
    res.status(404).json({ error: 'Invalid or expired token' });
    return;
  }

  if (result.status === 'expired') {
    res.status(410).json({ error: 'Secure link has expired' });
    return;
  }

  if (result.status === 'consumed') {
    res.status(410).json({ error: 'Secure link has already been used' });
    return;
  }

  const rfqRecord = RFQService.getById(result.rfqId);

  if (!rfqRecord) {
    res.status(404).json({ error: 'RFQ not found' });
    return;
  }

  const { token: linkToken, createdAt, expires, oneTime, firstAccessAt, accessCount, accessLogs } = result.link;

  res.json({
    rfq: rfqRecord.rfq,
    link: {
      token: linkToken,
      createdAt,
      expires,
      oneTime,
      firstAccessAt,
      accessCount,
      accessLogs,
    },
  });
};
