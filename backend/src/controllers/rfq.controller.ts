import type { RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';

type RFQItemInput = {
  name: string;
  quantity: number;
  details?: string;
};

type AttachmentInput = {
  fileName: string;
  fileUrl: string;
  fileSize?: number;
};

type CreateRFQBody = {
  company?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  items?: RFQItemInput[];
  attachments?: AttachmentInput[];
};

const rfqInclude = {
  items: true,
  attachments: true,
} as const;

type RFQWithRelations = Prisma.RFQGetPayload<{ include: typeof rfqInclude }>;

const ensureIdParam = (value: string | undefined) => value?.trim() ?? '';

const serializeRFQ = (rfq: RFQWithRelations) => ({
  id: rfq.id,
  company: rfq.company,
  contactName: rfq.contactName,
  contactEmail: rfq.contactEmail,
  contactPhone: rfq.contactPhone ?? null,
  createdAt: rfq.createdAt.toISOString(),
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
});

const parseItems = (items: RFQItemInput[] | undefined): RFQItemInput[] => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => ({
      name: item?.name?.trim(),
      quantity: Number(item?.quantity),
      details: item?.details?.trim() || undefined,
    }))
    .filter((item) => Boolean(item.name) && Number.isFinite(item.quantity) && item.quantity > 0) as RFQItemInput[];
};

const parseAttachments = (attachments: AttachmentInput[] | undefined): AttachmentInput[] => {
  if (!Array.isArray(attachments)) {
    return [];
  }

  return attachments
    .map((attachment) => ({
      fileName: attachment?.fileName?.trim(),
      fileUrl: attachment?.fileUrl?.trim(),
      fileSize:
        typeof attachment?.fileSize === 'number' && Number.isFinite(attachment.fileSize)
          ? Math.max(0, Math.round(attachment.fileSize))
          : undefined,
    }))
    .filter((attachment) => Boolean(attachment.fileName) && Boolean(attachment.fileUrl)) as AttachmentInput[];
};

const handlePrismaError = (error: unknown, res: Parameters<RequestHandler>[1]) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
    res.status(404).json({ error: 'RFQ not found' });
    return true;
  }
  return false;
};

export const createRFQ: RequestHandler = async (req, res) => {
  try {
    const { company, contactName, contactEmail, contactPhone, items, attachments } = req.body as CreateRFQBody;

    if (!company || !contactName || !contactEmail) {
      return res.status(400).json({
        error: 'company, contactName, and contactEmail are required',
      });
    }

    const itemPayload = parseItems(items);
    if (itemPayload.length === 0) {
      return res.status(400).json({ error: 'At least one RFQ item is required' });
    }

    const attachmentPayload = parseAttachments(attachments);

    const rfq = await prisma.$transaction(async (tx) => {
      const created = await tx.rFQ.create({
        data: {
          company: company.trim(),
          contactName: contactName.trim(),
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone?.trim(),
        },
      });

      if (itemPayload.length) {
        await tx.rFQItem.createMany({
          data: itemPayload.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            details: item.details,
            rfqId: created.id,
          })),
        });
      }

      if (attachmentPayload.length) {
        await tx.attachment.createMany({
          data: attachmentPayload.map((attachment) => ({
            fileName: attachment.fileName,
            fileUrl: attachment.fileUrl,
            fileSize: attachment.fileSize,
            rfqId: created.id,
          })),
        });
      }

      return tx.rFQ.findUniqueOrThrow({
        where: { id: created.id },
        include: rfqInclude,
      });
    });

    return res.status(201).json({ rfq: serializeRFQ(rfq) });
  } catch (error) {
    console.error('Failed to create RFQ', error);
    return res.status(500).json({ error: 'Failed to create RFQ' });
  }
};

export const getRFQ: RequestHandler = async (req, res) => {
  const id = ensureIdParam(req.params.id);

  if (!id) {
    return res.status(400).json({ error: 'RFQ id is required' });
  }

  try {
    const rfq = await prisma.rFQ.findUnique({
      where: { id },
      include: rfqInclude,
    });

    if (!rfq) {
      return res.status(404).json({ error: 'RFQ not found' });
    }

    return res.json({ rfq: serializeRFQ(rfq) });
  } catch (error) {
    console.error('Failed to fetch RFQ', error);
    return res.status(500).json({ error: 'Failed to fetch RFQ' });
  }
};

export const listRFQs: RequestHandler = async (_req, res) => {
  try {
    const rfqs = await prisma.rFQ.findMany({
      include: rfqInclude,
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ rfqs: rfqs.map(serializeRFQ) });
  } catch (error) {
    console.error('Failed to list RFQs', error);
    return res.status(500).json({ error: 'Failed to list RFQs' });
  }
};

export const deleteRFQ: RequestHandler = async (req, res) => {
  const id = ensureIdParam(req.params.id);

  if (!id) {
    return res.status(400).json({ error: 'RFQ id is required' });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.rFQItem.deleteMany({ where: { rfqId: id } });
      await tx.attachment.deleteMany({ where: { rfqId: id } });
      await tx.secureLink.deleteMany({ where: { rfqId: id } });
      await tx.rFQ.delete({ where: { id } });
    });
    return res.json({ message: 'RFQ deleted' });
  } catch (error) {
    if (handlePrismaError(error, res)) {
      return;
    }
    console.error('Failed to delete RFQ', error);
    return res.status(500).json({ error: 'Failed to delete RFQ' });
  }
};
