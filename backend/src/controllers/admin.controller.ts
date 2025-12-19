import crypto from 'node:crypto';
import type { RequestHandler } from 'express';
import type { Attachment, RFQ, RFQItem, SecureLink, SecureLinkAccessLog } from '@prisma/client';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { AdminSettingsService } from '../services/adminSettings.service.js';

const RFQS_PER_MONTH_WINDOW = 6;

const ensureIdParam = (value?: string) => value?.trim() ?? '';

type TokenStatus = 'active' | 'expired' | 'disabled';

const nowUtc = () => new Date();

const resolveTokenStatus = (link?: SecureLink | null): TokenStatus => {
  if (!link) {
    return 'disabled';
  }

  if (link.disabled) {
    return 'disabled';
  }

  return link.expiresAt > nowUtc() ? 'active' : 'expired';
};

const serializeToken = (link: SecureLink) => ({
  id: link.id,
  token: link.token,
  rfqId: link.rfqId,
  createdAt: link.createdAt.toISOString(),
  expiresAt: link.expiresAt.toISOString(),
  usageCount: link.accessCount,
  status: resolveTokenStatus(link),
  disabled: link.disabled,
});

const latestSecureLinkInclude = {
  secureLinks: {
    orderBy: { createdAt: 'desc' },
    take: 1,
  },
} satisfies Prisma.RFQInclude;

const rfqDetailsInclude = {
  ...latestSecureLinkInclude,
  items: true,
  attachments: true,
} satisfies Prisma.RFQInclude;

const serializeRfqSummary = (
  rfq: RFQ & { secureLinks: SecureLink[] }
) => {
  const [latestLink] = rfq.secureLinks;
  return {
    id: rfq.id,
    company: rfq.company,
    contactName: rfq.contactName,
    contactEmail: rfq.contactEmail,
    createdAt: rfq.createdAt.toISOString(),
    tokenStatus: resolveTokenStatus(latestLink),
  };
};

const serializeRfqDetails = (
  rfq: RFQ & { secureLinks: SecureLink[]; items: RFQItem[]; attachments: Attachment[] }
) => {
  const [latestLink] = rfq.secureLinks;

  return {
    id: rfq.id,
    company: rfq.company,
    contactName: rfq.contactName,
    contactEmail: rfq.contactEmail,
    contactPhone: rfq.contactPhone ?? null,
    createdAt: rfq.createdAt.toISOString(),
    tokenStatus: resolveTokenStatus(latestLink),
    notes: null,
    items: rfq.items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      details: item.details ?? null,
    })),
    attachments: rfq.attachments.map((attachment) => ({
      id: attachment.id,
      fileName: attachment.fileName,
      fileUrl: attachment.fileUrl,
      fileSize: attachment.fileSize ?? null,
    })),
    secureLink: latestLink
      ? {
          id: latestLink.id,
          token: latestLink.token,
          createdAt: latestLink.createdAt.toISOString(),
          expiresAt: latestLink.expiresAt.toISOString(),
          accessCount: latestLink.accessCount,
          status: resolveTokenStatus(latestLink),
          lastAccessAt: latestLink.firstAccessAt?.toISOString() ?? null,
          disabled: latestLink.disabled,
        }
      : null,
  };
};

const buildRfqsPerMonth = (timestamps: Date[]) => {
  const now = nowUtc();
  const buckets = new Map<string, number>();

  for (let i = RFQS_PER_MONTH_WINDOW - 1; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    buckets.set(key, 0);
  }

  timestamps.forEach((timestamp) => {
    const key = `${timestamp.getUTCFullYear()}-${String(timestamp.getUTCMonth() + 1).padStart(2, '0')}`;
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  });

  return Array.from(buckets.entries()).map(([month, count]) => ({ month, count }));
};

const handleError = (res: Parameters<RequestHandler>[1], error: unknown) => {
  console.error(error);
  return res.status(500).json({ message: 'Internal server error' });
};

export const getAdminStats: RequestHandler = async (_req, res) => {
  try {
    const now = nowUtc();
    const monthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (RFQS_PER_MONTH_WINDOW - 1), 1));

    const [totalRfqs, activeTokens, expiredTokens, disabledTokens, accessAggregate, recentRfqs] = await Promise.all([
      prisma.rFQ.count(),
      prisma.secureLink.count({ where: { disabled: false, expiresAt: { gt: now } } }),
      prisma.secureLink.count({ where: { disabled: false, expiresAt: { lte: now } } }),
      prisma.secureLink.count({ where: { disabled: true } }),
      prisma.secureLink.aggregate({ _sum: { accessCount: true } }),
      prisma.rFQ.findMany({
        where: { createdAt: { gte: monthsAgo } },
        select: { createdAt: true },
      }),
    ]);

    return res.json({
      totalRfqs,
      activeTokens,
      expiredTokens,
      totalAccesses: accessAggregate._sum.accessCount ?? 0,
      rfqsPerMonth: buildRfqsPerMonth(recentRfqs.map((record) => record.createdAt)),
      tokenUsageBreakdown: [
        { label: 'Active', value: activeTokens },
        { label: 'Expired', value: expiredTokens },
        { label: 'Disabled', value: disabledTokens },
      ],
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const listAdminRfqs: RequestHandler = async (_req, res) => {
  try {
    const rfqs = await prisma.rFQ.findMany({
      orderBy: { createdAt: 'desc' },
      include: latestSecureLinkInclude,
    });

    return res.json(rfqs.map(serializeRfqSummary));
  } catch (error) {
    return handleError(res, error);
  }
};

export const getAdminRfqById: RequestHandler = async (req, res) => {
  const id = ensureIdParam(req.params.id);

  if (!id) {
    return res.status(400).json({ message: 'RFQ id is required' });
  }

  try {
    const rfq = await prisma.rFQ.findUnique({ where: { id }, include: rfqDetailsInclude });

    if (!rfq) {
      return res.status(404).json({ message: 'RFQ not found' });
    }

    return res.json(serializeRfqDetails(rfq));
  } catch (error) {
    return handleError(res, error);
  }
};

export const deleteAdminRfq: RequestHandler = async (req, res) => {
  const id = ensureIdParam(req.params.id);

  if (!id) {
    return res.status(400).json({ message: 'RFQ id is required' });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.rFQItem.deleteMany({ where: { rfqId: id } });
      await tx.attachment.deleteMany({ where: { rfqId: id } });
      await tx.secureLink.deleteMany({ where: { rfqId: id } });
      await tx.secureLinkAccessLog.deleteMany({ where: { rfqId: id } });
      await tx.rFQ.delete({ where: { id } });
    });

    return res.json({ message: 'RFQ deleted' });
  } catch (error) {
    return handleError(res, error);
  }
};

export const listAdminTokens: RequestHandler = async (_req, res) => {
  try {
    const tokens = await prisma.secureLink.findMany({ orderBy: { createdAt: 'desc' } });
    return res.json(tokens.map(serializeToken));
  } catch (error) {
    return handleError(res, error);
  }
};

export const disableAdminToken: RequestHandler = async (req, res) => {
  const id = ensureIdParam(req.params.id);

  if (!id) {
    return res.status(400).json({ message: 'Token id is required' });
  }

  try {
    const token = await prisma.secureLink.update({
      where: { id },
      data: { disabled: true, expiresAt: new Date() },
    });

    return res.json(serializeToken(token));
  } catch (error) {
    return handleError(res, error);
  }
};

export const regenerateAdminToken: RequestHandler = async (req, res) => {
  const id = ensureIdParam(req.params.id);

  if (!id) {
    return res.status(400).json({ message: 'Token id is required' });
  }

  try {
    const ttlMs = await AdminSettingsService.getTokenTtlMs();
    const expiresAt = new Date(Date.now() + ttlMs);
    const tokenValue = crypto.randomBytes(32).toString('hex');

    const newToken = await prisma.$transaction(async (tx) => {
      const existing = await tx.secureLink.findUnique({ where: { id } });

      if (!existing) {
        throw new Error('Token not found');
      }

      await tx.secureLink.update({ where: { id }, data: { disabled: true } });

      return tx.secureLink.create({
        data: {
          token: tokenValue,
          rfqId: existing.rfqId,
          expiresAt,
          oneTime: existing.oneTime,
        },
      });
    });

    return res.status(201).json(serializeToken(newToken));
  } catch (error) {
    if (error instanceof Error && error.message === 'Token not found') {
      return res.status(404).json({ message: 'Token not found' });
    }

    return handleError(res, error);
  }
};

const parseLogFilters = (req: Parameters<RequestHandler>[0]): Prisma.SecureLinkAccessLogWhereInput => {
  const where: Prisma.SecureLinkAccessLogWhereInput = {};
  const { startDate, endDate, result, search } = req.query;

  if (typeof startDate === 'string' && startDate.trim()) {
    const existing =
      typeof where.createdAt === 'object' &&
      where.createdAt !== null &&
      !(where.createdAt instanceof Date)
        ? (where.createdAt as Record<string, unknown>)
        : {};
    where.createdAt = {
      ...existing,
      gte: new Date(startDate),
    } as Prisma.DateTimeFilter;
  }

  if (typeof endDate === 'string' && endDate.trim()) {
    const existing =
      typeof where.createdAt === 'object' &&
      where.createdAt !== null &&
      !(where.createdAt instanceof Date)
        ? (where.createdAt as Record<string, unknown>)
        : {};
    where.createdAt = {
      ...existing,
      lte: new Date(endDate),
    } as Prisma.DateTimeFilter;
  }

  const allowedResults: SecureLinkAccessLog['result'][] = ['success', 'expired', 'disabled'];
  if (typeof result === 'string' && allowedResults.includes(result as SecureLinkAccessLog['result'])) {
    where.result = result as SecureLinkAccessLog['result'];
  }

  if (typeof search === 'string' && search.trim()) {
    const term = search.trim();
    where.OR = [
      { token: { contains: term, mode: 'insensitive' } },
      { ip: { contains: term, mode: 'insensitive' } },
      { userAgent: { contains: term, mode: 'insensitive' } },
    ];
  }

  return where;
};

export const listAdminLogs: RequestHandler = async (req, res) => {
  const offset = Number(req.query.offset) || 0;
  const limit = Number(req.query.limit) || 100;

  try {
    const logs = await prisma.secureLinkAccessLog.findMany({
      where: parseLogFilters(req),
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: Math.min(limit, 250),
    });

    return res.json(
      logs.map((log) => ({
        id: log.id,
        timestamp: log.createdAt.toISOString(),
        ip: log.ip ?? null,
        userAgent: log.userAgent ?? null,
        token: log.token,
        rfqId: log.rfqId,
        result: log.result,
      }))
    );
  } catch (error) {
    return handleError(res, error);
  }
};

export const getAdminSettings: RequestHandler = async (_req, res) => {
  try {
    const settings = await AdminSettingsService.getSettings();
    return res.json(settings);
  } catch (error) {
    return handleError(res, error);
  }
};

export const updateAdminSettings: RequestHandler = async (req, res) => {
  try {
    const settings = await AdminSettingsService.updateSettings(req.body ?? {});
    return res.json(settings);
  } catch (error) {
    return handleError(res, error);
  }
};