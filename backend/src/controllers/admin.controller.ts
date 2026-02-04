import crypto, { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import type { Attachment, Quotation, QuotationLine, RFQ, RFQItem, SecureLink, SecureLinkAccessLog, SubmissionToken } from '@prisma/client';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { AdminSettingsService } from '../services/adminSettings.service.js';
import { renderQuotationPdf } from '../services/quotePdf.service.js';
import { buildQuotationFolderName, uploadPdfBufferToFolder } from '../services/driveQuotationStorage.service.js';
import { getDriveQuotationsFolderId } from '../lib/googleDrive.js';
import { ensureFolder } from '../services/driveRfqStorage.service.js';
import { getDrive } from '../lib/googleDrive.js';

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

const sanitizeHex = (value: string) => value.replace(/[^0-9a-f]/gi, '');

const buildTokenHash = (token: string) => sanitizeHex(crypto.createHash('sha256').update(token).digest('hex'));

const buildTokenPreview = (tokenHash: string) => {
  const clean = sanitizeHex(tokenHash);
  if (clean.length <= 12) {
    return clean;
  }
  return `${clean.slice(0, 8)}…${clean.slice(-8)}`;
};

const serializeToken = (link: SecureLink & { rfq?: { publicId: string | null } | null }) => {
  const tokenHash = buildTokenHash(link.token);
  return {
    id: link.id,
    tokenHash,
    tokenPreview: buildTokenPreview(tokenHash),
    rfqId: link.rfqId,
    rfqPublicId: link.rfq?.publicId ?? null,
    createdAt: link.createdAt.toISOString(),
    expiresAt: link.expiresAt.toISOString(),
    usageCount: link.accessCount,
    status: resolveTokenStatus(link),
    disabled: link.disabled,
  };
};

const isoOrNull = (value?: Date | null) => (value ? value.toISOString() : null);

const latestSecureLinkInclude = {
  secureLinks: {
    orderBy: { createdAt: 'desc' },
    take: 1,
  },
} satisfies Prisma.RFQInclude;

const submissionTokenSelect = {
  id: true,
  createdAt: true,
  expiresAt: true,
  maxUses: true,
  uses: true,
  revokedAt: true,
} satisfies Prisma.SubmissionTokenSelect;

type SubmissionTokenMeta = Pick<SubmissionToken, 'id' | 'createdAt' | 'expiresAt' | 'maxUses' | 'uses' | 'revokedAt'>;

const rfqSummaryInclude = {
  ...latestSecureLinkInclude,
  submittedByToken: { select: submissionTokenSelect },
} satisfies Prisma.RFQInclude;

const rfqDetailsInclude = {
  ...latestSecureLinkInclude,
  items: true,
  attachments: true,
  submittedByToken: { select: submissionTokenSelect },
} satisfies Prisma.RFQInclude;

const serializeRfqSummary = (
  rfq: RFQ & { secureLinks: SecureLink[]; submittedByToken?: SubmissionTokenMeta | null }
) => {
  const [latestLink] = rfq.secureLinks;
  return {
    id: rfq.id,
    publicId: rfq.publicId ?? null,
    rfqNo: rfq.rfqNo,
    company: rfq.company,
    contactName: rfq.contactName,
    contactEmail: rfq.contactEmail,
    createdAt: rfq.createdAt.toISOString(),
    submittedByType: rfq.submittedByType,
    submittedByTokenId: rfq.submittedByTokenId ?? null,
    submittedByToken: rfq.submittedByToken
      ? {
          id: rfq.submittedByToken.id,
          createdAt: isoOrNull(rfq.submittedByToken.createdAt),
          expiresAt: isoOrNull(rfq.submittedByToken.expiresAt),
          maxUses: rfq.submittedByToken.maxUses,
          uses: rfq.submittedByToken.uses,
          revokedAt: isoOrNull(rfq.submittedByToken.revokedAt),
        }
      : null,
    tokenStatus: resolveTokenStatus(latestLink),
  };
};

const serializeRfqDetails = (
  rfq: RFQ & {
    secureLinks: SecureLink[];
    items: RFQItem[];
    attachments: Attachment[];
    submittedByToken?: SubmissionTokenMeta | null;
  }
) => {
  const [latestLink] = rfq.secureLinks;

  return {
    id: rfq.id,
    publicId: rfq.publicId ?? null,
    rfqNo: rfq.rfqNo,
    company: rfq.company,
    contactName: rfq.contactName,
    contactEmail: rfq.contactEmail,
    contactPhone: rfq.contactPhone ?? null,
    tkmrContactName: rfq.tkmrContactName ?? null,
    tkmrContactEmail: rfq.tkmrContactEmail ?? null,
    tkmrContactPhone: rfq.tkmrContactPhone ?? null,
    clientContactName: rfq.clientContactName ?? null,
    clientContactEmail: rfq.clientContactEmail ?? null,
    clientContactPhone: rfq.clientContactPhone ?? null,
    createdAt: rfq.createdAt.toISOString(),
    submittedByType: rfq.submittedByType,
    submittedByTokenId: rfq.submittedByTokenId ?? null,
    submittedByToken: rfq.submittedByToken
      ? {
          id: rfq.submittedByToken.id,
          createdAt: isoOrNull(rfq.submittedByToken.createdAt),
          expiresAt: isoOrNull(rfq.submittedByToken.expiresAt),
          maxUses: rfq.submittedByToken.maxUses,
          uses: rfq.submittedByToken.uses,
          revokedAt: isoOrNull(rfq.submittedByToken.revokedAt),
        }
      : null,
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
          createdAt: isoOrNull(latestLink.createdAt),
          expiresAt: isoOrNull(latestLink.expiresAt),
          accessCount: latestLink.accessCount,
          status: resolveTokenStatus(latestLink),
          lastAccessAt: isoOrNull(latestLink.firstAccessAt),
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

const buildQuotationsPerMonth = (timestamps: Date[]) => buildRfqsPerMonth(timestamps);

const handleError = (res: Parameters<RequestHandler>[1], error: unknown) => {
  console.error(error);
  return res.status(500).json({ message: 'Internal server error' });
};

export const listAdminQuotations: RequestHandler = async (req, res) => {
  const id = ensureIdParam(req.params.id);

  if (!id) {
    return res.status(400).json({ message: 'RFQ id is required' });
  }

  try {
    const quotations = await prisma.quotation.findMany({
      where: { rfqId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        vendorName: true,
        quotationLink: true,
        method: true,
        createdAt: true,
      },
    });

    return res.json(
      quotations.map((q) => ({
        vendorName: q.vendorName,
        quotationLink: q.quotationLink,
        method: q.method,
        createdAt: q.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    return handleError(res, error);
  }
};

const serializeAdminQuotation = (
  quotation: Quotation & { rfq: { publicId: string | null; company: string }; lines: QuotationLine[] }
) => {
  return {
    id: quotation.id,
    rfq: {
      publicId: quotation.rfq.publicId ?? null,
      company: quotation.rfq.company,
    },
    vendorName: quotation.vendorName,
    contactName: quotation.contactName ?? null,
    contactEmail: quotation.contactEmail ?? null,
    contactPhone: quotation.contactPhone ?? null,
    currency: quotation.currency,
    notes: quotation.notes ?? null,
    quotationLink: quotation.quotationLink,
    method: quotation.method,
    status: quotation.status,
    driveFileId: quotation.driveFileId ?? null,
    driveFolderId: quotation.driveFolderId ?? null,
    createdAt: quotation.createdAt.toISOString(),
    updatedAt: quotation.updatedAt.toISOString(),
    lines: quotation.lines.map((line) => ({
      id: line.id,
      name: line.name,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal,
      details: line.details ?? null,
    })),
  };
};


export const listAdminQuotationIndex: RequestHandler = async (_req, res) => {
  try {
    const quotations = await prisma.quotation.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        vendorName: true,
        quotationLink: true,
        currency: true,
        status: true,
        method: true,
        createdAt: true,
        updatedAt: true,
        rfq: { select: { publicId: true, company: true } },
      },
    });

    return res.json(
      quotations.map((quotation) => ({
        id: quotation.id,
        rfq: {
          publicId: quotation.rfq.publicId ?? null,
          company: quotation.rfq.company,
        },
        vendorName: quotation.vendorName,
        quotationLink: quotation.quotationLink,
        currency: quotation.currency,
        status: quotation.status,
        method: quotation.method,
        createdAt: quotation.createdAt.toISOString(),
        updatedAt: quotation.updatedAt.toISOString(),
      }))
    );
  } catch (err) {
    const errorId = randomUUID();
    console.error('[GET /api/admin/quotations]', {
      errorId,
      name: (err as any)?.name,
      message: (err as any)?.message,
      stack: (err as any)?.stack,
      prismaCode: err instanceof Prisma.PrismaClientKnownRequestError ? err.code : undefined,
      prismaMeta: err instanceof Prisma.PrismaClientKnownRequestError ? err.meta : undefined,
    });
    return res.status(500).json({ errorId, message: 'Internal server error' });
  }
};

export const getAdminQuotationById: RequestHandler = async (req, res) => {
  const id = ensureIdParam(req.params.id);
  if (!id) {
    return res.status(400).json({ message: 'Quotation id is required' });
  }

  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        rfq: { select: { publicId: true, company: true } },
        lines: true,
      },
    });

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    return res.json(serializeAdminQuotation(quotation));
  } catch (error) {
    return handleError(res, error);
  }
};

const normalizeStatus = (value: unknown): Quotation['status'] | undefined => {
  if (typeof value !== 'string') return undefined;
  const upper = value.trim().toUpperCase();
  if (upper === 'RECEIVED' || upper === 'REVISED' || upper === 'APPROVED' || upper === 'REJECTED' || upper === 'CUSTOMER_ACCEPTED') {
    return upper as Quotation['status'];
  }
  return undefined;
};

export const updateAdminQuotationStatus: RequestHandler = async (req, res) => {
  const id = ensureIdParam(req.params.id);
  if (!id) {
    return res.status(400).json({ message: 'Quotation id is required' });
  }

  const payload = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};
  const status = normalizeStatus(payload.status);
  const reason = typeof payload.reason === 'string' ? payload.reason.trim() : undefined;

  if (!status || !['APPROVED', 'REJECTED', 'CUSTOMER_ACCEPTED'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        rfq: { select: { publicId: true, company: true, contactEmail: true, contactName: true } },
        lines: true,
      },
    });

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    if ((status === 'APPROVED' || status === 'REJECTED') && quotation.status !== 'RECEIVED') {
      return res.status(409).json({
        message: status === 'APPROVED'
          ? 'Only RECEIVED quotations can be approved'
          : 'Only RECEIVED quotations can be rejected',
      });
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data: { status },
      include: {
        rfq: { select: { publicId: true, company: true } },
        lines: true,
      },
    });

    const emailed = { vendor: false, rfqContact: false };
    return res.json({
      updated: true,
      quotation: serializeAdminQuotation(updated),
      emailed,
      emailedWarning: null,
    });
  } catch (error) {
    const errorId = randomUUID();
    console.error('[PATCH /api/admin/quotations/:id/status]', {
      errorId,
      name: (error as any)?.name,
      message: (error as any)?.message,
      stack: (error as any)?.stack,
      prismaCode: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined,
      prismaMeta: error instanceof Prisma.PrismaClientKnownRequestError ? error.meta : undefined,
    });
    return res.status(500).json({ errorId, message: 'Internal server error' });
  }
};

export const updateAdminQuotationById: RequestHandler = async (req, res) => {
  const id = ensureIdParam(req.params.id);
  if (!id) {
    return res.status(400).json({ message: 'Quotation id is required' });
  }

  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        rfq: { select: { publicId: true, company: true } },
        lines: true,
      },
    });

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    const payload = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};
    const updateData: Prisma.QuotationUpdateInput = {};

    if (typeof payload.vendorName === 'string') updateData.vendorName = payload.vendorName.trim();
    if (typeof payload.contactName === 'string') updateData.contactName = payload.contactName.trim() || null;
    if (payload.contactName === null) updateData.contactName = null;
    if (typeof payload.contactEmail === 'string') updateData.contactEmail = payload.contactEmail.trim() || null;
    if (payload.contactEmail === null) updateData.contactEmail = null;
    if (typeof payload.contactPhone === 'string') updateData.contactPhone = payload.contactPhone.trim() || null;
    if (payload.contactPhone === null) updateData.contactPhone = null;
    if (typeof payload.currency === 'string') updateData.currency = payload.currency.trim() || quotation.currency;
    if (typeof payload.notes === 'string') updateData.notes = payload.notes.trim() || null;
    if (payload.notes === null) updateData.notes = null;
    const status = normalizeStatus(payload.status);
    if (status) updateData.status = status;

    const linesPayload = Array.isArray(payload.lines) ? payload.lines : null;

    await prisma.$transaction(async (tx) => {
      if (Object.keys(updateData).length > 0) {
        await tx.quotation.update({ where: { id }, data: updateData });
      }

      if (linesPayload) {
        for (const entry of linesPayload) {
          if (!entry || typeof entry !== 'object') continue;
          const record = entry as { id?: string; unitPrice?: number };
          if (!record.id) continue;
          const existing = quotation.lines.find((line) => line.id === record.id);
          if (!existing) continue;
          const unitPrice = typeof record.unitPrice === 'number' ? record.unitPrice : existing.unitPrice;
          const lineTotal = existing.quantity * unitPrice;
          await tx.quotationLine.update({
            where: { id: record.id },
            data: { unitPrice, lineTotal },
          });
        }
      }
    });

    const refreshed = await prisma.quotation.findUnique({
      where: { id },
      include: {
        rfq: { select: { publicId: true, company: true } },
        lines: true,
      },
    });

    if (!refreshed) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    return res.json(serializeAdminQuotation(refreshed));
  } catch (error) {
    return handleError(res, error);
  }
};

type QuotationLinePayload = {
  id?: string;
  name?: string;
  quantity?: number;
  unitPrice?: number;
  details?: string | null;
  rfqItemId?: string;
};

const normalizeLinesPayload = (
  payload: QuotationLinePayload[] | null,
  existing: QuotationLine[]
): Array<{ name: string; quantity: number; unitPrice: number; lineTotal: number; details?: string | null }> | null => {
  if (!payload) return null;
  const results: Array<{ name: string; quantity: number; unitPrice: number; lineTotal: number; details?: string | null }> = [];
  for (const entry of payload) {
    if (!entry || typeof entry !== 'object') continue;
    const existingLine = entry.id ? existing.find((line) => line.id === entry.id) : undefined;
    const name = (entry.name ?? existingLine?.name ?? '').trim();
    const quantity = typeof entry.quantity === 'number' ? entry.quantity : existingLine?.quantity ?? 0;
    const unitPrice = typeof entry.unitPrice === 'number' ? entry.unitPrice : existingLine?.unitPrice ?? 0;
    const details = typeof entry.details === 'string' ? entry.details : existingLine?.details ?? null;
    if (!name || Number.isNaN(quantity) || Number.isNaN(unitPrice)) continue;
    results.push({
      name,
      quantity,
      unitPrice,
      lineTotal: quantity * unitPrice,
      details,
    });
  }

  return results;
};

export const updateAdminQuotation: RequestHandler = async (req, res) => {
  const id = ensureIdParam(req.params.id);
  if (!id) {
    return res.status(400).json({ message: 'Quotation id is required' });
  }

  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        rfq: { select: { publicId: true, company: true } },
        lines: true,
      },
    });

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    const payload = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};
    const updateData: Prisma.QuotationUpdateInput = {};

    const vendorName = typeof payload.vendorName === 'string' ? payload.vendorName.trim() : undefined;
    const contactName = typeof payload.contactName === 'string' ? payload.contactName.trim() : undefined;
    const contactEmail = typeof payload.contactEmail === 'string' ? payload.contactEmail.trim() : undefined;
    const contactPhone = typeof payload.contactPhone === 'string' ? payload.contactPhone.trim() : undefined;
    const currency = typeof payload.currency === 'string' ? payload.currency.trim() : undefined;
    const notes = typeof payload.notes === 'string' ? payload.notes.trim() : undefined;
    const status = normalizeStatus(payload.status);

    if (vendorName !== undefined) updateData.vendorName = vendorName;
    if (contactName !== undefined) updateData.contactName = contactName || null;
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail || null;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone || null;
    if (currency !== undefined) updateData.currency = currency || quotation.currency;
    if (notes !== undefined) updateData.notes = notes || null;

    const linesPayload = Array.isArray(payload.lines) ? (payload.lines as QuotationLinePayload[]) : null;
    const normalizedLines = normalizeLinesPayload(linesPayload, quotation.lines);

    if (!status && (vendorName !== undefined || contactName !== undefined || contactEmail !== undefined || contactPhone !== undefined || currency !== undefined || notes !== undefined || normalizedLines)) {
      updateData.status = 'REVISED';
    }

    if (status) {
      updateData.status = status;
    }

    await prisma.$transaction(async (tx) => {
      if (Object.keys(updateData).length > 0) {
        await tx.quotation.update({ where: { id }, data: updateData });
      }

      if (normalizedLines) {
        await tx.quotationLine.deleteMany({ where: { quotationId: id } });
        if (normalizedLines.length) {
          await tx.quotationLine.createMany({
            data: normalizedLines.map((line) => ({
              quotationId: id,
              name: line.name,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              lineTotal: line.lineTotal,
              details: line.details ?? null,
            })),
          });
        }
      }
    });

    const refreshed = await prisma.quotation.findUnique({
      where: { id },
      include: {
        rfq: { select: { publicId: true, company: true } },
        lines: true,
      },
    });

    if (!refreshed) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    return res.json({ quotation: serializeAdminQuotation(refreshed) });
  } catch (err) {
    const errorId = randomUUID();
    console.error('[PATCH /api/admin/quotations/:id]', {
      errorId,
      name: (err as any)?.name,
      message: (err as any)?.message,
      stack: (err as any)?.stack,
      prismaCode: err instanceof Prisma.PrismaClientKnownRequestError ? err.code : undefined,
      prismaMeta: err instanceof Prisma.PrismaClientKnownRequestError ? err.meta : undefined,
    });
    return res.status(500).json({ errorId, message: 'Internal server error' });
  }
};

export const approveAdminQuotation: RequestHandler = async (req, res) => {
  const id = ensureIdParam(req.params.id);
  if (!id) {
    return res.status(400).json({ message: 'Quotation id is required' });
  }

  try {
    const existing = await prisma.quotation.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    if (existing.status !== 'RECEIVED') {
      return res.status(409).json({ message: 'Only RECEIVED quotations can be approved' });
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data: { status: 'APPROVED' },
      include: {
        rfq: { select: { id: true, publicId: true, company: true, contactEmail: true, contactName: true } },
        lines: true,
      },
    });
    return res.json({ quotation: serializeAdminQuotation(updated), emailWarning: null });
  } catch (error) {
    const errorId = randomUUID();
    console.error('[PATCH /api/admin/quotations/:id/approve]', {
      errorId,
      name: (error as any)?.name,
      message: (error as any)?.message,
      stack: (error as any)?.stack,
      prismaCode: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined,
      prismaMeta: error instanceof Prisma.PrismaClientKnownRequestError ? error.meta : undefined,
    });
    return res.status(500).json({ errorId, message: 'Internal server error' });
  }
};

export const rejectAdminQuotation: RequestHandler = async (req, res) => {
  const id = ensureIdParam(req.params.id);
  if (!id) {
    return res.status(400).json({ message: 'Quotation id is required' });
  }

  try {
    const existing = await prisma.quotation.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    if (existing.status !== 'RECEIVED') {
      return res.status(409).json({ message: 'Only RECEIVED quotations can be rejected' });
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data: { status: 'REJECTED' },
      include: {
        rfq: { select: { id: true, publicId: true, company: true, contactEmail: true, contactName: true } },
        lines: true,
      },
    });
    return res.json({ quotation: serializeAdminQuotation(updated), emailWarning: null });
  } catch (error) {
    const errorId = randomUUID();
    console.error('[PATCH /api/admin/quotations/:id/reject]', {
      errorId,
      name: (error as any)?.name,
      message: (error as any)?.message,
      stack: (error as any)?.stack,
      prismaCode: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined,
      prismaMeta: error instanceof Prisma.PrismaClientKnownRequestError ? error.meta : undefined,
    });
    return res.status(500).json({ errorId, message: 'Internal server error' });
  }
};

export const markCustomerAcceptedAdminQuotation: RequestHandler = async (req, res) => {
  const id = ensureIdParam(req.params.id);
  if (!id) {
    return res.status(400).json({ message: 'Quotation id is required' });
  }

  try {
    const updated = await prisma.quotation.update({
      where: { id },
      data: { status: 'CUSTOMER_ACCEPTED' },
      include: {
        rfq: { select: { id: true, publicId: true, company: true, contactEmail: true, contactName: true } },
        lines: true,
      },
    });
    return res.json({ quotation: serializeAdminQuotation(updated), emailWarning: null });
  } catch (error) {
    const errorId = randomUUID();
    console.error('[PATCH /api/admin/quotations/:id/customer-accepted]', {
      errorId,
      name: (error as any)?.name,
      message: (error as any)?.message,
      stack: (error as any)?.stack,
      prismaCode: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined,
      prismaMeta: error instanceof Prisma.PrismaClientKnownRequestError ? error.meta : undefined,
    });
    return res.status(500).json({ errorId, message: 'Internal server error' });
  }
};

export const deleteAdminQuotation: RequestHandler = async (req, res) => {
  const id = ensureIdParam(req.params.id);
  if (!id) {
    return res.status(400).json({ message: 'Quotation id is required' });
  }

  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      select: {
        id: true,
        driveFileId: true,
      },
    });

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.quotationLine.deleteMany({ where: { quotationId: id } });
      await tx.quotation.delete({ where: { id } });
    });

    if (quotation.driveFileId) {
      try {
        const drive = getDrive();
        await drive.files.delete({ fileId: quotation.driveFileId, supportsAllDrives: true });
      } catch (driveError) {
        console.error('[Drive delete failed]', {
          quotationId: id,
          message: driveError instanceof Error ? driveError.message : String(driveError),
        });
      }
    }

    return res.json({ message: 'Quotation deleted' });
  } catch (err) {
    const errorId = randomUUID();
    console.error('[DELETE /api/admin/quotations/:id]', {
      errorId,
      name: (err as any)?.name,
      message: (err as any)?.message,
      stack: (err as any)?.stack,
      prismaCode: err instanceof Prisma.PrismaClientKnownRequestError ? err.code : undefined,
      prismaMeta: err instanceof Prisma.PrismaClientKnownRequestError ? err.meta : undefined,
    });
    return res.status(500).json({ errorId, message: 'Internal server error' });
  }
};

const formatTimestamp = (date: Date): string => {
  const pad = (value: number) => String(value).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}${month}${day}-${hours}${minutes}`;
};

export const regenerateAdminQuotationPdf: RequestHandler = async (req, res) => {
  const id = ensureIdParam(req.params.id);
  if (!id) {
    return res.status(400).json({ message: 'Quotation id is required' });
  }

  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        rfq: { select: { id: true, publicId: true, company: true } },
        lines: true,
      },
    });

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    const rfqPublicId = quotation.rfq.publicId;
    if (!rfqPublicId) {
      return res.status(400).json({ message: 'RFQ public id is required to regenerate PDF' });
    }

    const pdfBuffer = await renderQuotationPdf({
      rfqPublicId,
      requestingCompanyName: quotation.rfq.company,
      vendorName: quotation.vendorName,
      vendorContact: {
        name: quotation.contactName ?? undefined,
        email: quotation.contactEmail ?? undefined,
        phone: quotation.contactPhone ?? undefined,
      },
      currency: quotation.currency,
      items: quotation.lines.map((line) => ({
        name: line.name,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
        details: line.details ?? undefined,
      })),
      notes: quotation.notes ?? undefined,
      status: quotation.status,
    });

    const folderId = quotation.driveFolderId
      ? quotation.driveFolderId
      : (await ensureFolder(
          getDriveQuotationsFolderId(),
          buildQuotationFolderName(rfqPublicId, quotation.vendorName)
        )).id;
    const fileName = `Quotation_${formatTimestamp(new Date())}.pdf`;
    const makePublic = process.env.DRIVE_PUBLIC_FILES === 'true';
    const uploadResult = await uploadPdfBufferToFolder({
      folderId,
      fileName,
      pdfBuffer,
      makePublic,
    });

    const updated = await prisma.quotation.update({
      where: { id },
      data: {
        quotationLink: uploadResult.webViewLink,
        driveFileId: uploadResult.driveFileId,
        driveFolderId: folderId,
      },
      include: {
        rfq: { select: { id: true, publicId: true, company: true } },
        lines: true,
      },
    });

    return res.json(serializeAdminQuotation(updated));
  } catch (error) {
    return handleError(res, error);
  }
};

export const getAdminStats: RequestHandler = async (_req, res) => {
  try {
    const now = nowUtc();
    const monthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (RFQS_PER_MONTH_WINDOW - 1), 1));

    const [
      totalRfqs,
      activeTokens,
      expiredTokens,
      disabledTokens,
      accessAggregate,
      recentRfqs,
      totalQuotations,
      quotationStatusGroups,
      recentQuotations,
    ] = await Promise.all([
      prisma.rFQ.count(),
      prisma.secureLink.count({ where: { disabled: false, expiresAt: { gt: now } } }),
      prisma.secureLink.count({ where: { disabled: false, expiresAt: { lte: now } } }),
      prisma.secureLink.count({ where: { disabled: true } }),
      prisma.secureLink.aggregate({ _sum: { accessCount: true } }),
      prisma.rFQ.findMany({
        where: { createdAt: { gte: monthsAgo } },
        select: { createdAt: true },
      }),
      prisma.quotation.count(),
      prisma.quotation.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      prisma.quotation.findMany({
        where: { createdAt: { gte: monthsAgo } },
        select: { createdAt: true },
      }),
    ]);

    const statusLabels = [
      'RECEIVED',
      'REVISED',
      'APPROVED',
      'REJECTED',
      'CUSTOMER_ACCEPTED',
    ] as const;

    const statusCounts = new Map<string, number>();
    quotationStatusGroups.forEach((group) => {
      statusCounts.set(group.status, group._count._all ?? 0);
    });

    const quotationsByStatus = statusLabels.map((label) => ({
      label,
      value: statusCounts.get(label) ?? 0,
    }));

    return res.json({
      totalRfqs,
      activeTokens,
      expiredTokens,
      totalAccesses: accessAggregate._sum.accessCount ?? 0,
      rfqsPerMonth: buildRfqsPerMonth(recentRfqs.map((record) => record.createdAt)),
      totalQuotations,
      quotationsByStatus,
      quotationsPerMonth: buildQuotationsPerMonth(recentQuotations.map((record) => record.createdAt)),
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
      include: rfqSummaryInclude,
    });

    return res.json(rfqs.map(serializeRfqSummary));
  } catch (err) {
    const errorId = randomUUID();
    console.error('[GET /api/admin/rfqs]', {
      errorId,
      name: (err as any)?.name,
      message: (err as any)?.message,
      stack: (err as any)?.stack,
      prismaCode: err instanceof Prisma.PrismaClientKnownRequestError ? err.code : undefined,
      prismaMeta: err instanceof Prisma.PrismaClientKnownRequestError ? err.meta : undefined,
    });
    return res.status(500).json({ errorId, message: 'Internal server error' });
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

export const updateAdminRfqTkmrContact: RequestHandler = async (req, res) => {
  const id = ensureIdParam(req.params.id);

  if (!id) {
    return res.status(400).json({ message: 'RFQ id is required' });
  }

  const payload = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  const phone = typeof payload.phone === 'string' ? payload.phone.trim() : '';

  if (!name || !email || !phone) {
    return res.status(400).json({ message: 'name, email, and phone are required' });
  }

  try {
    const updated = await prisma.rFQ.update({
      where: { id },
      data: {
        tkmrContactName: name,
        tkmrContactEmail: email,
        tkmrContactPhone: phone,
      },
      select: {
        id: true,
        publicId: true,
        tkmrContactName: true,
        tkmrContactEmail: true,
        tkmrContactPhone: true,
      },
    });

    return res.json({ rfq: updated });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ message: 'RFQ not found' });
    }
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
    const tokens = await prisma.secureLink.findMany({
      orderBy: { createdAt: 'desc' },
      include: { rfq: { select: { publicId: true } } },
    });
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

  const allowedResults: Array<SecureLinkAccessLog['result'] | 'invalid'> = [
    'success',
    'expired',
    'disabled',
    'invalid',
  ];
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
      include: { rfq: { select: { publicId: true } } },
    });

    return res.json(
      logs.map((log) => ({
        id: log.id,
        timestamp: log.createdAt.toISOString(),
        ip: log.ip ?? null,
        userAgent: log.userAgent ?? null,
        token: log.token,
        rfqId: log.rfqId,
        rfqPublicId: log.rfq?.publicId ?? null,
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