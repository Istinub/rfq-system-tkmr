import crypto from 'node:crypto';
import type { RequestHandler } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';

const prismaClient: PrismaClient = prisma;

const TOKEN_BYTES = 32;
const LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SECURE_TOKEN_REQUIRED_ERROR = { error: 'Secure token is required' } as const;
const INVALID_OR_EXPIRED_ERROR = { error: 'Invalid or expired token' } as const;

const secureLinkInclude = {
  rfq: {
    include: {
      items: true,
      attachments: true,
    },
  },
} as const;

type SecureLinkWithRelations = Prisma.SecureLinkGetPayload<{ include: typeof secureLinkInclude }>;
type SecureLinkSerializable = SecureLinkWithRelations;
type SecureLinkRFQ = SecureLinkWithRelations['rfq'];
type SecureLinkRFQItem = SecureLinkRFQ['items'][number];
type SecureLinkAttachment = SecureLinkRFQ['attachments'][number];

const getRfqIdFromRequest = (req: Parameters<RequestHandler>[0]): string => {
  return req.params.rfqId?.trim() || (typeof req.body?.rfqId === 'string' ? req.body.rfqId.trim() : '');
};

const ensureToken = (token: string | undefined): string => token?.trim() ?? '';

const getClientIp = (req: Parameters<RequestHandler>[0]): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0]?.trim() || forwarded.trim();
  }
  if (Array.isArray(forwarded) && forwarded.length) {
    return forwarded[0].trim();
  }

  return req.socket?.remoteAddress ?? req.ip ?? '';
};

const getUserAgent = (req: Parameters<RequestHandler>[0]): string | undefined => {
  const ua = req.headers['user-agent'];
  return typeof ua === 'string' ? ua : Array.isArray(ua) ? ua[0] : undefined;
};

type AccessLogResult = 'success' | 'expired' | 'disabled' | 'invalid';

const sanitizeHex = (value: string) => value.replace(/[^0-9a-f]/gi, '');

const hashTokenPrefix = (token: string, prefixLength = 16): string => {
  const clean = token.trim();
  if (!clean) return '';
  const hash = crypto.createHash('sha256').update(clean).digest('hex');
  return sanitizeHex(hash).slice(0, prefixLength);
};

const logAccessAttempt = async (
  payload: {
    secureLinkId?: string;
    rfqId?: string;
    tokenHashPrefix: string;
    result: AccessLogResult;
    ip?: string;
    userAgent?: string;
  }
) => {
  try {
    const tokenValue = payload.tokenHashPrefix || 'unknown';
    await prismaClient.secureLinkAccessLog.create({
      data: {
        secureLinkId: payload.secureLinkId,
        rfqId: payload.rfqId,
        token: tokenValue,
        result: payload.result,
        ip: payload.ip,
        userAgent: payload.userAgent,
      },
    });
  } catch (error) {
    console.error('Failed to log secure link access', error);
  }
};

const serializeRfq = (rfq: SecureLinkRFQ) => ({
  id: rfq.id,
  publicId: rfq.publicId ?? null,
  company: rfq.company,
  contactName: rfq.tkmrContactName ?? null,
  contactEmail: rfq.tkmrContactEmail ?? null,
  contactPhone: rfq.tkmrContactPhone ?? null,
  createdAt: rfq.createdAt.toISOString(),
  items: rfq.items.map((item: SecureLinkRFQItem) => ({
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    details: item.details ?? null,
  })),
  attachments: rfq.attachments.map((attachment: SecureLinkAttachment) => ({
    id: attachment.id,
    fileName: attachment.fileName,
    fileUrl: attachment.fileUrl,
    fileSize: attachment.fileSize ?? null,
  })),
});

const serializeSecureLink = (secureLink: SecureLinkSerializable) => ({
  token: secureLink.token,
  rfqId: secureLink.rfqId,
  createdAt: secureLink.createdAt.toISOString(),
  expiresAt: secureLink.expiresAt.toISOString(),
  firstAccessAt: secureLink.firstAccessAt?.toISOString() ?? null,
  lastAccessIP: secureLink.lastAccessIP ?? null,
  oneTime: secureLink.oneTime,
  accessCount: secureLink.accessCount,
});

const parseTtl = (candidate: unknown): number => {
  if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0) {
    return candidate;
  }

  return LINK_TTL_MS;
};

const parseOneTime = (candidate: unknown): boolean => candidate === true;

const respondWithInvalidToken = (res: Parameters<RequestHandler>[1], status: 404 | 410) => {
  return res.status(status).json(INVALID_OR_EXPIRED_ERROR);
};

export const generateSecureLink: RequestHandler = async (req, res) => {
  const rfqId = getRfqIdFromRequest(req);

  if (!rfqId) {
    return res.status(400).json({ error: 'rfqId is required' });
  }

  try {
    const rfq = await prismaClient.rFQ.findUnique({
      where: { id: rfqId },
      select: {
        tkmrContactName: true,
        tkmrContactEmail: true,
        tkmrContactPhone: true,
      },
    });

    const tkmrContactName = rfq?.tkmrContactName?.trim() ?? '';
    const tkmrContactEmail = rfq?.tkmrContactEmail?.trim() ?? '';
    const tkmrContactPhone = rfq?.tkmrContactPhone?.trim() ?? '';

    if (!tkmrContactName || !tkmrContactEmail || !tkmrContactPhone) {
      return res.status(400).json({
        message: 'TKMR contact details are required before generating a secure link.',
      });
    }

    const token = crypto.randomBytes(TOKEN_BYTES).toString('hex');
    const ttlMs = parseTtl(req.body?.ttlMs);
    const expiresAt = new Date(Date.now() + ttlMs);
    const oneTime = parseOneTime(req.body?.oneTime);

    const secureLink = await prismaClient.secureLink.create({
      data: {
        token,
        rfq: { connect: { id: rfqId } },
        expiresAt,
        oneTime,
      },
      include: secureLinkInclude,
    });

    return res.status(201).json({
      secureLink: serializeSecureLink(secureLink),
    });
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return res.status(404).json({ error: 'RFQ not found' });
    }

    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const resolveSecureLinkByToken: RequestHandler = async (req, res) => {
  const token = ensureToken(req.params.token);
  const tokenHashPrefix = hashTokenPrefix(token);
  let result: AccessLogResult = 'invalid';
  let secureLinkId: string | undefined;
  let rfqId: string | undefined;

  if (!token) {
    await logAccessAttempt({
      secureLinkId,
      rfqId,
      tokenHashPrefix,
      result,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
    });
    return res.status(400).json(SECURE_TOKEN_REQUIRED_ERROR);
  }

  try {
    const secureLink = await prismaClient.secureLink.findUnique({
      where: { token },
      include: secureLinkInclude,
    });

    if (!secureLink) {
      result = 'invalid';
      return res.status(404).json(INVALID_OR_EXPIRED_ERROR);
    }

    secureLinkId = secureLink.id;
    rfqId = secureLink.rfqId;
    console.log('[GET /api/secure-links/:token] loaded', {
      token,
      status: secureLink.disabled ? 'disabled' : secureLink.expiresAt <= new Date() ? 'expired' : 'active',
      rfqId: secureLink.rfqId,
      rfqPublicId: secureLink.rfq?.publicId ?? null,
      tkmrContactName: secureLink.rfq?.tkmrContactName ?? null,
      tkmrContactEmail: secureLink.rfq?.tkmrContactEmail ?? null,
      tkmrContactPhone: secureLink.rfq?.tkmrContactPhone ?? null,
    });

    const tkmrContactName = secureLink.rfq?.tkmrContactName?.trim() ?? '';
    const tkmrContactEmail = secureLink.rfq?.tkmrContactEmail?.trim() ?? '';
    const tkmrContactPhone = secureLink.rfq?.tkmrContactPhone?.trim() ?? '';

    if (!tkmrContactName || !tkmrContactEmail || !tkmrContactPhone) {
      return res.status(409).json({
        message: 'TKMR contact details are not configured for this RFQ yet. Please contact TKMR.',
      });
    }

    if (secureLink.disabled) {
      result = 'disabled';
      return respondWithInvalidToken(res, 410);
    }

    if (secureLink.expiresAt <= new Date()) {
      result = 'expired';
      return respondWithInvalidToken(res, 410);
    }

    if (secureLink.oneTime && secureLink.firstAccessAt) {
      result = 'disabled';
      return respondWithInvalidToken(res, 410);
    }

    const firstAccessAt = secureLink.firstAccessAt ?? new Date();

    const updatedSecureLink = await prismaClient.secureLink.update({
      where: { id: secureLink.id },
      data: {
        firstAccessAt,
        lastAccessIP: getClientIp(req),
        accessCount: { increment: 1 },
      },
      include: secureLinkInclude,
    });

    console.log('[GET /api/secure-links/:token] updated', {
      token,
      status: updatedSecureLink.disabled
        ? 'disabled'
        : updatedSecureLink.expiresAt <= new Date()
          ? 'expired'
          : 'active',
      rfqId: updatedSecureLink.rfqId,
      rfqPublicId: updatedSecureLink.rfq?.publicId ?? null,
      tkmrContactName: updatedSecureLink.rfq?.tkmrContactName ?? null,
      tkmrContactEmail: updatedSecureLink.rfq?.tkmrContactEmail ?? null,
      tkmrContactPhone: updatedSecureLink.rfq?.tkmrContactPhone ?? null,
    });

    result = 'success';

    return res.json({
      rfq: updatedSecureLink.rfq ? serializeRfq(updatedSecureLink.rfq) : null,
      secureLink: serializeSecureLink(updatedSecureLink),
    });
  } catch (error: unknown) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    try {
      await logAccessAttempt({
        secureLinkId,
        rfqId,
        tokenHashPrefix,
        result,
        ip: getClientIp(req),
        userAgent: getUserAgent(req),
      });
    } catch {
      // swallow logging failures
    }
  }
};

export const invalidateSecureLink: RequestHandler = async (req, res) => {
  const token = ensureToken(req.params.token);

  if (!token) {
    return res.status(400).json({ error: 'token is required' });
  }

  try {
    const secureLink = await prismaClient.secureLink.update({
      where: { token },
      data: {
        expiresAt: new Date(),
      },
      include: secureLinkInclude,
    });

    return res.json({ secureLink: serializeSecureLink(secureLink) });
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return res.status(404).json({ error: 'Secure link not found' });
    }

    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
