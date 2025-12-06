import { z } from 'zod';

const isoString = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Value must be a valid ISO date string',
});

export const RFQItemSchema = z.object({
  id: z.string().min(1, 'Item id is required'),
  name: z.string().min(1, 'Item name is required'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  details: z.string().min(1).nullable().default(null),
  createdAt: isoString.optional(),
  updatedAt: isoString.optional(),
});

export type RFQItem = z.infer<typeof RFQItemSchema>;