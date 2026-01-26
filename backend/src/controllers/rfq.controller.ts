import type { RequestHandler } from 'express';
import { PrismaClient, Prisma, SubmittedByType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PassThrough } from 'stream';
import prisma from '../lib/prisma.js';
import { getDrive, getDriveRootFolderId } from '../lib/googleDrive.js';
import { buildRfqFolderName, ensureFolder, storeRfqAttachmentsToDrive } from '../services/driveRfqStorage.service.js';

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
type RFQItemRecord = RFQWithRelations['items'][number];
type RFQAttachmentRecord = RFQWithRelations['attachments'][number];

const ensureIdParam = (value: string | undefined) => value?.trim() ?? '';

const serializeRFQ = (rfq: RFQWithRelations) => ({
  id: rfq.id,
  publicId: rfq.publicId ?? null,
  rfqNo: rfq.rfqNo,
  company: rfq.company,
  contactName: rfq.contactName,
  contactEmail: rfq.contactEmail,
  contactPhone: rfq.contactPhone ?? null,
  createdAt: rfq.createdAt.toISOString(),
  items: rfq.items.map((item: RFQItemRecord) => ({
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    details: item.details ?? null,
  })),
  attachments: rfq.attachments.map((attachment: RFQAttachmentRecord) => ({
    id: attachment.id,
    fileName: attachment.fileName,
    fileUrl: attachment.fileUrl,
    fileSize: attachment.fileSize ?? null,
    driveFileId: attachment.driveFileId ?? null,
  })),
});

const retryPrismaP2028 = async <T>(fn: () => Promise<T>, attempts = 3, delayMs = 300): Promise<T> => {
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2028' && i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
};

const parseItems = (items: RFQItemInput[] | undefined): RFQItemInput[] => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item: RFQItemInput | undefined) => ({
      name: item?.name?.trim(),
      quantity: item ? Number(item.quantity) : Number.NaN,
      details: item?.details?.trim() || undefined,
    }))
    .filter((item) => Boolean(item.name) && Number.isFinite(item.quantity) && item.quantity > 0) as RFQItemInput[];
};

const parseAttachments = (attachments: AttachmentInput[] | undefined): AttachmentInput[] => {
  if (!Array.isArray(attachments)) {
    return [];
  }

  return attachments
    .map((attachment: AttachmentInput | undefined) => ({
      fileName: attachment?.fileName?.trim(),
      fileUrl: attachment?.fileUrl?.trim(),
      fileSize:
        typeof attachment?.fileSize === 'number' && Number.isFinite(attachment.fileSize)
          ? Math.max(0, Math.round(attachment.fileSize))
          : undefined,
    }))
    .filter((attachment) => Boolean(attachment.fileName) && Boolean(attachment.fileUrl)) as AttachmentInput[];
};

const formatPublicId = (createdAt: Date, rfqNo: number): string => {
  const year = createdAt instanceof Date && !Number.isNaN(createdAt.getTime())
    ? createdAt.getFullYear()
    : new Date().getFullYear();
  const sequence = Number.isFinite(rfqNo) ? rfqNo : 0;
  return `RFQ-${year}-${sequence.toString().padStart(6, '0')}`;
};

const resolveSubmission = (submission: Express.Request['submission']) =>
  submission?.type === 'TOKEN'
    ? { submittedByType: SubmittedByType.TOKEN, submittedByTokenId: submission.tokenId }
    : { submittedByType: SubmittedByType.ADMIN, submittedByTokenId: null };

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

    const submissionMeta = resolveSubmission(req.submission);

    const rfqRecord = await prisma.$transaction(async (tx: PrismaClient) => {
      const created = await tx.rFQ.create({
        data: {
          company: company.trim(),
          contactName: contactName.trim(),
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone?.trim(),
          ...submissionMeta,
        },
      });

      if (submissionMeta.submittedByType === SubmittedByType.TOKEN && submissionMeta.submittedByTokenId) {
        await tx.submissionToken.update({
          where: { id: submissionMeta.submittedByTokenId },
          data: { uses: { increment: 1 } },
        });
      }

      if (itemPayload.length) {
        await tx.rFQItem.createMany({
          data: itemPayload.map((item: RFQItemInput) => ({
            name: item.name,
            quantity: item.quantity,
            details: item.details,
            rfqId: created.id,
          })),
        });
      }

      const publicId = formatPublicId(created.createdAt, created.rfqNo);
      const updated = await tx.rFQ.update({
        where: { id: created.id },
        data: { publicId },
      });

      return updated;
    });

    if (attachmentPayload.length) {
      try {
        const uploads = await storeRfqAttachmentsToDrive({
          rfqId: rfqRecord.id,
          company: rfqRecord.company,
          createdAt: rfqRecord.createdAt,
          rootFolderId: getDriveRootFolderId(),
          attachments: attachmentPayload,
          makePublic: process.env.DRIVE_PUBLIC_FILES === 'true',
          publicId: rfqRecord.publicId,
        });

        if (uploads.uploaded.length) {
          await prisma.attachment.createMany({
            data: uploads.uploaded.map((file) => ({
              fileName: file.fileName,
              fileUrl: file.fileUrl,
              fileSize: file.fileSize,
              driveFileId: file.driveFileId,
              rfqId: rfqRecord.id,
            })),
          });
        }
      } catch (driveError) {
        console.error('Drive upload failed', driveError);
        try {
          await prisma.rFQ.delete({ where: { id: rfqRecord.id } });
        } catch (cleanupError) {
          console.error('Failed to rollback RFQ after Drive failure', cleanupError);
        }
        return res.status(500).json({ error: 'Drive upload failed' });
      }
    }

    const rfq = await prisma.rFQ.findUnique({
      where: { id: rfqRecord.id },
      include: rfqInclude,
    });

    if (!rfq) {
      return res.status(500).json({ error: 'RFQ could not be loaded after creation' });
    }

    return res.status(201).json({ rfq: serializeRFQ(rfq) });
  } catch (error: unknown) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
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
  } catch (error: unknown) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const listRFQs: RequestHandler = async (_req, res) => {
  try {
    const rfqs = await prisma.rFQ.findMany({
      include: rfqInclude,
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ rfqs: rfqs.map(serializeRFQ) });
  } catch (error: unknown) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteRFQ: RequestHandler = async (req, res) => {
  const id = ensureIdParam(req.params.id);

  if (!id) {
    return res.status(400).json({ error: 'RFQ id is required' });
  }

  try {
    await prisma.$transaction(async (tx: PrismaClient) => {
      await tx.rFQItem.deleteMany({ where: { rfqId: id } });
      await tx.attachment.deleteMany({ where: { rfqId: id } });
      await tx.secureLink.deleteMany({ where: { rfqId: id } });
      await tx.rFQ.delete({ where: { id } });
    });
    return res.json({ message: 'RFQ deleted' });
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

export const createRFQMultipart: RequestHandler = async (req, res) => {
  try {
    const { company, contactName, contactEmail, contactPhone } = req.body as Record<string, unknown>;
    const rawItems = req.body?.items as string | undefined;

    let parsedItemsInput: RFQItemInput[] = [];
    if (rawItems) {
      try {
        const parsed = JSON.parse(rawItems);
        if (!Array.isArray(parsed)) {
          throw new Error('items must be an array');
        }
        parsedItemsInput = parsed as RFQItemInput[];
      } catch (_parseError) {
        return res.status(400).json({ error: 'Invalid items payload. Must be JSON array.' });
      }
    }

    if (!company || !contactName || !contactEmail) {
      return res.status(400).json({ error: 'company, contactName, and contactEmail are required' });
    }

    const itemPayload = parseItems(parsedItemsInput);
    if (itemPayload.length === 0) {
      return res.status(400).json({ error: 'At least one RFQ item is required' });
    }

    const files = (req.files as Express.Multer.File[]) || [];

    const submissionMeta = resolveSubmission(req.submission);

    const rfqRecord = await retryPrismaP2028(() =>
      prisma.$transaction(async (tx: PrismaClient) => {
        const created = await tx.rFQ.create({
          data: {
            company: String(company).trim(),
            contactName: String(contactName).trim(),
            contactEmail: String(contactEmail).trim(),
            contactPhone: typeof contactPhone === 'string' ? contactPhone.trim() : undefined,
            ...submissionMeta,
          },
        });

        if (submissionMeta.submittedByType === SubmittedByType.TOKEN && submissionMeta.submittedByTokenId) {
          await tx.submissionToken.update({
            where: { id: submissionMeta.submittedByTokenId },
            data: { uses: { increment: 1 } },
          });
        }

        const publicId = formatPublicId(created.createdAt, created.rfqNo);
        const updated = await tx.rFQ.update({
          where: { id: created.id },
          data: { publicId },
        });

        if (itemPayload.length) {
          await tx.rFQItem.createMany({
            data: itemPayload.map((item: RFQItemInput) => ({
              name: item.name,
              quantity: item.quantity,
              details: item.details,
              rfqId: created.id,
            })),
          });
        }

        return updated;
      })
    );

    let uploads: { fileName: string; fileUrl: string; fileSize?: number; driveFileId: string }[] = [];

    if (files.length) {
      const drive = getDrive();
      const rootFolderId = getDriveRootFolderId();
      const folderName = buildRfqFolderName(
        rfqRecord.company,
        rfqRecord.createdAt,
        rfqRecord.publicId
      );

      try {
        const folder = await ensureFolder(rootFolderId, folderName);

        for (const file of files) {
          const stream = new PassThrough();
          stream.end(file.buffer);

          const { data } = await drive.files.create({
            requestBody: {
              name: file.originalname,
              parents: [folder.id],
            },
            media: {
              mimeType: file.mimetype || 'application/octet-stream',
              body: stream,
            },
            fields: 'id,name,mimeType,size,webViewLink,webContentLink',
            supportsAllDrives: true,
          });

          if (!data.id) {
            throw new Error('Drive upload failed');
          }

          const viewLink =
            data.webViewLink ||
            data.webContentLink ||
            `https://drive.google.com/file/d/${data.id}/view`;

          if (process.env.DRIVE_PUBLIC_FILES === 'true') {
            try {
              await drive.permissions.create({
                fileId: data.id,
                requestBody: { role: 'reader', type: 'anyone', allowFileDiscovery: false },
                supportsAllDrives: true,
              });
            } catch (permissionError) {
              const driveErr = permissionError as {
                message?: string;
                response?: { status?: number; data?: unknown };
              };
              console.error('[Drive permission failed]', {
                fileId: data.id,
                message:
                  driveErr?.message ?? (permissionError instanceof Error ? permissionError.message : String(permissionError)),
                responseStatus: driveErr?.response?.status,
                responseData: driveErr?.response?.data,
              });
            }
          }

          const size = typeof data.size === 'string' ? Number(data.size) : file.size;

          uploads.push({
            fileName: data.name || file.originalname,
            fileUrl: viewLink,
            fileSize: Number.isFinite(size) ? size : undefined,
            driveFileId: data.id,
          });
        }
      } catch (uploadError) {
        const errorId = randomUUID();
        const driveError = uploadError as {
          message?: string;
          stack?: string;
          code?: string;
          errors?: unknown;
          response?: { status?: number; data?: unknown };
        };

        console.error(`[Drive upload failed][${errorId}]`, {
          errorId,
          message:
            driveError?.message ?? (uploadError instanceof Error ? uploadError.message : String(uploadError)),
          code: driveError?.code,
          responseStatus: driveError?.response?.status,
          responseData: driveError?.response?.data,
          errors: driveError?.errors,
          stack: driveError?.stack ?? (uploadError instanceof Error ? uploadError.stack : undefined),
        });

        return res.status(502).json({ errorId, message: 'Drive upload failed' });
      }
    }

    if (uploads.length) {
      await retryPrismaP2028(() =>
        prisma.attachment.createMany({
          data: uploads.map((upload) => ({
            fileName: upload.fileName,
            fileUrl: upload.fileUrl,
            fileSize: upload.fileSize,
            driveFileId: upload.driveFileId,
            rfqId: rfqRecord.id,
          })),
        })
      );
    }

    const rfq = await retryPrismaP2028(() =>
      prisma.rFQ.findUnique({
        where: { id: rfqRecord.id },
        include: rfqInclude,
      })
    );

    if (!rfq) {
      return res.status(500).json({ error: 'RFQ could not be loaded after creation' });
    }

    return res.status(201).json({ rfq: serializeRFQ(rfq) });
  } catch (error) {
    console.error(error);
    throw error;
  }
};
