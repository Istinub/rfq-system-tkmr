import { z } from 'zod';
import { RFQItemSchema } from './rfqItem.schema.js';

const isoDateString = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Value must be a valid ISO date string',
});

const AttachmentSchema = z.object({
  id: z.string().min(1, 'Attachment id is required'),
  fileName: z.string().min(1, 'Attachment file name is required'),
  fileUrl: z.string().min(1, 'Attachment file URL is required'),
  fileSize: z.number().nonnegative().nullable().default(null),
  createdAt: isoDateString.optional(),
  updatedAt: isoDateString.optional(),
});

const RFQRequestItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  details: z.string().min(1).optional(),
});

const RFQRequestAttachmentSchema = z.object({
  fileName: z.string().min(1, 'Attachment file name is required'),
  fileUrl: z.string().min(1, 'Attachment file URL is required'),
  fileSize: z.number().nonnegative().optional(),
});

export const RFQSchema = z.object({
  id: z.string().min(1, 'RFQ id is required'),
  company: z.string().min(1, 'Company is required'),
  contactName: z.string().min(1, 'Contact name is required'),
  contactEmail: z.string().email('Contact email must be valid'),
  contactPhone: z.string().min(3).nullable().optional(),
  createdAt: isoDateString,
  updatedAt: isoDateString.optional(),
  items: z.array(RFQItemSchema).default([]),
  attachments: z.array(AttachmentSchema).default([]),
});

export type RFQ = z.infer<typeof RFQSchema>;

export const RFQRequestSchema = z.object({
  company: z.string().min(1, 'Company is required'),
  contactName: z.string().min(1, 'Contact name is required'),
  contactEmail: z.string().email('Contact email must be valid'),
  contactPhone: z.string().min(3).optional(),
  items: z.array(RFQRequestItemSchema).min(1, 'At least one RFQ item is required'),
  attachments: z.array(RFQRequestAttachmentSchema).optional(),
});

export type RFQRequest = z.infer<typeof RFQRequestSchema>;