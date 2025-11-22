import { z } from 'zod';
import { RFQItemSchema } from './rfqItem.schema';

export const RFQContactSchema = z.object({
  name: z.string().min(1, 'Contact name is required'),
  email: z.string().email('Contact email must be valid'),
  phone: z.string().min(3, 'Contact phone must be at least 3 characters').optional(),
});

export type RFQContactInput = z.infer<typeof RFQContactSchema>;

export const RFQSchema = z.object({
  company: z.string().min(1, 'Company is required'),
  contact: RFQContactSchema,
  items: z.array(RFQItemSchema).min(1, 'At least one RFQ item is required'),
  attachments: z.array(z.string().min(1, 'Attachment path must not be empty')).optional(),
});

export type RFQInput = z.infer<typeof RFQSchema>;