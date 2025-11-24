import { z } from 'zod';

export const RFQItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  unit: z.string().min(1, 'Unit is required'),
  quantity: z.number().int().positive('Quantity must be greater than 0'),
  unitPrice: z.number().positive('Unit price must be greater than 0').optional(),
});

export type RFQItem = z.infer<typeof RFQItemSchema>;