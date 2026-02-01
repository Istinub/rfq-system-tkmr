import crypto from 'node:crypto';
import type { RequestHandler, Express } from 'express';
import { PrismaClient, QuoteMethod } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { renderQuotationPdf } from '../services/quotePdf.service.js';
import { ensureQuotationsRfqFolder, uploadPdfBufferToFolder } from '../services/driveQuotationStorage.service.js';

const prismaClient: PrismaClient = prisma;

type AccessLogResult = 'success' | 'expired' | 'disabled' | 'invalid';

const sanitizeHex = (value: string) => value.replace(/[^0-9a-f]/gi, '');

const hashTokenPrefix = (token: string, prefixLength = 16): string => {
  const clean = token.trim();
  if (!clean) return '';
  const hash = crypto.createHash('sha256').update(clean).digest('hex');
  return sanitizeHex(hash).slice(0, prefixLength);
};

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

const normalizeMethod = (method: unknown): QuoteMethod | null => {
  if (typeof method !== 'string') return null;
  const upper = method.trim().toUpperCase();
  return upper === 'FORM' ? (upper as QuoteMethod) : null;
};

const toDataUrl = (file: Express.Multer.File | undefined): string | undefined => {
  if (!file?.buffer || !file.mimetype) return undefined;
  return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
};

export const submitQuotationFromSecureLink: RequestHandler = async (req, res) => {
  const token = (req.params.token ?? '').trim();
  const tokenHashPrefix = hashTokenPrefix(token);
  let result: AccessLogResult = 'invalid';
  let secureLinkId: string | undefined;
  let rfqId: string | undefined;

  if (!token) {
    await logAccessAttempt({ secureLinkId, rfqId, tokenHashPrefix, result, ip: getClientIp(req), userAgent: getUserAgent(req) });
    return res.status(400).json({ error: 'Secure token is required' });
  }

  try {
    const secureLink = await prismaClient.secureLink.findUnique({
      where: { token },
      include: {
        rfq: { include: { items: true } },
      },
    });

    if (!secureLink) {
      result = 'invalid';
      return res.status(404).json({ error: 'Invalid or expired token' });
    }

    secureLinkId = secureLink.id;
    rfqId = secureLink.rfqId;

    if (secureLink.disabled) {
      result = 'disabled';
      return res.status(410).json({ error: 'Secure link is disabled' });
    }

    if (secureLink.expiresAt <= new Date()) {
      result = 'expired';
      return res.status(410).json({ error: 'Secure link has expired' });
    }

    if (secureLink.oneTime && secureLink.firstAccessAt) {
      result = 'disabled';
      return res.status(410).json({ error: 'Secure link already used' });
    }

    const vendorName = typeof req.body?.vendorName === 'string' ? req.body.vendorName.trim() : '';
    const method = normalizeMethod(req.body?.method);
    const currency = typeof req.body?.currency === 'string' && req.body.currency.trim() ? req.body.currency.trim() : 'USD';
    const contactName = typeof req.body?.contactName === 'string' ? req.body.contactName.trim() : undefined;
    const contactEmail = typeof req.body?.contactEmail === 'string' ? req.body.contactEmail.trim() : undefined;
    const contactPhone = typeof req.body?.contactPhone === 'string' ? req.body.contactPhone.trim() : undefined;
    const notes = typeof req.body?.notes === 'string' ? req.body.notes : undefined;

    const parseLines = (raw: unknown): Array<{ rfqItemId: string; unitPrice: number }> | undefined => {
      if (!raw) return undefined;
      let candidate: unknown = raw;
      if (typeof raw === 'string') {
        try {
          candidate = JSON.parse(raw);
        } catch {
          return undefined;
        }
      }

      if (!Array.isArray(candidate)) return undefined;

      const parsed: Array<{ rfqItemId: string; unitPrice: number }> = [];
      for (const line of candidate) {
        const rfqItemId = typeof line?.rfqItemId === 'string' ? line.rfqItemId : '';
        const unitPrice = Number((line as { unitPrice?: unknown })?.unitPrice);
        if (!rfqItemId || Number.isNaN(unitPrice)) {
          return undefined;
        }
        parsed.push({ rfqItemId, unitPrice });
      }

      return parsed;
    };

    const lines = parseLines(req.body?.lines);

    const parseAdjustments = (
      raw: unknown
    ): Array<{ label: string; amount: number; type: 'CHARGE' | 'DISCOUNT' }> | null => {
      if (!raw) return null;
      let candidate: unknown = raw;
      if (typeof raw === 'string') {
        try {
          candidate = JSON.parse(raw);
        } catch {
          return null;
        }
      }

      if (!Array.isArray(candidate)) return null;

      const parsed: Array<{ label: string; amount: number; type: 'CHARGE' | 'DISCOUNT' }> = [];
      for (const entry of candidate) {
        const label = typeof entry?.label === 'string' ? entry.label.trim() : '';
        const amount = Number((entry as { amount?: unknown })?.amount);
        const typeRaw = typeof entry?.type === 'string' ? entry.type.trim().toUpperCase() : '';
        const type = typeRaw === 'CHARGE' || typeRaw === 'DISCOUNT' ? (typeRaw as 'CHARGE' | 'DISCOUNT') : null;

        if (!label || !Number.isFinite(amount) || amount <= 0 || !type) {
          continue;
        }

        parsed.push({ label, amount, type });
      }

      return parsed.length > 0 ? parsed : null;
    };

    const adjustments = parseAdjustments(req.body?.adjustments);

    if (!vendorName) {
      return res.status(400).json({ error: 'vendorName is required' });
    }

    if (!method) {
      return res.status(400).json({ error: 'method must be FORM' });
    }

    const now = new Date();
    const updatedSecureLink = await prismaClient.secureLink.update({
      where: { id: secureLink.id },
      data: {
        firstAccessAt: secureLink.firstAccessAt ?? now,
        lastAccessIP: getClientIp(req),
        accessCount: { increment: 1 },
      },
      include: { rfq: { include: { items: true } } },
    });

    const rfq = updatedSecureLink.rfq;
    const rfqPublicId = rfq.publicId ?? String(rfq.rfqNo ?? rfq.id);

    if (!lines || !lines.length) {
      return res.status(400).json({ error: 'lines are required for FORM submissions' });
    }

    const itemsById = new Map(rfq.items.map((item) => [item.id, item]));
    const pdfItems = [] as Array<{ name: string; quantity: number; unitPrice: number; lineTotal: number; details?: string | null }>;

    for (const line of lines) {
      const rfqItemId = typeof line?.rfqItemId === 'string' ? line.rfqItemId : '';
      const unitPrice = typeof line?.unitPrice === 'number' ? line.unitPrice : NaN;

      if (!rfqItemId || Number.isNaN(unitPrice)) {
        return res.status(400).json({ error: 'Each line requires rfqItemId and unitPrice' });
      }

      const rfqItem = itemsById.get(rfqItemId);
      if (!rfqItem) {
        return res.status(400).json({ error: `rfqItemId ${rfqItemId} does not belong to this RFQ` });
      }

      const lineTotal = rfqItem.quantity * unitPrice;
      pdfItems.push({
        name: rfqItem.name,
        quantity: rfqItem.quantity,
        unitPrice,
        lineTotal,
        details: rfqItem.details ?? undefined,
      });
    }

    const pdfBuffer = await renderQuotationPdf({
      rfqPublicId,
      requestingCompanyName: rfq.company,
      vendorName,
      vendorContact: { name: contactName, email: contactEmail, phone: contactPhone },
      currency,
      items: pdfItems,
      notes,
      logoDataUrl: toDataUrl(req.file as Express.Multer.File | undefined),
      status: 'RECEIVED',
    });

    const folder = await ensureQuotationsRfqFolder({
      rfqPublicId,
      vendorName,
    });

    const fileName = `Quotation_${rfqPublicId}.pdf`;
    const makePublic = process.env.DRIVE_PUBLIC_FILES === 'true';
    const uploadResult = await uploadPdfBufferToFolder({
      folderId: folder.id,
      fileName,
      pdfBuffer,
      makePublic,
    });

    const quotation = await prismaClient.quotation.create({
      data: {
        rfqId: updatedSecureLink.rfqId,
        vendorName,
        contactName: contactName || undefined,
        contactEmail: contactEmail || undefined,
        contactPhone: contactPhone || undefined,
        currency,
        notes: notes || undefined,
        adjustments: adjustments ?? null,
        quotationLink: uploadResult.webViewLink,
        driveFileId: uploadResult.driveFileId,
        driveFolderId: folder.id,
        method,
        status: 'RECEIVED',
        lines: {
          create: pdfItems.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
            details: item.details ?? undefined,
          })),
        },
      },
    });

    result = 'success';
    return res.status(201).json({ quotation });
  } catch (error) {
    console.error(error);
    result = result === 'success' ? result : 'invalid';
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
      // ignore logging failures
    }
  }
};
