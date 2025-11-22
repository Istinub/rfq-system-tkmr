import { z } from 'zod';

export const RFQItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unitPrice: z.number().positive('Unit price must be greater than 0').optional(),
});

export type RFQItemSchemaType = z.infer<typeof RFQItemSchema>;

export const RFQContactSchema = z.object({
  name: z.string().min(1, 'Contact name is required'),
  email: z.string().email('Contact email must be valid'),
  phone: z.string().min(3, 'Contact phone must be at least 3 characters').optional(),
});

export type RFQContactSchemaType = z.infer<typeof RFQContactSchema>;

export const RFQSchema = z.object({
  company: z.string().min(1, 'Company is required'),
  contact: RFQContactSchema,
  items: z.array(RFQItemSchema).min(1, 'At least one RFQ item is required'),
  attachments: z.array(z.string().min(1, 'Attachment path must not be empty')).optional(),
});

export type RFQSchemaType = z.infer<typeof RFQSchema>;