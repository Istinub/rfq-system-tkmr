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

const serializeRfq = (rfq: SecureLinkRFQ) => ({
  id: rfq.id,
  company: rfq.company,
  contactName: rfq.contactName,
  contactEmail: rfq.contactEmail,
  contactPhone: rfq.contactPhone ?? null,
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

  if (!token) {
    return res.status(400).json(SECURE_TOKEN_REQUIRED_ERROR);
  }

  try {
    const secureLink = await prismaClient.secureLink.findUnique({
      where: { token },
      include: secureLinkInclude,
    });

    if (!secureLink) {
      return res.status(404).json(INVALID_OR_EXPIRED_ERROR);
    }

    if (secureLink.expiresAt <= new Date()) {
      return respondWithInvalidToken(res, 410);
    }

    if (secureLink.oneTime && secureLink.firstAccessAt) {
      return respondWithInvalidToken(res, 410);
    }

    const firstAccessAt = secureLink.firstAccessAt ?? new Date();

    const updatedSecureLink = await prismaClient.secureLink.update({
      where: { id: secureLink.id },
      data: {
        firstAccessAt,
        lastAccessIP: req.ip,
        accessCount: { increment: 1 },
      },
      include: secureLinkInclude,
    });

    return res.json({
      rfq: serializeRfq(updatedSecureLink.rfq),
      secureLink: serializeSecureLink(updatedSecureLink),
    });
  } catch (error: unknown) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
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
